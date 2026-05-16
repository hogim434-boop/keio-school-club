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

/**
 * UI 에 표시되는 official_type — 体育会 / インカレ 둘만.
 * 정책 변경 (사용자 결정): 「公認 / 非公認 / その他」 구분을 사용자 화면에 노출하지 않음.
 * - 데이터 모델 / DB enum 은 5종 그대로 유지 (변경 비용 큼 + 관리 메타 정보로 보존)
 * - 표시·필터링 UI 에서만 이 2종으로 한정
 */
export const VISIBLE_OFFICIAL_TYPES = ["athletics", "intercollegiate"] as const;
export type VisibleOfficialType = (typeof VISIBLE_OFFICIAL_TYPES)[number];

/**
 * UI 에 노출할 official_type 라벨을 반환.
 * `athletics` / `intercollegiate` 만 라벨 반환, 그 외 (`official` / `unofficial` / `other`) 는 `null`.
 *
 * 사용 패턴:
 * ```tsx
 * const label = getOfficialTypeDisplayLabel(circle.official_type);
 * {label && <Badge>{label}</Badge>}
 * ```
 */
export function getOfficialTypeDisplayLabel(type: OfficialType): string | null {
  if (type === "athletics" || type === "intercollegiate") {
    return OFFICIAL_TYPE_LABELS[type];
  }
  return null;
}
