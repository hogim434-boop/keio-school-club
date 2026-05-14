/**
 * 단체 카테고리 8종 — circles.category 컬럼의 enum 값
 * - slug 는 영문 (DB enum, URL `?category=sports`, 인덱스 효율)
 * - LABELS 는 일본어 (UI 표시)
 * PRD 「메뉴 구조」 의 카테고리 탭 8개와 1:1 일치
 */
export const CATEGORIES = [
  "sports",
  "culture_art",
  "music",
  "academic",
  "international",
  "event",
  "volunteer",
  "media",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  sports: "スポーツ",
  culture_art: "文化・芸術",
  music: "音楽",
  academic: "学術・研究",
  international: "国際交流",
  event: "イベント・企画",
  volunteer: "ボランティア",
  media: "メディア",
};

/** 카테고리 탭의 좌→우 노출 순서 */
export const CATEGORY_ORDER: readonly Category[] = CATEGORIES;
