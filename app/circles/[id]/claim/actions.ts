"use server";

/**
 * app/circles/[id]/claim/actions.ts
 *
 * 동아리 권한 이양(claim) 신청 Server Action.
 *
 * ── submitClaimRequest ────────────────────────────────────────────────────────
 * 미claim 동아리에 대해 현재 로그인 사용자가 소유권 인수 신청을 제출한다.
 * circle_claims(status='pending') INSERT.
 *
 * ── 보안 ─────────────────────────────────────────────────────────────────────
 * 1) RLS circle_claims_insert_authenticated — requester_id=auth.uid() 강제 + is_claimed=false 체크
 * 2) 본 Action 에서 getClaims() 로 인증 재확인 (Defense in Depth)
 * 3) contact_note 최소 길이 서버 측 검증 (클라이언트 조작 방어)
 *
 * ── 중복 신청 방지 ─────────────────────────────────────────────────────────
 * DB 에 (circle_id, requester_id) WHERE status='pending' 부분 유니크 인덱스가 있어
 * 동일 동아리에 pending 신청이 2건 이상 INSERT 시 Postgres 에러 발생.
 * Action 에서도 사전 체크로 사용자 친화적 메시지를 반환한다.
 */

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

/** Server Action 공통 반환 타입 */
type ActionResult = { ok: boolean; error?: string };

/** contact_note 최소/최대 길이 */
const MIN_NOTE = 10;
const MAX_NOTE = 1000;

/**
 * 동아리 claim 신청을 제출한다.
 *
 * @param circleId   대상 동아리 UUID
 * @param contactNote 신청자 본인 증명 정보 (공식 SNS URL, 연락처 등)
 */
export async function submitClaimRequest(
  circleId: string,
  contactNote: string
): Promise<ActionResult> {
  // ── 1. 입력 검증 ──────────────────────────────────────────────────────────
  const trimmedNote = contactNote?.trim() ?? "";
  if (trimmedNote.length < MIN_NOTE) {
    return { ok: false, error: `${MIN_NOTE}文字以上入力してください` };
  }
  if (trimmedNote.length > MAX_NOTE) {
    return { ok: false, error: `${MAX_NOTE}文字以内で入力してください` };
  }

  // ── 2. Supabase 클라이언트 생성 (Fluid compute 대응: 매번 새로 생성) ──────
  const supabase = await createClient();

  // ── 3. 인증 확인 (Defense in Depth: RLS 가 막지만 명시 검증 + UID 확보) ──
  const { data: claimsData } = await supabase.auth.getClaims();
  const uid = claimsData?.claims?.sub;
  if (!uid) {
    return { ok: false, error: "ログインが必要です" };
  }

  // ── 4. 이미 pending 신청이 있는지 사전 체크 (사용자 친화 에러 메시지 위해) ──
  const { data: existing } = await supabase
    .from("circle_claims")
    .select("id, status")
    .eq("circle_id", circleId)
    .eq("requester_id", uid)
    .eq("status", "pending")
    .maybeSingle();

  if (existing) {
    return { ok: false, error: "すでに申請済みです。審査結果をお待ちください。" };
  }

  // ── 5. INSERT — RLS が requester_id=auth.uid() + is_claimed=false を強制 ──
  const { error: insertError } = await supabase.from("circle_claims").insert({
    circle_id: circleId,
    requester_id: uid,
    contact_note: trimmedNote,
    status: "pending",
  });

  if (insertError) {
    console.error("[submitClaimRequest] insert error:", insertError.message);
    // Unique 制約違反 = pending が既にある (事前チェック後の競合)
    if (insertError.code === "23505") {
      return { ok: false, error: "すでに申請済みです。審査結果をお待ちください。" };
    }
    // RLS 拒否 = is_claimed=true (すでに別ユーザーが claim 済み)
    if (insertError.code === "42501") {
      return {
        ok: false,
        error: "このサークル・部活動はすでに管理者が確定しています。",
      };
    }
    return { ok: false, error: "申請に失敗しました。もう一度お試しください。" };
  }

  // ── 6. 재검증 — 신청 후 이 페이지를 새로 고치면 「申請中」 상태가 보이도록 ──
  revalidatePath(`/circles/${circleId}/claim`);

  return { ok: true };
}
