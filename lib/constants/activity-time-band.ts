/**
 * 활동 시간대 — circles.activity_time_band 컬럼(enum[])의 값
 *
 * 2026-05 개편: 「平日昼/平日夜/週末」(요일×시간 혼합 축) →
 *   시간대 축(朝/昼/夜) + 不定期 로 재정의.
 *
 * 정책:
 * - 한 단체에 복수의 시간대를 가질 수 있음 (배열로 저장)
 * - 필터 선택 시 OR 매칭 (배열 중 하나라도 일치하면 표시)
 * - 등록·필터에 노출하는 값은 신규 4종(ACTIVITY_TIME_BANDS)만.
 *   기존 데이터의 레거시 값(weekday_day/weekday_night/weekend)은 DB enum 에 잔존하지만
 *   선택지에선 빠지고, 표시 호환을 위해 라벨 맵에만 남겨 둔다.
 */

/** 등록·필터에 노출하는 활동 시간대 (신규 4종) */
export const ACTIVITY_TIME_BANDS = ["morning", "noon", "evening", "irregular"] as const;

/**
 * 컬럼(enum)이 실제로 가질 수 있는 값 — 신규 4종 + 레거시 3종.
 * 선택 가능한 옵션은 ACTIVITY_TIME_BANDS(신규 4종)뿐이지만, DB·구 데이터에는
 * 레거시 값이 남아 있을 수 있으므로 타입에는 포함시킨다(표시·역호환).
 */
export type ActivityTimeBand =
  | (typeof ACTIVITY_TIME_BANDS)[number]
  | "weekday_day"
  | "weekday_night"
  | "weekend";

/**
 * 시간대 라벨 — 신규 4종 + 레거시 3종(표시 호환).
 * Record<string, string> 로 두어 레거시 값 조회 시에도 라벨이 나오도록 한다.
 */
export const ACTIVITY_TIME_BAND_LABELS: Record<string, string> = {
  // 신규
  morning: "朝",
  noon: "昼",
  evening: "夜",
  irregular: "不定期",
  // 레거시(구 데이터 표시용 — 선택지에는 미노출)
  weekday_day: "平日昼",
  weekday_night: "平日夜",
  weekend: "週末",
};
