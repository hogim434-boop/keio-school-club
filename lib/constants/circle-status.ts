/**
 * 단체 등록 심사 상태 3종 — circles.status 컬럼의 enum 값
 * 「내 서클 관리」 페이지의 뱃지 라벨 + 관리자 승인 큐의 색상 분기
 *
 * 정책:
 * - 일반 사용자(공개 페이지)에는 'approved' 행만 fetch 됨 (RLS)
 * - owner / admin 만 'pending' / 'rejected' 행을 조회 가능
 */
export const CIRCLE_STATUSES = ["pending", "approved", "rejected"] as const;

export type CircleStatus = (typeof CIRCLE_STATUSES)[number];

export const CIRCLE_STATUS_LABELS: Record<CircleStatus, string> = {
  pending: "審査中",
  approved: "公開中",
  rejected: "却下",
};

/** 마이페이지 등에서 노출 순서 (대기 중인 것 우선) */
export const CIRCLE_STATUS_ORDER: readonly CircleStatus[] = CIRCLE_STATUSES;
