/**
 * lib/supabase/queries/circles-public.ts
 *
 * さがす(검색) 페이지 전용 공개 서클 검색 함수.
 *
 * 설계 원칙:
 * - anon 클라이언트 사용 — unstable_cache 안에서 cookies() 호출 금지.
 * - unstable_cache + tags:["circles:public"] + revalidate:300 — 5분 캐싱.
 * - T-010 운영자 동아리 수정 완료 시 revalidateTag("circles:public") 로 즉시 무효화.
 * - SQL injection 방지: Supabase .ilike() 는 자동 이스케이프. % 는 wildcard 처리됨에 유의.
 *
 * 검색 파라미터:
 * - q: 동아리 이름 부분 일치 (ilike)
 * - category: 카테고리 단일/다중 선택
 * - frequency: 활동 빈도 다중 선택
 * - sort: 정렬 기준 4종 (popular/recent/alphabetical/large)
 * - page: 페이지 번호 (PAGE_SIZE 12건씩)
 *
 * 「公認」 카테고리 사용 금지 [[avoid-koujin-wording]].
 */

import { unstable_cache } from "next/cache";

import { createAnonClient } from "@/lib/supabase/anon";
import type { CircleSummary } from "@/lib/types/domain";
import type { Category } from "@/lib/constants/category";
import type { ActivityFrequency } from "@/lib/constants/activity-frequency";
import type { RecruitmentStatus } from "@/lib/constants/recruitment-status";

/** 검색 페이지 기본 페이지 크기 */
const PAGE_SIZE = 12;

/** searchPublicCircles 입력 파라미터 */
export interface SearchPublicCirclesParams {
  /** 동아리 이름 부분 일치 검색 */
  q?: string;
  /** 카테고리 다중 선택 — 빈 배열이면 카테고리 필터 무효 */
  category?: Category[];
  /** 활동 빈도 다중 선택 */
  frequency?: ActivityFrequency[];
  /**
   * 정렬 기준:
   * - "popular": 조회수 내림차순 (기본)
   * - "recent": 등록일 내림차순
   * - "alphabetical": 이름 가나다순 (ABC 오름차순)
   * - "large": 회원수 범위 내림차순
   */
  sort?: "popular" | "recent" | "alphabetical" | "large";
  /** 페이지 번호 (1-based, 기본 1) */
  page?: number;
}

/** searchPublicCircles 반환값 */
export interface SearchPublicCirclesResult {
  circles: CircleSummary[];
  total: number;
  totalPages: number;
}

/**
 * Supabase JOIN 결과 → CircleSummary 도메인 타입 변환 (anon 전용).
 * circles.ts 의 toCircleSummary 와 동일한 로직 — 의존성 분리를 위해 여기서 독립 구현.
 */
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

/**
 * さがす 검색 페이지용 공개 서클 검색 함수.
 *
 * unstable_cache 적용:
 * - cache key: ["circles:public:search", JSON.stringify(params)] — 파라미터 조합별 캐싱
 * - tags: ["circles:public"] — 운영자 동아리 수정 시 revalidateTag("circles:public") 즉시 무효화
 * - revalidate: 300 — 5분 TTL (검색 결과는 홈 섹션보다 느슨하게 캐싱)
 *
 * 정렬 4종:
 * - popular: view_count 내림차순 (기본값 — 인기 동아리 우선)
 * - recent: created_at 내림차순 (신착 우선)
 * - alphabetical: name 오름차순 (가나다순)
 * - large: member_band 내림차순, nullsFirst:false (대규모 동아리 우선)
 */
/**
 * unstable_cache 내부 구현 — 실제 DB 쿼리 수행.
 * 외부에서는 searchPublicCircles 래퍼를 사용한다.
 */
const _searchPublicCirclesRaw = unstable_cache(
  async (params: SearchPublicCirclesParams): Promise<SearchPublicCirclesResult> => {
    const supabase = createAnonClient();

    // 페이지네이션 범위 계산 (1-based → 0-based)
    const page = params.page ?? 1;
    const start = (page - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE - 1;

    // 기본 쿼리 — approved 동아리 + 태그 JOIN + exact count
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = supabase
      .from("circles")
      .select("*, circle_tags(tags(slug))", { count: "exact" })
      .eq("status", "approved");

    // 검색어 필터 — name ilike '%q%'
    // 주의: % 는 Supabase ilike 에서 wildcard 로 동작. SQL injection 은 자동 방지됨.
    if (params.q && params.q.trim().length > 0) {
      query = query.ilike("name", `%${params.q.trim()}%`);
    }

    // 카테고리 다중 선택 필터
    if (params.category && params.category.length > 0) {
      query = query.in("category", params.category);
    }

    // 활동 빈도 다중 선택 필터
    if (params.frequency && params.frequency.length > 0) {
      query = query.in("activity_frequency", params.frequency);
    }

    // 정렬 4종 적용
    if (params.sort === "recent") {
      // 최근 등록 순 — created_at 내림차순
      query = query.order("created_at", { ascending: false });
    } else if (params.sort === "alphabetical") {
      // 가나다(ABC)순 — name 오름차순
      query = query.order("name", { ascending: true });
    } else if (params.sort === "large") {
      // 대규모 우선 — member_band 내림차순, null(미설정) 은 마지막
      query = query.order("member_band", { ascending: false, nullsFirst: false });
    } else {
      // 기본: 인기순 — view_count 내림차순 (popular 또는 미지정)
      query = query.order("view_count", { ascending: false });
    }

    // 페이지네이션 적용
    query = query.range(start, end);

    const { data, error, count } = await query;

    if (error) {
      console.error("[searchPublicCircles]", error.message);
      return { circles: [], total: 0, totalPages: 1 };
    }

    const circles = (data ?? []).map((row: Record<string, unknown>) => toCircleSummary(row));
    const total = count ?? circles.length;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    return { circles, total, totalPages };
  },
  // cache key 배열 — 파라미터를 JSON 직렬화해 포함시켜 파라미터 조합별 독립 캐시 엔트리 보장
  // unstable_cache 는 두 번째 인자 keyParts + 함수 인자 조합으로 캐시를 구분한다.
  ["circles:public:search"],
  // tags: T-010 운영자 mutation 시 revalidateTag("circles:public") 로 즉시 무효화
  { tags: ["circles:public"], revalidate: 300 }
);

/**
 * さがす 검색 페이지용 공개 서클 검색 (public export).
 *
 * 내부의 _searchPublicCirclesRaw 를 그대로 re-export 한다.
 * unstable_cache 는 함수 인자(params)를 포함해 캐시 키를 생성하므로
 * 파라미터 조합이 다르면 별도 엔트리로 저장된다.
 */
export const searchPublicCircles = _searchPublicCirclesRaw;
