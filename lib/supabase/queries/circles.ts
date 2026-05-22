/**
 * lib/supabase/queries/circles.ts
 *
 * RSC(Server Components)에서 호출하는 circles 관련 fetch 함수 모음.
 * Phase 1.2 T-009 와이어업 — lib/dummy/circles.ts의 더미 데이터를 대체.
 *
 * 주의:
 * - createClient()는 함수 내부에서 매번 새로 생성 (Fluid compute 전역 변수 금지)
 * - Supabase JS JOIN 결과는 중첩 객체 형태라 domain 타입으로 매핑 필요
 * - filterCircles의 q 검색은 name ilike '%q%' 단순 구현 — Phase 2에서 full-text 확장
 * - activity_days 컬럼은 text 타입 (예: "月・水・金") — .or() + ilike 로 다중 요일 OR 필터
 */

import { createClient } from "@/lib/supabase/server";
import type { CircleDetail, CircleImage, CircleSummary } from "@/lib/types/domain";
import type { CirclesSearchParams } from "@/lib/circles/search-params";
import {
  getCurrentRecruitingStatuses,
  type RecruitmentStatus,
} from "@/lib/constants/recruitment-status";
import type { Category } from "@/lib/constants/category";
import type { MemberBand } from "@/lib/constants/member-band";
import type { OfficialType } from "@/lib/constants/official-type";
import type { CircleStatus } from "@/lib/constants/circle-status";

/** 페이지당 서클 수 */
const PAGE_SIZE = 12;

// ============================================================
// 내부 필터 헬퍼 — filterCircles / countFilteredCircles 공유
// ============================================================

/**
 * Supabase 쿼리 빌더에 공통 WHERE 조건을 적용하는 헬퍼.
 *
 * filterCircles(결과 경로)와 countFilteredCircles(카운트 경로) 양쪽에서
 * 동일한 조건을 공유하기 위해 분리. 이 함수를 수정하면 두 경로 모두 반영된다.
 *
 * 포함하지 않는 것: 정렬(order), 페이지네이션(range), 태그 필터, select 절
 * — 두 경로에서 처리 방식이 다르기 때문에 각자 처리.
 */
function applyCircleFilters<T>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  params: Partial<CirclesSearchParams>
): T {
  // 검색어 — name ilike '%q%'
  if (params.q && params.q.trim().length > 0) {
    query = query.ilike("name", `%${params.q.trim()}%`);
  }

  // 카테고리 다중 선택
  if (params.category && params.category.length > 0) {
    query = query.in("category", params.category);
  }

  // 활동 빈도 다중 선택
  if (params.frequency && params.frequency.length > 0) {
    query = query.in("activity_frequency", params.frequency);
  }

  // 공인 구분 다중 선택
  if (params.officialType && params.officialType.length > 0) {
    query = query.in("official_type", params.officialType);
  }

  // 모집 상태 다중 선택
  if (params.recruitmentStatus && params.recruitmentStatus.length > 0) {
    query = query.in("recruitment_status", params.recruitmentStatus);
  }

  // 활동 시간대 — overlaps (배열 컬럼과 교집합, 하나라도 겹치면 매칭)
  if (params.activityTimeBand && params.activityTimeBand.length > 0) {
    query = query.overlaps("activity_time_band", params.activityTimeBand);
  }

  // 회원수 범위 — small/mid/large/huge → 숫자 범위로 변환
  if (params.memberSize) {
    const ranges: Record<string, [number, number]> = {
      small: [0, 30],
      mid: [31, 100],
      large: [101, 200],
      huge: [201, 999999],
    };
    const [min, max] = ranges[params.memberSize];
    query = query.gte("member_count", min).lte("member_count", max);
  }

  // 활동 요일 — activity_weekdays(text[] 생성 컬럼)와 선택 요일의 교집합.
  // overlaps(&&) = 선택 요일 중 하나라도 활동하면 매칭 (OR).
  // 이전의 activity_days text ilike 방식은 "曜日"의 日 까지 잡는 false-positive 가 있어
  // 요일만 정규 추출한 배열 컬럼으로 교체 (lib/types/database.ts activity_weekdays 참조).
  if (params.activityDays && params.activityDays.length > 0) {
    query = query.overlaps("activity_weekdays", params.activityDays);
  }

  return query;
}

/**
 * 태그 슬러그 목록 → 매칭되는 circle_id 배열 (중복 제거).
 *
 * 태그 필터를 DB 레벨에서 정확히 처리하기 위한 1단계 쿼리.
 * filterCircles(결과 경로)와 countFilteredCircles(카운트 경로) 양쪽이 이 헬퍼를 공유해
 * 「선택 태그 중 하나라도 보유(OR)」라는 동일한 의미 + 동일한 서클 집합을 보장한다.
 *
 * 핵심: 한 서클이 선택 태그를 여러 개 매칭해도 Set 으로 중복 제거한다.
 * 이렇게 안 하면 「!inner join + count」 가 조인 행 수를 세어 카운트를 부풀리고
 * (예: distinct 30건인데 37로 셈) → 미리보기 N件 과 결과 페이지 카드 수가 어긋난다.
 *
 * @returns 매칭 circle_id 배열. 매칭 0건이면 빈 배열.
 */
async function resolveCircleIdsByTags(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  tags: string[]
): Promise<string[]> {
  const { data, error } = await supabase
    .from("circle_tags")
    .select("circle_id, tags!inner(slug)")
    .in("tags.slug", tags);
  if (error) {
    console.error("[resolveCircleIdsByTags]", error.message);
    return [];
  }
  const ids = (data ?? []).map((row: { circle_id: string }) => row.circle_id) as string[];
  return [...new Set(ids)];
}

// ============================================================
// 내부 매핑 헬퍼
// ============================================================

/** Supabase JOIN 결과 → CircleSummary 도메인 타입 변환 */
function toCircleSummary(row: Record<string, unknown>): CircleSummary {
  // circle_tags JOIN → [{tags: {slug: 'x'}}, ...] → string[]
  const tagRows = (row.circle_tags as { tags: { slug: string } | null }[] | null) ?? [];
  const tags = tagRows.map((ct) => ct.tags?.slug).filter((s): s is string => Boolean(s));

  return {
    id: row.id as string,
    name: row.name as string,
    category: row.category as CircleSummary["category"],
    official_type: row.official_type as CircleSummary["official_type"],
    activity_frequency: row.activity_frequency as CircleSummary["activity_frequency"],
    cover_image_url: (row.cover_image_url as string | null) ?? null,
    view_count: (row.view_count as number) ?? 0,
    inquiry_count: (row.inquiry_count as number) ?? 0,
    tags,
    description: (row.description as string) ?? "",
    recruitment_status: (row.recruitment_status as RecruitmentStatus | null) ?? null,
  };
}

/** Supabase JOIN 결과 → CircleDetail 도메인 타입 변환 */
function toCircleDetail(row: Record<string, unknown>): CircleDetail {
  const summary = toCircleSummary(row);

  // circle_images JOIN → CircleImage[]
  const images = ((row.circle_images as Record<string, unknown>[]) ?? []).map(
    (img): CircleImage => ({
      id: img.id as string,
      image_url: img.image_url as string,
      sort_order: (img.sort_order as number) ?? 0,
    })
  );

  return {
    ...summary,
    activity_days: (row.activity_days as string) ?? "",
    // member_count 는 DB 에 남아 있지만 표시는 member_band 로 대체 (마이그레이션 008)
    member_band: (row.member_band as MemberBand | null) ?? null,
    contact_instagram: (row.contact_instagram as string | null) ?? null,
    contact_x: (row.contact_x as string | null) ?? null,
    contact_line: (row.contact_line as string | null) ?? null,
    images,
    // owner_id NULL 시드이므로 빈 문자열로 fallback
    owner_id: (row.owner_id as string | null) ?? "",
    status: (row.status as CircleDetail["status"]) ?? "approved",
    activity_time_band: row.activity_time_band as CircleDetail["activity_time_band"],
  };
}

// ============================================================
// 공개 fetch 함수
// ============================================================

/**
 * 인기 서클 목록 — view_count 내림차순.
 * 홈 Discover 섹션 (인기 6건)에서 사용.
 */
export async function getPopularCircles(limit = 6): Promise<CircleSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("circles")
    .select("*, circle_tags(tags(slug))")
    .eq("status", "approved")
    .order("view_count", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[getPopularCircles]", error.message);
    return [];
  }
  return (data ?? []).map((row) => toCircleSummary(row as Record<string, unknown>));
}

/**
 * 신규 서클 목록 — created_at 내림차순.
 * 홈 Discover 섹션 (새로 온 10건)에서 사용.
 */
export async function getNewCircles(limit = 10): Promise<CircleSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("circles")
    .select("*, circle_tags(tags(slug))")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[getNewCircles]", error.message);
    return [];
  }
  return (data ?? []).map((row) => toCircleSummary(row as Record<string, unknown>));
}

/**
 * 「現在募集中」(지금 가입 가능)인 서클 — 홈 Discover 「現在募集中のサークル」 섹션에서 사용.
 *
 * 「지금」 의 의미를 시기에 맞게 해석한다 (newcomer_only 데이터는 보존하되, 시즌 밖이면 섹션에서 숨김):
 * - year_round(通年募集): 언제든 모집 → 항상 포함.
 * - newcomer_only(新歓シーズン): 4월 신환 시기에만 모집 → 新歓 시즌(3~4월)에만 포함.
 *   예) 현재 5월이면 新歓 종료 → 섹션엔 通年募集 서클만 노출.
 *
 * 정렬: 시급한 모집(newcomer_only)을 통년(year_round)보다 앞에, 동일 우선순위 내 인기순(view_count).
 */
export async function getRecruitingCircles(limit = 12): Promise<CircleSummary[]> {
  const supabase = await createClient();

  // 시기 기반 「現在募集中」 상태 (新歓 시즌이면 newcomer_only 포함, 아니면 year_round 만)
  const statuses = getCurrentRecruitingStatuses();

  const { data, error } = await supabase
    .from("circles")
    .select("*, circle_tags(tags(slug))")
    .eq("status", "approved")
    .in("recruitment_status", statuses)
    .order("view_count", { ascending: false })
    .limit(24);

  if (error) {
    console.error("[getRecruitingCircles]", error.message);
    return [];
  }

  // 모집 상태 우선순위 — newcomer_only(新歓シーズン·시급) 를 year_round(통년) 앞으로
  const priority: Record<RecruitmentStatus, number> = {
    newcomer_only: 0,
    year_round: 1,
  };
  return (data ?? [])
    .map((row) => toCircleSummary(row as Record<string, unknown>))
    .sort(
      (a, b) =>
        priority[a.recruitment_status ?? "year_round"] -
        priority[b.recruitment_status ?? "year_round"]
    )
    .slice(0, limit);
}

/**
 * 카테고리별 서클 — 홈 category strip에서 사용.
 * @param category circles.category enum 값
 * @param limit 취득 건수 (기본 8건)
 */
export async function getCirclesByCategory(category: string, limit = 8): Promise<CircleSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("circles")
    .select("*, circle_tags(tags(slug))")
    .eq("status", "approved")
    .eq("category", category)
    .order("view_count", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[getCirclesByCategory]", error.message);
    return [];
  }
  return (data ?? []).map((row) => toCircleSummary(row as Record<string, unknown>));
}

/**
 * 서클 상세 1건 — circles/[id] 페이지에서 사용.
 * circle_images, circle_tags(tags) 전부 JOIN.
 */
export async function getCircleById(id: string): Promise<CircleDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("circles")
    .select("*, circle_tags(tags(slug)), circle_images(*)")
    .eq("id", id)
    .eq("status", "approved")
    .maybeSingle();

  if (error) {
    console.error("[getCircleById]", error.message);
    return null;
  }
  if (!data) return null;
  return toCircleDetail(data as Record<string, unknown>);
}

/**
 * id 다건 조회 — /favorites(게스트 localStorage 즐겨찾기) 카드 그리드용.
 * approved 만 반환(비공개/거절 서클 제외). 반환 순서는 보장하지 않으므로
 * 호출측에서 필요 시 id 순서대로 재정렬한다.
 */
export async function getCirclesByIds(ids: string[]): Promise<CircleSummary[]> {
  if (ids.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("circles")
    .select("*, circle_tags(tags(slug))")
    .eq("status", "approved")
    .in("id", ids);

  if (error) {
    console.error("[getCirclesByIds]", error.message);
    return [];
  }
  return (data ?? []).map((row) => toCircleSummary(row as Record<string, unknown>));
}

/**
 * 필터 검색 — /circles 결과 모드 + /search 페이지에서 사용.
 * CirclesSearchParams의 모든 필드를 Supabase 쿼리로 변환.
 *
 * 태그 필터는 2단계 쿼리로 DB 레벨에서 처리:
 *   1단계: 태그 조건 매칭 circle_id 목록 수집 (inner join)
 *   2단계: 해당 id들의 전체 태그를 일반 join으로 다시 가져와 카드 표시용 tags 보존
 *   → !inner join 단독 사용 시 "선택한 태그만" 잘려 카드 표시가 깨지는 함정을 회피
 *
 * @returns { circles: CircleSummary[], total: number }
 */
export async function filterCircles(
  params: Partial<CirclesSearchParams>
): Promise<{ circles: CircleSummary[]; total: number }> {
  const supabase = await createClient();

  // 페이지네이션 범위 계산
  const page = params.page ?? 1;
  const start = (page - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE - 1;

  // ── 1단계: 태그 필터가 있으면 매칭 circle_id 목록을 미리 확보 ──────────────
  // !inner join을 결과 쿼리에 직접 쓰면 반환되는 circle_tags가 "매칭 태그만"으로 잘려
  // 카드 표시용 tags 배열이 깨진다. 그래서 1단계(헬퍼)에서 id만 뽑고,
  // 2단계에서 일반 join으로 전체 태그를 가져와 표시용 tags를 보존한다.
  let tagFilterIds: string[] | null = null;
  if (params.tags && params.tags.length > 0) {
    tagFilterIds = await resolveCircleIdsByTags(supabase, params.tags);
    // 매칭 서클이 0개면 즉시 빈 결과 반환 (불필요한 2단계 쿼리 차단)
    if (tagFilterIds.length === 0) {
      return { circles: [], total: 0 };
    }
  }

  // ── 2단계: 실제 서클 데이터 쿼리 (표시용 태그 전체 join 포함) ───────────────
  let query = supabase
    .from("circles")
    .select("*, circle_tags(tags(slug))", { count: "exact" })
    .eq("status", "approved");

  // 1단계에서 확보한 id 목록으로 태그 필터 적용 (DB 레벨, 정확한 count 보장)
  if (tagFilterIds !== null) {
    query = query.in("id", tagFilterIds);
  }

  // 공통 WHERE 조건 적용 (q, category, frequency, officialType, recruitmentStatus,
  // activityTimeBand, memberSize, activityDays)
  query = applyCircleFilters(query, params);

  // 정렬
  if (params.sort === "popular") {
    query = query.order("view_count", { ascending: false });
  } else if (params.sort === "recent") {
    query = query.order("created_at", { ascending: false });
  } else if (params.sort === "large") {
    query = query.order("member_count", { ascending: false });
  } else {
    // 기본 정렬: 인기순
    query = query.order("view_count", { ascending: false });
  }

  // all=true이면 전체 조회, 아니면 페이지네이션
  if (!params.all) {
    query = query.range(start, end);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("[filterCircles]", error.message);
    return { circles: [], total: 0 };
  }

  // JS 후처리 태그 필터 제거 — DB 레벨(1단계 id 필터)로 이관 완료
  const circles = (data ?? []).map((row) => toCircleSummary(row as Record<string, unknown>));

  return {
    circles,
    total: count ?? circles.length,
  };
}

/**
 * 즐겨찾기 서클 목록 — /favorites 페이지에서 사용.
 * @param userId 인증된 사용자 UUID
 */
export async function getFavorites(userId: string): Promise<CircleSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("favorites")
    .select("circles(*, circle_tags(tags(slug)))")
    .eq("user_id", userId);

  if (error) {
    console.error("[getFavorites]", error.message);
    return [];
  }

  return (data ?? [])
    .map((row) => {
      const circle = row.circles as unknown as Record<string, unknown> | null;
      if (!circle) return null;
      return toCircleSummary(circle);
    })
    .filter((c): c is CircleSummary => c !== null);
}

/**
 * 소유자용 서클 상세 조회 — 편집 페이지(/circles/{id}/edit)에서 사용.
 *
 * getCircleById 와 동일한 JOIN + toCircleDetail 매핑을 재사용하지만
 * status 필터를 두지 않는다.
 *
 * RLS circles_select_public_or_owner_or_admin 정책이 자동으로
 *   - approved: 누구나 조회 가능
 *   - pending / rejected: owner 또는 admin 만 조회 가능
 * 을 적용하므로, 소유자가 아닌 사용자가 미승인 서클을 조회하면 RLS 가 막아 null 을 반환한다.
 *
 * 편집 페이지는 추가로 circle.owner_id !== userId 를 직접 확인해 명시적 가드를 적용한다.
 *
 * @param id 서클 UUID
 */
export async function getCircleForEdit(id: string): Promise<CircleDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("circles")
    .select("*, circle_tags(tags(slug)), circle_images(*)")
    .eq("id", id)
    // status 필터 없음 — pending / rejected 도 소유자·admin 은 조회 가능
    .maybeSingle();

  if (error) {
    console.error("[getCircleForEdit]", error.message);
    return null;
  }
  if (!data) return null;
  return toCircleDetail(data as Record<string, unknown>);
}

/**
 * 즐겨찾기 여부 확인 — 서클 상세 페이지 하트 초기 상태에 사용.
 * @param userId 인증된 사용자 UUID
 * @param circleId 서클 UUID
 */
export async function isFavorited(userId: string, circleId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("favorites")
    .select("user_id")
    .match({ user_id: userId, circle_id: circleId })
    .maybeSingle();

  if (error) {
    console.error("[isFavorited]", error.message);
    return false;
  }
  return data !== null;
}

// ============================================================
// 마이페이지용 타입 및 fetch 함수 (T-016)
// ============================================================

/**
 * 내 서클 목록 한 줄 — 오너 전용 경량 타입.
 * 심사 상태(status)·반려 이유(rejection_reason)를 포함해
 * 마이페이지의 서클 관리 카드에서 상태 뱃지·반려 메시지를 표시한다.
 *
 * 운영 대시보드 개편(T-018)으로 운영 지표 추가:
 * - view_count: 총 조회수 (approved 카드 메트릭에 표시)
 * - inquiry_count: 문의 수 (approved 카드 메트릭에 표시)
 * - member_band: 부원 수 범위 (approved 카드 뱃지에 표시 — member_count 에서 교체)
 * - recruitment_status: 모집 상태 (approved 카드 모집 뱃지에 표시)
 */
export type MyCircle = {
  id: string;
  name: string;
  slug: string;
  category: Category;
  official_type: OfficialType;
  status: CircleStatus;
  rejection_reason: string | null;
  cover_image_url: string | null;
  created_at: string;
  /** 총 조회수 — DB 기본값 0, 항상 number */
  view_count: number;
  /**
   * 부원 수 범위 — 마이그레이션 008. nullable (任意 필드).
   * 운영 카드에서 뱃지로 표시. 미설정(null) 이면 뱃지 비표시.
   */
  member_band: MemberBand | null;
  /** 문의 수 — DB 기본값 0, 항상 number */
  inquiry_count: number;
  /** 모집 상태 — DB enum (recruitment_status_enum). 미설정 시 null 가능성 없음(DB 기본값 있음) */
  recruitment_status: RecruitmentStatus;
};

/**
 * 사용자 프로필 조회 — 마이페이지 헤더(표시 이름·慶應 인증 뱃지)에서 사용.
 * @param userId 인증된 사용자 UUID
 */
export async function getMyProfile(
  userId: string
): Promise<{ display_name: string | null; keio_verified: boolean } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("display_name, keio_verified")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    console.error("[getMyProfile]", error.message);
    return null;
  }
  if (!data) return null;
  return {
    display_name: (data.display_name as string | null) ?? null,
    keio_verified: Boolean(data.keio_verified),
  };
}

/**
 * 내 서클 목록 — owner_id 기준, status 무관 전체 조회.
 * RLS circles_select_public_or_owner_or_admin 정책에 의해 owner 본인 행은 통과된다.
 *
 * 운영 대시보드 개편(T-018)으로 운영 지표 4종 추가 select:
 * view_count, member_count, inquiry_count, recruitment_status
 *
 * @param userId 인증된 사용자 UUID
 */
export async function getMyCircles(userId: string): Promise<MyCircle[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("circles")
    // member_count → member_band 로 교체 (마이그레이션 008)
    .select(
      "id, name, slug, category, official_type, status, rejection_reason, cover_image_url, created_at, view_count, member_band, inquiry_count, recruitment_status"
    )
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[getMyCircles]", error.message);
    return [];
  }
  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    return {
      id: r.id as string,
      name: r.name as string,
      slug: r.slug as string,
      category: r.category as MyCircle["category"],
      official_type: r.official_type as MyCircle["official_type"],
      status: r.status as MyCircle["status"],
      rejection_reason: (r.rejection_reason as string | null) ?? null,
      cover_image_url: (r.cover_image_url as string | null) ?? null,
      created_at: r.created_at as string,
      // 운영 지표
      view_count: (r.view_count as number) ?? 0,
      // 부원 수 범위 — nullable (任意), 미설정이면 null
      member_band: (r.member_band as MemberBand | null) ?? null,
      inquiry_count: (r.inquiry_count as number) ?? 0,
      recruitment_status: r.recruitment_status as MyCircle["recruitment_status"],
    };
  });
}
