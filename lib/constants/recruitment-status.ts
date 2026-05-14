/**
 * 모집 상태 3종 — circles.recruitment_status 컬럼의 enum 값
 *
 * 정책:
 * - 「open」 = 현재 신입부원 모집 중
 * - 「newcomer_only」 = 新歓(신입생 환영) 기간 한정 모집
 * - 「year_round」 = 시기 관계없이 통년 모집
 */
export const RECRUITMENT_STATUSES = ["open", "newcomer_only", "year_round"] as const;

export type RecruitmentStatus = (typeof RECRUITMENT_STATUSES)[number];

export const RECRUITMENT_STATUS_LABELS: Record<RecruitmentStatus, string> = {
  open: "現在募集中",
  newcomer_only: "新歓限定",
  year_round: "通年募集",
};
