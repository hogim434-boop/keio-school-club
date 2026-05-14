/**
 * 태그 분류 그룹 4종 — tags.kind 컬럼의 enum 값
 *
 * 사용처: 필터 시트(T-011)의 그룹 헤더, 등록 폼(T-018)의 태그 선택 그룹
 *
 * 주의: 본 'frequency' 는 「태그 분류 그룹 헤더」 의미로,
 * ActivityFrequency (circles.activity_frequency 컬럼의 enum) 와 namespace 다름
 */
export const TAG_KINDS = ["atmosphere", "cost", "frequency", "gender"] as const;

export type TagKind = (typeof TAG_KINDS)[number];

export const TAG_KIND_LABELS: Record<TagKind, string> = {
  atmosphere: "雰囲気",
  cost: "費用",
  frequency: "頻度",
  gender: "男女比",
};

/** 필터 그룹 노출 순서 (사용자 의사결정 가중치 순) */
export const TAG_KIND_ORDER: readonly TagKind[] = TAG_KINDS;
