/**
 * 모집 상태 3종 — circles.recruitment_status 컬럼의 enum 값
 *
 * 3분류 (2026-05 개편):
 * - 「year_round」    = 通年募集.  시기 무관 언제든 가입 OK.
 * - 「newcomer_only」 = 新歓シーズン. 4월 신입생 환영 시즌에 집중 모집(기간 한정).
 * - 「not_recruiting」= 募集していない. 현재 모집하지 않음.
 *
 * 표시·마이페이지 토글에는 3종 전부 사용하고,
 * 검색 필터·홈 「現在募集中」 섹션에는 "지금 가입 가능"한 2종(year_round, newcomer_only)만 쓴다.
 */
export const RECRUITMENT_STATUSES = ["newcomer_only", "year_round", "not_recruiting"] as const;

export type RecruitmentStatus = (typeof RECRUITMENT_STATUSES)[number];

export const RECRUITMENT_STATUS_LABELS: Record<RecruitmentStatus, string> = {
  newcomer_only: "新歓シーズン",
  year_round: "募集中",
  not_recruiting: "募集なし",
};

/**
 * 검색 필터·「現在募集中」 후보로 쓰는 "모집 중" 상태 목록.
 * not_recruiting(募集していない)은 제외 — 필터 옵션/모집중 섹션에 노출하지 않는다.
 */
export const RECRUITMENT_FILTER_STATUSES = ["newcomer_only", "year_round"] as const;

/**
 * 「現在募集中」(지금 가입 가능) 으로 간주할 모집 상태 목록을 현재 시기 기준으로 반환.
 *
 * - year_round(通年募集): 언제든 모집 → 항상 포함.
 * - newcomer_only(新歓シーズン): 4월 신환 시기에만 모집 → 新歓 시즌(3~4월)에만 포함.
 *   예) 5월이면 新歓 종료 → ["year_round"] 만 반환.
 * - not_recruiting(募集していない): 항상 제외.
 *
 * 홈 「現在募集中のサークル」 섹션 쿼리(getRecruitingCircles)와 「もっと見る」 링크가
 * 동일한 결과를 보이도록 이 헬퍼를 공유한다.
 */
export function getCurrentRecruitingStatuses(now: Date = new Date()): RecruitmentStatus[] {
  const month = now.getMonth() + 1; // 1~12
  const isShinkanSeason = month === 3 || month === 4;
  return isShinkanSeason ? ["newcomer_only", "year_round"] : ["year_round"];
}
