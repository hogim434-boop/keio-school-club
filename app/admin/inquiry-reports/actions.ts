"use server";

/**
 * app/admin/inquiry-reports/actions.ts
 *
 * 관리자 신고 검토 페이지(/admin/inquiry-reports)에서 사용하는 Server Action.
 *
 * ── resolveReport: 신고 해결 처리 ───────────────────────────────────────────
 * inquiry_reports.admin_resolved_at 을 now() 로 UPDATE.
 *
 * ── 보안 (3중 방어) ──────────────────────────────────────────────────────────
 * 1) proxy.ts isPublicPath — /admin/* 인증 필수 (미로그인 차단)
 * 2) app/admin/layout.tsx AdminGuard — is_admin() RPC 로 role='admin' 검증
 * 3) 본 Server Action 에서 getClaims() + is_admin() RPC 재검증 (Defense in Depth)
 *    RLS inquiry_reports_update_admin(is_admin() 강제) 가 4차 방어.
 *
 * ── 캐시 재검증 ──────────────────────────────────────────────────────────────
 * 성공 시 revalidatePath('/admin/inquiry-reports') 호출 → 목록 즉시 갱신.
 */

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

/** Server Action 공통 반환 타입 */
type ActionResult = { ok: boolean; error?: string };

/**
 * resolveReport — 신고를 「해결됨」 으로 처리한다.
 *
 * admin_resolved_at 에 현재 시각을 기록.
 * 거부(dismiss)와 해결(resolve)을 별도 컬럼으로 구분하지 않는다(Phase 1).
 * null → now() 로 변경하면 관리자 목록에서 「解決済み」로 표시됨.
 *
 * @param reportId - 처리할 inquiry_reports UUID
 * @returns { ok: true } / { ok: false, error: string }
 */
export async function resolveReport(reportId: string): Promise<ActionResult> {
  // ── 1. Supabase 클라이언트 생성 (Fluid compute 대응: 매번 새로 생성) ────
  const supabase = await createClient();

  // ── 2. Defense in Depth (3회차): 인증 재확인 ──────────────────────────────
  // AdminGuard/RLS 가 막아주지만, Server Action 직접 호출을 대비해 명시 검증.
  const { data: claimsData } = await supabase.auth.getClaims();
  const uid = claimsData?.claims?.sub;
  if (!uid) {
    return { ok: false, error: "unauthenticated" };
  }

  // ── 3. Defense in Depth: is_admin() RPC 재검증 ────────────────────────────
  // is_admin(uid) — 기본값 auth.uid() 를 명시적으로 전달해 JWT 위조 방어 강화.
  const { data: isAdmin, error: adminCheckError } = await supabase.rpc("is_admin", {
    uid,
  });

  if (adminCheckError) {
    console.error("[resolveReport] is_admin RPC error:", adminCheckError.message);
    return { ok: false, error: "権限の確認に失敗しました。もう一度お試しください。" };
  }

  if (!isAdmin) {
    // 관리자 페이지 존재 노출 방지 — 비관리자에게는 동일한 에러
    return { ok: false, error: "この操作を行う権限がありません" };
  }

  // ── 4. inquiry_reports UPDATE (admin_resolved_at = now()) ─────────────────
  // RLS inquiry_reports_update_admin: is_admin() 강제 → DB 레벨에서 2차 방어
  const { error: updateError } = await supabase
    .from("inquiry_reports")
    .update({ admin_resolved_at: new Date().toISOString() })
    .eq("id", reportId)
    .is("admin_resolved_at", null); // 이미 해결된 신고는 업데이트하지 않음 (멱등)

  if (updateError) {
    console.error("[resolveReport] inquiry_reports update error:", updateError.message);
    return { ok: false, error: "処理に失敗しました。もう一度お試しください。" };
  }

  // ── 5. 관리자 신고 목록 캐시 재검증 ──────────────────────────────────────
  revalidatePath("/admin/inquiry-reports");

  return { ok: true };
}
