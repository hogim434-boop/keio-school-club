/**
 * 모집 상태 2종 — circles.recruitment_status 컬럼의 enum 값
 *
 * 「지금 가입 가능」 중심 2분류 (2026-05 개편). 기존 open(現在募集中)은 제거하고
 * 데이터는 year_round 로 이관했다 (성격이 다른 '실시간 상태'와 '모집 정책'이 섞이는 혼란 제거).
 *
 * 정책:
 * - 「newcomer_only」 = 新歓シーズン. 4월 신입생 환영 시즌에 집중 모집 (기간 한정, 서두를 것).
 * - 「year_round」 = 通年募集. 시기 관계없이 언제든 가입 OK.
 *
 * 둘 다 「지금 가입 가능」 한 상태이며, 홈 「現在募集中のサークル」 섹션은 두 상태를 모두 노출한다.
 */
export const RECRUITMENT_STATUSES = ["newcomer_only", "year_round"] as const;

export type RecruitmentStatus = (typeof RECRUITMENT_STATUSES)[number];

export const RECRUITMENT_STATUS_LABELS: Record<RecruitmentStatus, string> = {
  newcomer_only: "新歓シーズン",
  year_round: "通年募集",
};

/**
 * 「現在募集中」(지금 가입 가능) 으로 간주할 모집 상태 목록을 현재 시기 기준으로 반환.
 *
 * - year_round(通年募集): 언제든 모집 → 항상 포함.
 * - newcomer_only(新歓シーズン): 4월 신환 시기에만 모집 → 新歓 시즌(3~4월)에만 포함.
 *   예) 5월이면 新歓 종료 → ["year_round"] 만 반환.
 *
 * 홈 「現在募集中のサークル」 섹션 쿼리(getRecruitingCircles)와 「もっと見る」 링크가
 * 동일한 결과를 보이도록 이 헬퍼를 공유한다.
 */
export function getCurrentRecruitingStatuses(now: Date = new Date()): RecruitmentStatus[] {
  const month = now.getMonth() + 1; // 1~12
  const isShinkanSeason = month === 3 || month === 4;
  return isShinkanSeason ? ["newcomer_only", "year_round"] : ["year_round"];
}
