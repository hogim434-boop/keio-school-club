"use server";

/**
 * app/admin/claims/actions.ts
 *
 * 관리자 claim 승인 큐 (/admin/claims)에서 사용하는 Server Actions.
 *
 * ── approveClaimAction ───────────────────────────────────────────────────────
 * approve_circle_claim RPC 호출:
 * - circles.owner_id = requester_id, circles.is_claimed = true
 * - circle_claims.status = 'approved', reviewed_at, reviewed_by 기록
 *
 * ── rejectClaimAction ────────────────────────────────────────────────────────
 * reject_circle_claim RPC 호출:
 * - circle_claims.status = 'rejected', reviewed_at, reviewed_by 기록
 *
 * ── 보안 (3중 방어) ───────────────────────────────────────────────────────────
 * 1) proxy.ts isPublicPath — /admin/* 인증 필수 (미로그인 차단)
 * 2) app/admin/layout.tsx AdminGuard — is_admin() RPC 로 role 검증
 * 3) RPC 내부 admin 검증 — approve_circle_claim / reject_circle_claim 이 SECURITY DEFINER + profiles.role='admin' 강제
 */

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

/** Server Action 공통 반환 타입 */
type ActionResult = { ok: boolean; error?: string };

/**
 * claim 신청을 승인한다.
 * approve_circle_claim RPC (SECURITY DEFINER) 호출.
 *
 * @param claimId 대상 circle_claims UUID
 */
export async function approveClaimAction(claimId: string): Promise<ActionResult> {
  // ── 1. Supabase 클라이언트 생성 ──────────────────────────────────────────
  const supabase = await createClient();

  // ── 2. 인증 확인 (AdminGuard가 담당하지만 Defense in Depth) ──────────────
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) {
    return { ok: false, error: "unauthenticated" };
  }

  // ── 3. approve_circle_claim RPC 호출 ─────────────────────────────────────
  // RPC 내부에서 admin 검증 + circles 갱신 + claims 갱신을 원자적으로 처리
  const { error } = await supabase.rpc("approve_circle_claim", {
    p_claim_id: claimId,
  });

  if (error) {
    console.error("[approveClaimAction] RPC error:", error.message);
    if (error.message.includes("permission_denied")) {
      return { ok: false, error: "管理者権限が必要です" };
    }
    if (error.message.includes("already_processed")) {
      return { ok: false, error: "この申請はすでに処理済みです" };
    }
    if (error.message.includes("already_claimed")) {
      return { ok: false, error: "このサークル・部活動はすでに別の方が管理しています" };
    }
    return { ok: false, error: "承認に失敗しました。もう一度お試しください。" };
  }

  // ── 4. 캐시 재검증 ────────────────────────────────────────────────────────
  revalidatePath("/admin/claims");
  // circles.is_claimed が変わったため circles キャッシュも無効化
  revalidatePath("/circles");

  return { ok: true };
}

/**
 * claim 신청을 거부한다.
 * reject_circle_claim RPC (SECURITY DEFINER) 호출.
 *
 * @param claimId 대상 circle_claims UUID
 */
export async function rejectClaimAction(claimId: string): Promise<ActionResult> {
  // ── 1. Supabase 클라이언트 생성 ──────────────────────────────────────────
  const supabase = await createClient();

  // ── 2. 인증 확인 ─────────────────────────────────────────────────────────
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) {
    return { ok: false, error: "unauthenticated" };
  }

  // ── 3. reject_circle_claim RPC 호출 ──────────────────────────────────────
  const { error } = await supabase.rpc("reject_circle_claim", {
    p_claim_id: claimId,
  });

  if (error) {
    console.error("[rejectClaimAction] RPC error:", error.message);
    if (error.message.includes("permission_denied")) {
      return { ok: false, error: "管理者権限が必要です" };
    }
    if (error.message.includes("already_processed")) {
      return { ok: false, error: "この申請はすでに処理済みです" };
    }
    return { ok: false, error: "却下に失敗しました。もう一度お試しください。" };
  }

  // ── 4. 캐시 재검증 ────────────────────────────────────────────────────────
  revalidatePath("/admin/claims");

  return { ok: true };
}
