/**
 * 활동 시간대 3종 — circles.activity_time_band 컬럼의 enum 값
 *
 * 정책:
 * - 한 단체에 복수의 시간대를 가질 수 있음 (배열로 저장)
 * - 필터 선택 시 OR 매칭 (배열 중 하나라도 일치하면 표시)
 */
export const ACTIVITY_TIME_BANDS = ["weekday_day", "weekday_night", "weekend"] as const;

export type ActivityTimeBand = (typeof ACTIVITY_TIME_BANDS)[number];

export const ACTIVITY_TIME_BAND_LABELS: Record<ActivityTimeBand, string> = {
  weekday_day: "平日昼",
  weekday_night: "平日夜",
  weekend: "週末",
};
