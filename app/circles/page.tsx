import { Suspense } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";

import { CategoryTabs } from "@/components/circles/category-tabs";
import { CircleCard } from "@/components/circles/circle-card";
import { FilterPanel } from "@/components/circles/filter-panel";
import { FilterTrigger } from "@/components/circles/filter-trigger";
import { HorizontalCircleStrip } from "@/components/circles/horizontal-circle-strip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  buildCirclesUrl,
  type CirclesSearchParams,
  isDiscoverMode,
  parseCirclesSearchParams,
} from "@/lib/circles/search-params";
import { filterCircles, getPopularCircles, getRecentCircles } from "@/lib/dummy/circles";

interface CirclesPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * 서클 통합 페이지 (RSC) — 추천 모드 + 결과 모드 분기
 *
 * - 추천 모드: 필터가 모두 기본값일 때 → 人気 strip + 新着 strip + カテゴリ 그리드
 * - 결과 모드: 검색어/카테고리/필터 중 하나라도 활성 → 사이드바 + 카드 그리드 + 페이지네이션
 *
 * cacheComponents 호환: 본문 전체를 Suspense 로 감싸 searchParams await 영역 보호.
 */
export default function CirclesPage({ searchParams }: CirclesPageProps) {
  return (
    <main className="pb-20 md:pb-12">
      <Suspense fallback={<CirclesPageFallback />}>
        <CirclesContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

/**
 * 실제 본문 — searchParams await 후 모드 분기 수행
 */
async function CirclesContent({ searchParams }: CirclesPageProps) {
  const raw = await searchParams;
  const params = parseCirclesSearchParams(raw);
  const discover = isDiscoverMode(params);

  return (
    <>
      {/* 상단 sticky — 검색바 + 카테고리 탭 + 필터 트리거(결과 모드에서만) */}
      <section className="bg-background/80 supports-[backdrop-filter]:bg-background/60 sticky top-14 z-30 border-b backdrop-blur">
        <div className="container mx-auto max-w-6xl space-y-3 px-4 py-3">
          <SearchForm params={params} />
          <div className="flex items-center gap-2">
            <CategoryTabs
              activeCategory={params.category}
              baseSearchParams={params}
              className="flex-1"
            />
            {/* 필터 트리거 — 결과 모드에서만 노출 */}
            {!discover && <FilterTrigger initial={params} />}
          </div>
        </div>
      </section>

      {/* 모드 분기: 추천 모드 / 결과 모드 */}
      {discover ? <DiscoverContent /> : <SearchResults params={params} />}
    </>
  );
}

/**
 * 추천 모드 본문 — 人気 strip + 新着 strip + カテゴリ 그리드
 * 두 helper 를 Promise.all 로 병렬 fetch
 */
async function DiscoverContent() {
  const [popular, recent] = await Promise.all([getPopularCircles(6), getRecentCircles(6)]);

  return (
    <div className="container mx-auto max-w-6xl space-y-8 px-4 py-6">
      {/* 인기 단체 스트립 */}
      <HorizontalCircleStrip title="人気のサークル" circles={popular} />

      {/* 신착 단체 스트립 — 카테고리 진입은 sticky 영역의 CategoryTabs 가 담당 */}
      <HorizontalCircleStrip title="新着のサークル" circles={recent} />
    </div>
  );
}

/**
 * 결과 모드 본문 — 사이드바(lg+) + filterCircles 결과 + 페이지네이션
 * 기존 /circles 페이지의 결과 영역을 그대로 분리
 */
function SearchResults({ params }: { params: CirclesSearchParams }) {
  return (
    <div className="container mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[260px_1fr]">
      {/* 사이드바 필터 — lg 이상에서만 노출 */}
      <aside className="hidden lg:block">
        <FilterPanel key={JSON.stringify(params)} initial={params} mode="sidebar" />
      </aside>
      <section>
        <Results params={params} />
      </section>
    </div>
  );
}

/**
 * 검색 form — 다른 필터(category/tags 등) 는 hidden input 으로 보존하여 GET 제출 시 함께 전송
 */
function SearchForm({ params }: { params: CirclesSearchParams }) {
  return (
    <form action="/circles" className="relative">
      <Search
        aria-hidden="true"
        className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
      />
      <Input
        type="search"
        name="q"
        defaultValue={params.q ?? ""}
        placeholder="サークルを検索"
        aria-label="サークルを検索"
        className="pl-9"
      />
      {/* 다른 필터 보존 (검색 시 카테고리·필터 유지) */}
      {params.category && <input type="hidden" name="category" value={params.category} />}
      {params.frequency.length > 0 && (
        <input type="hidden" name="frequency" value={params.frequency.join(",")} />
      )}
      {params.officialType.length > 0 && (
        <input type="hidden" name="official_type" value={params.officialType.join(",")} />
      )}
      {params.tags.length > 0 && <input type="hidden" name="tags" value={params.tags.join(",")} />}
      {params.feeMax !== undefined && (
        <input type="hidden" name="fee_max" value={String(params.feeMax)} />
      )}
    </form>
  );
}

/**
 * 결과 렌더 — filterCircles 호출 + CardGrid + Pagination + 빈 결과
 */
async function Results({ params }: { params: CirclesSearchParams }) {
  const result = await filterCircles({
    q: params.q,
    category: params.category,
    frequency: params.frequency,
    officialType: params.officialType,
    tags: params.tags,
    feeMax: params.feeMax,
    page: params.page,
  });

  if (result.items.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground text-sm">{result.total}件のサークル</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {result.items.map((circle) => (
          <CircleCard key={circle.id} circle={circle} />
        ))}
      </div>
      {result.totalPages > 1 && (
        <Pagination
          current={result.page}
          totalPages={result.totalPages}
          baseSearchParams={params}
        />
      )}
    </div>
  );
}

/**
 * 페이지 전체 fallback — Suspense streaming 중 표시 (sticky 영역 + 카드 그리드 skeleton)
 */
function CirclesPageFallback() {
  return (
    <>
      <section className="bg-background sticky top-14 z-30 border-b">
        <div className="container mx-auto max-w-6xl space-y-3 px-4 py-3">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      </section>
      <div className="container mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block">
          <Skeleton className="h-96 w-full" />
        </aside>
        <section>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[16/9] w-full" />
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

/**
 * 빈 결과 — 「該当するサークルがありません」 + 리셋 링크
 */
function EmptyState() {
  return (
    <div className="py-16 text-center">
      <p className="text-muted-foreground mb-4">該当するサークルがありません</p>
      <Button asChild variant="outline" size="sm">
        <Link href="/circles">フィルターをリセット</Link>
      </Button>
    </div>
  );
}

/**
 * 페이지네이션 — 「前へ / X / 次へ」, 다른 필터는 buildCirclesUrl 로 보존
 */
function Pagination({
  current,
  totalPages,
  baseSearchParams,
}: {
  current: number;
  totalPages: number;
  baseSearchParams: CirclesSearchParams;
}) {
  const prevDisabled = current <= 1;
  const nextDisabled = current >= totalPages;

  return (
    <nav aria-label="ページネーション" className="flex items-center justify-center gap-2 pt-4">
      <Button asChild={!prevDisabled} variant="outline" size="sm" disabled={prevDisabled}>
        {prevDisabled ? (
          <span>
            <ChevronLeft className="size-4" />
            前へ
          </span>
        ) : (
          <Link href={buildCirclesUrl({ ...baseSearchParams, page: current - 1 })}>
            <ChevronLeft className="size-4" />
            前へ
          </Link>
        )}
      </Button>
      <span className="text-muted-foreground px-2 text-sm">
        {current} / {totalPages}
      </span>
      <Button asChild={!nextDisabled} variant="outline" size="sm" disabled={nextDisabled}>
        {nextDisabled ? (
          <span>
            次へ
            <ChevronRight className="size-4" />
          </span>
        ) : (
          <Link href={buildCirclesUrl({ ...baseSearchParams, page: current + 1 })}>
            次へ
            <ChevronRight className="size-4" />
          </Link>
        )}
      </Button>
    </nav>
  );
}
