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
 */

import { unstable_noStore as noStore } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { CircleDetail, CircleImage, CircleSummary, ShinkanEvent } from "@/lib/types/domain";
import type { CirclesSearchParams } from "@/lib/circles/search-params";

/** 페이지당 서클 수 */
const PAGE_SIZE = 12;

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
 * @returns { circles: CircleSummary[], total: number }
 */
export async function filterCircles(
  params: Partial<CirclesSearchParams>
): Promise<{ circles: CircleSummary[]; total: number }> {
  // Vercel Data Cache 우회 — 사용자가 필터를 바꾸면 즉시 새 결과를 봐야 함.
  // cacheComponents: true 환경에서 Next.js 가 fetch 응답을 자동 캐싱하여 stale 결과를 반환하는
  // 「localhost 정상 / Vercel stale」 버그의 진원지. noStore() 1줄로 이 함수의 모든 fetch 가 Data Cache 제외됨.
  noStore();
  const supabase = await createClient();

  // 기본값 설정
  const page = params.page ?? 1;
  const start = (page - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE - 1;

  let query = supabase
    .from("circles")
    .select("*, circle_tags(tags(slug))", { count: "exact" })
    .eq("status", "approved");

  // 검색어 — name ilike '%q%'
  if (params.q && params.q.trim().length > 0) {
    query = query.ilike("name", `%${params.q.trim()}%`);
  }

  // 카테고리 다중 선택 — .in() 사용
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

  // 활동 시간대 — overlaps (배열 필드와 교집합)
  if (params.activityTimeBand && params.activityTimeBand.length > 0) {
    query = query.overlaps("activity_time_band", params.activityTimeBand);
  }

  // 회원수 범위 — 범위 계산
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

  // all=true이면 전체 조회 (shuffle용), 아니면 페이지네이션
  if (!params.all) {
    query = query.range(start, end);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("[filterCircles]", error.message);
    return { circles: [], total: 0 };
  }

  // 태그 필터 — client side에서 후처리 (DB 배열 컬럼이 아니라 join이라 server filtering 복잡)
  // Phase 2에서 DB 레벨 태그 필터로 개선 예정
  let circles = (data ?? []).map((row) => toCircleSummary(row as Record<string, unknown>));

  if (params.tags && params.tags.length > 0) {
    const filterTags = new Set(params.tags);
    circles = circles.filter((c) => c.tags.some((t) => filterTags.has(t)));
  }

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
 * 즐겨찾기 여부 확인 — 서클 상세 페이지 하트 초기 상태에 사용.
 * @param userId 인증된 사용자 UUID
 * @param circleId 서클 UUID
 */
export async function isFavorited(userId: string, circleId: string): Promise<boolean> {
  // 사용자별 데이터 — 캐시되면 다른 사용자에게 잘못 노출되거나 본인의 토글이 반영 안 됨.
  noStore();
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
