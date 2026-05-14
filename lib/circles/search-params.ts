import { ACTIVITY_FREQUENCIES, type ActivityFrequency } from "@/lib/constants/activity-frequency";
import { ACTIVITY_TIME_BANDS, type ActivityTimeBand } from "@/lib/constants/activity-time-band";
import { CATEGORIES, type Category } from "@/lib/constants/category";
import { OFFICIAL_TYPES, type OfficialType } from "@/lib/constants/official-type";
import { RECRUITMENT_STATUSES, type RecruitmentStatus } from "@/lib/constants/recruitment-status";
import type { MemberSize } from "@/lib/dummy/circles";

/**
 * /circles 페이지가 URL 에서 파싱하는 검색·필터 파라미터 타입.
 *
 * 정책:
 * - 다중값(frequency / officialType / tags 등) 은 콤마 구분 single string 으로 URL 에 저장. (`?tags=a,b`)
 * - 비어있는 파라미터는 URL 에서 생략하여 깔끔 유지.
 * - 잘못된 enum 값은 fail-safe 로 무시 (parseCirclesSearchParams 에서 enum allowlist 검사).
 * - 본 타입은 RSC 의 page props 가 받는 awaited searchParams 와 분리된 「내부 도메인 모델」 — 본 page 외부 호출처(컴포넌트·테스트)는 본 타입만 사용.
 *
 * URL 키 매핑 (신규 5종):
 * - activityDays → activity_days (콤마 구분 한자 토큰)
 * - memberSize → member_size (single)
 * - recruitmentStatus → recruit (콤마 구분)
 * - activityTimeBand → time_band (콤마 구분)
 * - sort → sort (single)
 */
export interface CirclesSearchParams {
  q?: string;
  category?: Category;
  frequency: ActivityFrequency[];
  officialType: OfficialType[];
  tags: string[];
  feeMax?: number;
  page: number;
  /** 활동 요일 — 일본 한자 1자 토큰 배열 (月/火/水/木/金/土/日) */
  activityDays: string[];
  /** 회원수 범위 단일 선택 */
  memberSize?: MemberSize;
  /** 모집 상태 다중 선택 */
  recruitmentStatus: RecruitmentStatus[];
  /** 활동 시간대 다중 선택 */
  activityTimeBand: ActivityTimeBand[];
  /** 정렬 기준 */
  sort?: "popular" | "recent" | "cheap" | "large";
}

/** Next.js page props 의 awaited searchParams 형태 */
type RawSearchParams = Record<string, string | string[] | undefined>;

/** raw[key] 가 string 이면 그 자체, string[] 이면 첫 요소를 반환 */
function pickString(raw: RawSearchParams, key: string): string | undefined {
  const value = raw[key];
  if (Array.isArray(value)) return value[0];
  return value;
}

/** "a,b,c" → ["a","b","c"] (빈 토큰 제거, trim) */
function splitCsv(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Next.js page 의 awaited searchParams 를 도메인 모델로 변환.
 * - 잘못된 enum 값은 무시 (fail-safe)
 * - 다중값은 콤마 split 후 enum allowlist 통과한 것만 유지
 * - page 는 양의 정수만, 그 외는 1
 */
export function parseCirclesSearchParams(raw: RawSearchParams): CirclesSearchParams {
  const categoryRaw = pickString(raw, "category");
  const category = CATEGORIES.includes(categoryRaw as Category)
    ? (categoryRaw as Category)
    : undefined;

  const frequencyAllow = new Set<string>(ACTIVITY_FREQUENCIES);
  const frequency = splitCsv(pickString(raw, "frequency")).filter((v) =>
    frequencyAllow.has(v)
  ) as ActivityFrequency[];

  const officialAllow = new Set<string>(OFFICIAL_TYPES);
  const officialType = splitCsv(pickString(raw, "official_type")).filter((v) =>
    officialAllow.has(v)
  ) as OfficialType[];

  const tags = splitCsv(pickString(raw, "tags"));

  const feeMaxRaw = pickString(raw, "fee_max");
  const feeMax = feeMaxRaw && /^\d+$/.test(feeMaxRaw) ? Number(feeMaxRaw) : undefined;

  const q = pickString(raw, "q")?.trim() || undefined;

  const pageRaw = pickString(raw, "page");
  const pageNum = pageRaw && /^\d+$/.test(pageRaw) ? Number(pageRaw) : 1;
  const page = pageNum >= 1 ? pageNum : 1;

  // 신규 5종 파싱
  // 활동 요일: activity_days=月,火 → ["月","火"] (한자 토큰 그대로)
  const activityDays = splitCsv(pickString(raw, "activity_days"));

  // 회원수 범위: member_size=small
  const memberSizeRaw = pickString(raw, "member_size");
  const MEMBER_SIZES: MemberSize[] = ["small", "mid", "large", "huge"];
  const memberSize = MEMBER_SIZES.includes(memberSizeRaw as MemberSize)
    ? (memberSizeRaw as MemberSize)
    : undefined;

  // 모집 상태: recruit=open,newcomer_only
  const recruitmentAllow = new Set<string>(RECRUITMENT_STATUSES);
  const recruitmentStatus = splitCsv(pickString(raw, "recruit")).filter((v) =>
    recruitmentAllow.has(v)
  ) as RecruitmentStatus[];

  // 활동 시간대: time_band=weekday_night,weekend
  const timeBandAllow = new Set<string>(ACTIVITY_TIME_BANDS);
  const activityTimeBand = splitCsv(pickString(raw, "time_band")).filter((v) =>
    timeBandAllow.has(v)
  ) as ActivityTimeBand[];

  // 정렬: sort=popular|recent|cheap|large
  const sortRaw = pickString(raw, "sort");
  const SORT_OPTIONS = ["popular", "recent", "cheap", "large"] as const;
  type SortOption = (typeof SORT_OPTIONS)[number];
  const sort = SORT_OPTIONS.includes(sortRaw as SortOption) ? (sortRaw as SortOption) : undefined;

  return {
    q,
    category,
    frequency,
    officialType,
    tags,
    feeMax,
    page,
    activityDays,
    memberSize,
    recruitmentStatus,
    activityTimeBand,
    sort,
  };
}

/**
 * 도메인 모델 → URL 문자열 (예: `/circles?category=sports&tags=a,b`)
 * - 빈 값(undefined / 빈 배열 / page=1) 은 생략
 * - 다중값은 콤마 join
 */
export function buildCirclesUrl(params: Partial<CirclesSearchParams>): string {
  const search = new URLSearchParams();

  if (params.q && params.q.length > 0) search.set("q", params.q);
  if (params.category) search.set("category", params.category);
  if (params.frequency && params.frequency.length > 0) {
    search.set("frequency", params.frequency.join(","));
  }
  if (params.officialType && params.officialType.length > 0) {
    search.set("official_type", params.officialType.join(","));
  }
  if (params.tags && params.tags.length > 0) {
    search.set("tags", params.tags.join(","));
  }
  if (params.feeMax !== undefined && params.feeMax > 0) {
    search.set("fee_max", String(params.feeMax));
  }
  if (params.page !== undefined && params.page > 1) {
    search.set("page", String(params.page));
  }

  // 신규 5종 URL 빌드
  if (params.activityDays && params.activityDays.length > 0) {
    search.set("activity_days", params.activityDays.join(","));
  }
  if (params.memberSize !== undefined) {
    search.set("member_size", params.memberSize);
  }
  if (params.recruitmentStatus && params.recruitmentStatus.length > 0) {
    search.set("recruit", params.recruitmentStatus.join(","));
  }
  if (params.activityTimeBand && params.activityTimeBand.length > 0) {
    search.set("time_band", params.activityTimeBand.join(","));
  }
  if (params.sort !== undefined) {
    search.set("sort", params.sort);
  }

  const queryString = search.toString();
  return queryString ? `/circles?${queryString}` : "/circles";
}

/**
 * 추천 모드 판정 — 검색어/카테고리/활동빈도/공인구분/태그/회비/페이지 + 신규 5필드 중
 * 하나라도 활성이면 false(결과 모드), 모두 기본값이면 true(추천 모드).
 * countAppliedFilters 와 달리 category 와 page 도 포함하는 독립 함수.
 */
export function isDiscoverMode(p: CirclesSearchParams): boolean {
  return (
    !p.q &&
    !p.category &&
    p.frequency.length === 0 &&
    p.officialType.length === 0 &&
    p.tags.length === 0 &&
    p.feeMax === undefined &&
    p.page === 1 &&
    // 신규 5필드 — 모두 기본값이어야 추천 모드
    p.activityDays.length === 0 &&
    p.memberSize === undefined &&
    p.recruitmentStatus.length === 0 &&
    p.activityTimeBand.length === 0 &&
    p.sort === undefined
  );
}

/**
 * 적용된 필터 개수 — 모바일 트리거의 「フィルター (N)」 뱃지에 사용.
 * category 는 카테고리 탭 자체에서 강조되므로 카운트에서 제외 (시각 중복 회피).
 */
export function countAppliedFilters(params: CirclesSearchParams): number {
  let n = 0;
  if (params.q) n += 1;
  if (params.frequency.length > 0) n += 1;
  if (params.officialType.length > 0) n += 1;
  if (params.tags.length > 0) n += 1;
  if (params.feeMax !== undefined) n += 1;
  // 신규 5필드 카운트
  if (params.activityDays.length > 0) n += 1;
  if (params.memberSize !== undefined) n += 1;
  if (params.recruitmentStatus.length > 0) n += 1;
  if (params.activityTimeBand.length > 0) n += 1;
  if (params.sort !== undefined) n += 1;
  return n;
}
