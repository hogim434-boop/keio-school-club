"use server";

/**
 * app/mypage/actions.ts
 *
 * 마이페이지(운영 대시보드)에서 사용하는 Server Actions.
 *
 * - updateRecruitmentStatus: 운영 동아리의 모집 상태(新歓シーズン↔通年募集) 변경
 *
 * 보안: RLS circles_update_owner_or_admin 정책이 owner_id=auth.uid() 인 행만
 * UPDATE 를 허용하므로, 본인 동아리가 아니면 DB 레벨에서 막힌다. (이중 방어로 인증도 확인)
 */

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { RecruitmentStatus } from "@/lib/constants/recruitment-status";

/**
 * 모집 상태 변경 Server Action.
 * 마이페이지 운영 카드의 RecruitmentToggle 에서 호출.
 *
 * @param circleId 대상 동아리 UUID
 * @param status   변경할 모집 상태 (newcomer_only | year_round)
 * @returns { ok: boolean } 성공 여부 (실패 시 error 메시지)
 */
export async function updateRecruitmentStatus(
  circleId: string,
  status: RecruitmentStatus
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();

  // 인증 확인 — 비로그인 시 차단 (RLS 가 막지만 명시적 가드)
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) {
    return { ok: false, error: "unauthenticated" };
  }

  // recruitment_status 업데이트 — RLS 가 owner 행만 허용하므로 id 매칭만으로 안전
  const { error } = await supabase
    .from("circles")
    .update({ recruitment_status: status })
    .eq("id", circleId);

  if (error) {
    console.error("[updateRecruitmentStatus]", error.message);
    return { ok: false, error: error.message };
  }

  // 마이페이지 재검증 — 서버 데이터(getMyCircles)를 최신 상태로
  revalidatePath("/mypage");
  return { ok: true };
}
