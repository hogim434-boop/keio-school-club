/**
 * 활동 빈도 3종 — circles.activity_frequency 컬럼의 enum 값
 * 카드·상세 페이지에 표시
 *
 * 주의: TagKind 의 'frequency' 와는 namespace 다름
 * (TagKind.frequency = 태그 분류 그룹 헤더 / ActivityFrequency = 컬럼 값)
 */
// 빈번 → 드뭄 순서로 노출 (毎日 → 月数回). daily·weekly_3_4 는 2026-05 추가.
export const ACTIVITY_FREQUENCIES = [
  "daily",
  "weekly_3_4",
  "weekly_2_3",
  "weekly_1",
  "monthly",
] as const;

export type ActivityFrequency = (typeof ACTIVITY_FREQUENCIES)[number];

export const ACTIVITY_FREQUENCY_LABELS: Record<ActivityFrequency, string> = {
  daily: "毎日",
  weekly_3_4: "週3-4回",
  weekly_2_3: "週2-3回",
  weekly_1: "週1回",
  monthly: "月数回",
};

/** 필터·정렬 UI 의 노출 순서 (빈번 → 드뭄) */
export const ACTIVITY_FREQUENCY_ORDER: readonly ActivityFrequency[] = ACTIVITY_FREQUENCIES;
