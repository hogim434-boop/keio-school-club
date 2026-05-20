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
import type { CircleDetail, CircleImage, CircleSummary, ShinkanEvent } from "@/lib/types/domain";
import type { CirclesSearchParams } from "@/lib/circles/search-params";

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

  // shinkan_events JOIN → ShinkanEvent[]
  const shinkan_events = ((row.shinkan_events as Record<string, unknown>[]) ?? []).map(
    (ev): ShinkanEvent => ({
      id: ev.id as string,
      title: ev.title as string,
      event_date: ev.event_date as string,
      is_online: (ev.is_online as boolean) ?? false,
    })
  );

  return {
    ...summary,
    description: (row.description as string) ?? "",
    activity_days: (row.activity_days as string) ?? "",
    member_count: (row.member_count as number) ?? 0,
    contact_instagram: (row.contact_instagram as string | null) ?? null,
    contact_x: (row.contact_x as string | null) ?? null,
    contact_line: (row.contact_line as string | null) ?? null,
    images,
    // owner_id NULL 시드이므로 빈 문자열로 fallback
    owner_id: (row.owner_id as string | null) ?? "",
    status: (row.status as CircleDetail["status"]) ?? "approved",
    shinkan_events,
    recruitment_status: row.recruitment_status as CircleDetail["recruitment_status"],
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
 * circle_images, shinkan_events, circle_tags(tags) 전부 JOIN.
 */
export async function getCircleById(id: string): Promise<CircleDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("circles")
    .select("*, circle_tags(tags(slug)), circle_images(*), shinkan_events(*)")
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
 * 카운트 전용 경량 쿼리 — /search 페이지의 「N件のサークルを見る」 카운트 미리보기용.
 *
 * filterCircles와 동일한 WHERE 조건을 applyCircleFilters 헬퍼로 공유하되,
 * `.select("id", { count: "exact", head: true })`로 실제 행을 0개 반환해
 * 네트워크 전송량을 최소화한다. 정렬·페이지네이션은 카운트에 불필요하므로 생략.
 *
 * 태그 필터는 filterCircles(결과 경로)와 동일한 「2단계 distinct id」 방식으로 처리한다.
 * !inner join + count 는 한 서클이 태그를 여러 개 매칭하면 조인 행을 세어 카운트를
 * 부풀릴 수 있어(미리보기 N件 ≠ 결과 페이지 카드 수), 두 경로의 숫자를 구조적으로 일치시킨다.
 *
 * @param params 필터 조건 (filterCircles와 동일 타입)
 * @returns 매칭되는 서클 수
 */
export async function countFilteredCircles(params: Partial<CirclesSearchParams>): Promise<number> {
  const supabase = await createClient();

  // 태그 필터가 있으면 먼저 매칭 circle_id 를 distinct 로 확보 (결과 경로와 동일 헬퍼 공유 → 카운트 일치)
  let tagFilterIds: string[] | null = null;
  if (params.tags && params.tags.length > 0) {
    tagFilterIds = await resolveCircleIdsByTags(supabase, params.tags);
    if (tagFilterIds.length === 0) return 0;
  }

  // head:true → 실제 행은 0개 반환하고 count 만 받아 전송량 최소화.
  // 정렬·페이지네이션은 카운트에 불필요하므로 생략.
  let query = supabase
    .from("circles")
    .select("id", { count: "exact", head: true })
    .eq("status", "approved");

  if (tagFilterIds !== null) {
    query = query.in("id", tagFilterIds);
  }

  // 공통 WHERE 조건 적용
  query = applyCircleFilters(query, params);

  const { count, error } = await query;

  if (error) {
    console.error("[countFilteredCircles]", error.message);
    return 0;
  }

  return count ?? 0;
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
