"use server";

/**
 * app/circles/[id]/actions.ts
 *
 * 서클 상세 페이지에서 사용하는 Server Actions.
 *
 * - toggleFavorite: 즐겨찾기 추가/제거 (favorites 테이블 upsert/delete)
 * - incrementInquiryCount: 문의 카운트 증가 (circles.inquiry_count RPC)
 *
 * 비로그인 가드: getClaims()로 인증 확인 후 null이면 에러 반환.
 * 호출측(Client Component)은 isAuthenticated===false 시 router.push('/auth/login?next=...') 처리.
 */

import { createClient } from "@/lib/supabase/server";

/**
 * 즐겨찾기 토글 Server Action.
 * - 이미 즐겨찾기된 경우: DELETE (취소)
 * - 아직 즐겨찾기되지 않은 경우: INSERT
 *
 * @param circleId 대상 서클 UUID
 * @returns { isFavorited: boolean } 토글 후 최종 즐겨찾기 상태
 */
export async function toggleFavorite(
  circleId: string
): Promise<{ isFavorited: boolean; error?: string }> {
  const supabase = await createClient();

  // 인증 확인 — 비로그인 시 에러 반환
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) {
    return { isFavorited: false, error: "unauthenticated" };
  }
  const userId = claimsData.claims.sub as string;

  // 현재 즐겨찾기 상태 조회
  const { data: existing } = await supabase
    .from("favorites")
    .select("user_id")
    .match({ user_id: userId, circle_id: circleId })
    .maybeSingle();

  if (existing) {
    // 이미 즐겨찾기 → 제거
    const { error } = await supabase
      .from("favorites")
      .delete()
      .match({ user_id: userId, circle_id: circleId });

    if (error) {
      console.error("[toggleFavorite] delete error:", error.message);
      return { isFavorited: true, error: error.message };
    }
    return { isFavorited: false };
  } else {
    // 미즐겨찾기 → 추가
    const { error } = await supabase
      .from("favorites")
      .insert({ user_id: userId, circle_id: circleId });

    if (error) {
      console.error("[toggleFavorite] insert error:", error.message);
      return { isFavorited: false, error: error.message };
    }
    return { isFavorited: true };
  }
}

/**
 * 문의 카운트 증가 Server Action.
 * 채널 링크(Instagram/X/LINE) 클릭 시 호출 — fire-and-forget 허용.
 *
 * @param circleId 대상 서클 UUID
 */
export async function incrementInquiryCount(circleId: string): Promise<void> {
  const supabase = await createClient();

  // 인증 확인 — 비로그인 시 조용히 종료 (카운트 어뷰징 방지 목적)
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) return;

  const { error } = await supabase.rpc("increment_inquiry_count", {
    p_circle_id: circleId,
  });

  if (error) {
    console.warn("[incrementInquiryCount]", error.message);
  }
}
