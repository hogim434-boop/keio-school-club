/**
 * 단체 분류 5종 — circles.official_type 컬럼의 enum 값
 *
 * 정책 (PRD 「면책 사항」 참조):
 * - 공인 여부는 메타 정보로만 표시. 검색·등록 자체에는 차별을 두지 않는다.
 * - 「公認」 표기는 등록자 자기 신고 + 관리자 1차 검수 결과로,
 *   慶應義塾大学 公式 보증을 의미하지 않는다.
 * - 카드/상세 UI 에서는 OFFICIAL_TYPE_LABELS 의 일본어 라벨 그대로 표시.
 * - DB 의 Postgres enum `official_type_enum` (T-005) 과 single source of truth 일치.
 */
export const OFFICIAL_TYPES = [
  "athletics",
  "official",
  "unofficial",
  "intercollegiate",
  "other",
] as const;

export type OfficialType = (typeof OFFICIAL_TYPES)[number];

export const OFFICIAL_TYPE_LABELS: Record<OfficialType, string> = {
  athletics: "体育会",
  official: "公認",
  unofficial: "非公認",
  intercollegiate: "インカレ",
  other: "その他",
};

/** 필터·뱃지 UI 의 노출 순서 (公式 정도 높은 → 낮은) */
export const OFFICIAL_TYPE_ORDER: readonly OfficialType[] = OFFICIAL_TYPES;
