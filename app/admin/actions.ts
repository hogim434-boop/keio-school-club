"use server";

/**
 * app/admin/actions.ts
 *
 * 관리자 승인 큐(/admin/circles)에서 사용하는 Server Actions.
 *
 * - approveCircle: pending 동아리를 승인(status='approved') + 검수 메타 기록
 * - rejectCircle:  pending 동아리를 거절(status='rejected') + 거절 사유 필수 + 검수 메타 기록
 *
 * 보안 (3중 방어):
 * 1) proxy.ts isPublicPath — /admin/* 인증 필수 (미로그인 차단)
 * 2) app/admin/layout.tsx AdminGuard — is_admin() RPC 로 role 검증 (일반 로그인 차단)
 * 3) RLS circles_update_owner_or_admin — owner 또는 is_admin() 인 행만 UPDATE 허용
 *    → 비관리자가 직접 호출해도 DB 레벨에서 차단된다.
 *
 * 검수 메타(reviewed_by/reviewed_at)는 클라이언트 입력을 신뢰하지 않고
 * 서버에서 getClaims().claims.sub(현재 로그인 UID)를 직접 주입한다.
 * (해당 컬럼 UPDATE 권한은 마이그레이션 grant_circles_review_columns_update 에서 부여)
 */

import { revalidatePath, revalidateTag } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/resend";
import { circleApprovedEmail, circleRejectedEmail } from "@/lib/email/templates";

/**
 * owner 에게 결과 메일 발송 (best-effort).
 * profiles.email(RLS: admin 조회 가능)을 조회해 Resend 로 전송.
 * RESEND_API_KEY 미설정이면 sendEmail 이 no-op. 모든 실패는 흡수(승인/거절 결과에 영향 없음).
 */
async function notifyOwnerByEmail(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  ownerId: string | null,
  mail: { subject: string; html: string }
): Promise<void> {
  if (!ownerId) return;
  try {
    const { data: prof } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", ownerId)
      .maybeSingle();
    if (prof?.email) {
      await sendEmail({ to: prof.email as string, subject: mail.subject, html: mail.html });
    }
  } catch (e) {
    console.error("[notifyOwnerByEmail]", e);
  }
}

/** 거절 사유 최대 길이 */
const MAX_REJECTION_REASON = 500;

/** Server Action 공통 반환 타입 (mypage actions 와 동일 시그니처) */
type ActionResult = { ok: boolean; error?: string };

/**
 * pending 동아리 승인.
 * @param circleId 대상 동아리 UUID
 */
export async function approveCircle(circleId: string): Promise<ActionResult> {
  const supabase = await createClient();

  // 인증 확인 — 비로그인 차단 (AdminGuard/RLS 가 막지만 명시적 가드 + reviewed_by 주입용 UID 확보)
  const { data: claimsData } = await supabase.auth.getClaims();
  const uid = claimsData?.claims?.sub;
  if (!uid) {
    return { ok: false, error: "unauthenticated" };
  }

  // status 갱신 + 검수 메타 기록 — RLS is_admin() 가 비관리자를 차단(이중 방어)
  // owner_id·name 을 함께 받아 알림 발행에 사용
  const { data: updated, error } = await supabase
    .from("circles")
    .update({
      status: "approved",
      reviewed_by: uid,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", circleId)
    .select("owner_id, name")
    .single();

  if (error || !updated) {
    console.error("[approveCircle]", error?.message);
    return { ok: false, error: error?.message ?? "承認に失敗しました" };
  }

  // 알림 발행 (best-effort — 실패해도 승인 자체는 성공 반환)
  // 1) 개인 알림: owner 에게 「承認されました」
  if (updated.owner_id) {
    const { error: notifyError } = await supabase.from("notifications").insert({
      user_id: updated.owner_id,
      type: "circle_approved",
      circle_id: circleId,
      circle_name: updated.name,
    });
    if (notifyError) console.error("[approveCircle] notification insert", notifyError.message);
  }
  // 2) 전체 공개 알림: 「新しいサークルが追加されました」 (admin RLS 로 발행 허용)
  const { error: announceError } = await supabase.from("announcements").insert({
    type: "new_circle",
    title: updated.name,
    circle_id: circleId,
    published_by: uid,
  });
  if (announceError) console.error("[approveCircle] announcement insert", announceError.message);

  // 3) 오너에게 승인 이메일 (best-effort — 키 없으면 no-op, 실패해도 승인은 성공)
  await notifyOwnerByEmail(supabase, updated.owner_id, circleApprovedEmail(updated.name));

  // 승인 큐 재검증 + 공개 목록 캐시 무효화(승인된 동아리가 홈/목록에 즉시 노출)
  revalidatePath("/admin/circles");
  revalidateTag("circles", { expire: 0 });
  // 검색 페이지(/search)·홈 큐레이션은 별도 태그라 함께 무효화해야 즉시 반영됨
  revalidateTag("circles:public", { expire: 0 });
  return { ok: true };
}

/**
 * pending 동아리 거절.
 * @param circleId 대상 동아리 UUID
 * @param reason   거절 사유 (필수, 최대 500자) — rejected 상태에서 대표자에게 노출
 */
export async function rejectCircle(circleId: string, reason: string): Promise<ActionResult> {
  // 거절 사유 필수 검증 (클라이언트와 이중 — 서버에서 최종 차단)
  const trimmed = reason?.trim() ?? "";
  if (!trimmed) {
    return { ok: false, error: "却下理由は必須です" };
  }
  if (trimmed.length > MAX_REJECTION_REASON) {
    return { ok: false, error: `却下理由は${MAX_REJECTION_REASON}文字以内で入力してください` };
  }

  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();
  const uid = claimsData?.claims?.sub;
  if (!uid) {
    return { ok: false, error: "unauthenticated" };
  }

  const { data: updated, error } = await supabase
    .from("circles")
    .update({
      status: "rejected",
      rejection_reason: trimmed,
      reviewed_by: uid,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", circleId)
    .select("owner_id, name")
    .single();

  if (error || !updated) {
    console.error("[rejectCircle]", error?.message);
    return { ok: false, error: error?.message ?? "却下に失敗しました" };
  }

  // 개인 알림 발행 (best-effort): owner 에게 「却下されました」 + 사유(body)
  if (updated.owner_id) {
    const { error: notifyError } = await supabase.from("notifications").insert({
      user_id: updated.owner_id,
      type: "circle_rejected",
      circle_id: circleId,
      circle_name: updated.name,
      body: trimmed,
    });
    if (notifyError) console.error("[rejectCircle] notification insert", notifyError.message);
  }

  // 오너에게 거절 이메일 + 사유 (best-effort — 키 없으면 no-op, 실패해도 거절은 성공)
  await notifyOwnerByEmail(supabase, updated.owner_id, circleRejectedEmail(updated.name, trimmed));

  // 승인 큐만 재검증 — 거절은 공개 목록(approved)에 영향 없으므로 circles 태그 무효화 불필요
  revalidatePath("/admin/circles");
  return { ok: true };
}
