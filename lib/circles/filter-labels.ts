/**
 * 필터 라벨 상수 — FilterPanel (sheet) 과 SelectedFilters (검색 페이지 chip 영역) 공유.
 *
 * 정책:
 * - slug/enum 값을 일본어 사용자 라벨로 변환할 때 사용
 * - filter-panel.tsx 안의 내부 상수였던 것을 외부로 추출 (중복 회피)
 *
 * 회원수(会員数) 옵션은 등록 폼과 동일한 member_band(5밴드, lib/constants/member-band.ts)로
 * 통일하여 별도 MEMBER_SIZE_OPTIONS 를 두지 않는다 (스케일 불일치 제거, 2026-05 개편).
 */

/**
 * 「태그 마스터」 시드 — 특징 태그(검색 필터 「タグ」 섹션).
 *
 * 정책:
 * - 성별·술 관련 태그 제외.
 * - 雰囲気 ガチ/ゆるめ 노출 (사용자 요청으로 재추가, 2026-05).
 * - 留学生歓迎 ↔ 海外活動 모호함 해소를 위해 라벨을 「入部 대상」 / 「활동 장소」로 명확화.
 * - 「混合」「選考なし」 제거, 「学年制限あり」 → 「新入生歓迎」「全学年歓迎」 로 구체화.
 * slug 는 DB 키, label_ja 는 UI 라벨.
 */
export const TAG_SEEDS: { slug: string; label_ja: string }[] = [
  // 雰囲気
  { slug: "yurui", label_ja: "ゆるめ" },
  { slug: "gachi", label_ja: "ガチ" },
  // 특징
  { slug: "beginner_ok", label_ja: "初心者歓迎" },
  { slug: "kenser_ok", label_ja: "兼サー可" },
  { slug: "has_camp", label_ja: "合宿あり" },
  { slug: "foreign_welcome", label_ja: "留学生の入部歓迎" },
  { slug: "intl_activity", label_ja: "海外で活動あり" },
  // 活動場所
  { slug: "on_campus", label_ja: "校内" },
  { slug: "off_campus", label_ja: "学外" },
  { slug: "online_place", label_ja: "オンライン" },
  // 入会方法
  { slug: "first_come", label_ja: "先着順" },
  { slug: "interview", label_ja: "面接" },
  { slug: "lottery", label_ja: "抽選" },
  // 募集対象
  { slug: "freshman_welcome", label_ja: "新入生歓迎" },
  { slug: "all_grades", label_ja: "全学年歓迎" },
  // キャンパス — 활동 거점 캠퍼스. tags.kind='campus' (2026-06 추가)
  { slug: "hiyoshi", label_ja: "日吉" },
  { slug: "mita", label_ja: "三田" },
  { slug: "yagami", label_ja: "矢上" },
  { slug: "sfc", label_ja: "SFC" },
  { slug: "shinanomachi", label_ja: "信濃町" },
];

/** slug → label_ja 빠른 조회용 record */
export const TAG_LABELS: Record<string, string> = Object.fromEntries(
  TAG_SEEDS.map((t) => [t.slug, t.label_ja])
);

/** 정렬 옵션 enum */
export type SortOption = "popular" | "recent" | "large";

/** 정렬 옵션 — FilterPanel 의 「並び替え」 섹션 + chip 영역의 라벨 매핑에 사용 */
export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "popular", label: "人気順" },
  { value: "recent", label: "新着順" },
  { value: "large", label: "会員数多" },
];

/** value → label 빠른 조회용 record */
export const SORT_LABELS: Record<SortOption, string> = Object.fromEntries(
  SORT_OPTIONS.map((o) => [o.value, o.label])
) as Record<SortOption, string>;

/** 활동 요일 7종 — 일본 한자 1자 토큰 (chip 영역에서 그대로 사용) */
export const WEEKDAYS = ["月", "火", "水", "木", "金", "土", "日"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

/**
 * 「不定期」(요일이 정해지지 않음) 옵션 — 등록·필터 공통.
 * activity_days(text) 에 "不定期" 로 저장되며, 요일 토큰(月〜日)과는 배타적으로 선택한다.
 */
export const IRREGULAR_DAY = "不定期" as const;

/** 활동 요일 칩 선택지 — 7요일 + 不定期 (등록 폼·필터 패널 공유) */
export const ACTIVITY_DAY_OPTIONS = [...WEEKDAYS, IRREGULAR_DAY] as const;
