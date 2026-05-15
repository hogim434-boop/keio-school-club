import type { MemberSize } from "@/lib/types/domain";

/**
 * 필터 라벨 상수 — FilterPanel (sheet) 과 SelectedFilters (검색 페이지 chip 영역) 공유.
 *
 * 정책:
 * - slug/enum 값을 일본어 사용자 라벨로 변환할 때 사용
 * - filter-panel.tsx 안의 내부 상수였던 것을 외부로 추출 (중복 회피)
 */

/** 회원수 범위 옵션 — FilterPanel 의 「会員数」 섹션 + chip 영역의 라벨 매핑에 사용 */
export const MEMBER_SIZE_OPTIONS: { value: MemberSize; label: string }[] = [
  { value: "small", label: "〜30名" },
  { value: "mid", label: "31〜100" },
  { value: "large", label: "101〜200" },
  { value: "huge", label: "200名+" },
];

/** value → label 빠른 조회용 record */
export const MEMBER_SIZE_LABELS: Record<MemberSize, string> = Object.fromEntries(
  MEMBER_SIZE_OPTIONS.map((o) => [o.value, o.label])
) as Record<MemberSize, string>;

/**
 * PRD 「태그 마스터」 시드 7종 — Phase 1.2 T-009 이후 tags 테이블 fetch 로 교체 예정.
 * 사용자 정책: 성별·술·연회비 관련 태그는 제외. 「活動頻度」 섹션과 의미 중복인 週1回(once_a_week) 는 제거.
 * slug 는 DB 키, label_ja 는 UI 라벨.
 */
export const TAG_SEEDS: { slug: string; label_ja: string }[] = [
  { slug: "beginner_ok", label_ja: "初心者歓迎" },
  { slug: "kenser_ok", label_ja: "兼サー可" },
  { slug: "yurui", label_ja: "ゆるい" },
  { slug: "gachi", label_ja: "ガチ" },
  { slug: "has_camp", label_ja: "合宿あり" },
  { slug: "foreign_welcome", label_ja: "留学生歓迎" },
  { slug: "intl_activity", label_ja: "海外活動あり" },
];

/** slug → label_ja 빠른 조회용 record */
export const TAG_LABELS: Record<string, string> = Object.fromEntries(
  TAG_SEEDS.map((t) => [t.slug, t.label_ja])
);

/** 정렬 옵션 enum */
export type SortOption = "popular" | "recent" | "cheap" | "large";

/** 정렬 옵션 — FilterPanel 의 「並び替え」 섹션 + chip 영역의 라벨 매핑에 사용 */
export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "popular", label: "人気順" },
  { value: "recent", label: "新着順" },
  { value: "cheap", label: "会費安い" },
  { value: "large", label: "会員数多" },
];

/** value → label 빠른 조회용 record */
export const SORT_LABELS: Record<SortOption, string> = Object.fromEntries(
  SORT_OPTIONS.map((o) => [o.value, o.label])
) as Record<SortOption, string>;

/** 활동 요일 7종 — 일본 한자 1자 토큰 (chip 영역에서 그대로 사용) */
export const WEEKDAYS = ["月", "火", "水", "木", "金", "土", "日"] as const;
export type Weekday = (typeof WEEKDAYS)[number];
