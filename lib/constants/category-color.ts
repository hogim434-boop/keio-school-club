/**
 * lib/constants/category-color.ts
 *
 * 카테고리별 색상 맵 — 캘린더 도트, 배지 등 UI 에서 공통으로 사용.
 *
 * Tailwind 클래스 문자열을 직접 쓰는 이유:
 * - build 시 purge 대상이 되려면 클래스 전체 문자열이 코드에 존재해야 하므로
 *   동적 조합(bg-${color}-500)은 사용하지 않는다.
 */

import type { Category } from "@/lib/constants/category";

/**
 * 카테고리 → 캘린더 도트 배경색 (Tailwind 클래스)
 * 도트 크기는 컴포넌트에서 지정.
 */
export const CATEGORY_DOT_COLOR: Record<Category, string> = {
  sports: "bg-orange-500",
  culture_art: "bg-purple-500",
  music: "bg-pink-500",
  academic: "bg-blue-500",
  international: "bg-teal-500",
  event: "bg-yellow-500",
  volunteer: "bg-green-500",
  media: "bg-red-500",
};

/**
 * 카테고리 → 배지 배경색 + 텍스트색 (Tailwind 클래스 조합)
 * CalendarListView 이벤트 카드 카테고리 배지에서 사용.
 */
export const CATEGORY_BADGE_COLOR: Record<Category, string> = {
  sports: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  culture_art: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  music: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
  academic: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  international: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
  event: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  volunteer: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  media: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

/** 알 수 없는 카테고리(null)에 사용하는 폴백 도트 색 */
export const FALLBACK_DOT_COLOR = "bg-neutral-400";

/** 알 수 없는 카테고리(null)에 사용하는 폴백 배지 색 */
export const FALLBACK_BADGE_COLOR =
  "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300";

/**
 * 카테고리 → 좌측 컬러 막대 border 클래스 (Tailwind purge 안전한 정적 문자열).
 * 캘린더 月表示 의 셀 내 「첫 이벤트 pill」 좌측 막대에 사용.
 * P5: TimeTree + Google Calendar 표준 패턴.
 * TINT 배경(bg-orange-50 등)을 쓰지 않는 이유:
 *   다크모드에서 흰 배경이 번쩍이는 깜빡임 현상이 발생하기 때문.
 *   border-l-2 만으로 카테고리 색상을 충분히 전달할 수 있다.
 */
export const CATEGORY_BAR_COLOR: Record<Category, string> = {
  sports: "border-orange-500",
  culture_art: "border-purple-500",
  music: "border-pink-500",
  academic: "border-blue-500",
  international: "border-teal-500",
  event: "border-yellow-500",
  volunteer: "border-green-500",
  media: "border-red-500",
};

/** 알 수 없는 카테고리(null) 폴백 좌측 막대 색. */
export const FALLBACK_BAR_COLOR = "border-neutral-400";
