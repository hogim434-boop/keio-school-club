import { Suspense } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";

import { CircleCard } from "@/components/circles/circle-card";
import { CirclesPageShell } from "@/components/circles/circles-page-shell";
import { FilterPanel } from "@/components/circles/filter-panel";
import { HorizontalCircleStrip } from "@/components/circles/horizontal-circle-strip";
import { Button } from "@/components/ui/button";
import { Emoji } from "@/components/ui/emoji";
import { Skeleton } from "@/components/ui/skeleton";
import {
  buildCirclesUrl,
  buildSearchUrl,
  countAppliedFilters,
  type CirclesSearchParams,
  isDiscoverMode,
  parseCirclesSearchParams,
} from "@/lib/circles/search-params";
import { filterCircles, getPopularCircles, getRecentCircles } from "@/lib/dummy/circles";

interface CirclesPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * 서클 통합 페이지 (RSC) — 추천 모드 + 결과 모드 분기.
 *
 * - 추천 모드: 필터가 모두 기본값일 때 → 人気 strip + 新着 strip
 * - 결과 모드: 검색어/카테고리/필터 중 하나라도 활성 → (데스크탑) 사이드바 + (모바일) 「絞り込みを編集」 + 카드 그리드 + 페이지네이션
 *
 * 검색·필터·카테고리 진입은 /search 페이지로 일원화 (당근앱 패턴, PR3 분리).
 * 헤더의 🔍 아이콘 또는 결과 모드의 「絞り込みを編集」 링크로 진입.
 *
 * cacheComponents 호환: 본문 전체를 Suspense 로 감싸 searchParams await 영역 보호.
 */
export default function CirclesPage({ searchParams }: CirclesPageProps) {
  return (
    <main className="pb-20 md:pb-12">
      {/* iOS Push entry — search 의 좌측 슬라이드 아웃과 짝맞춤. 자세한 톤은 shell 주석 참조. */}
      <CirclesPageShell>
        <Suspense fallback={<CirclesPageFallback />}>
          <CirclesContent searchParams={searchParams} />
        </Suspense>
      </CirclesPageShell>
    </main>
  );
}

/** 실제 본문 — searchParams await 후 모드 분기 수행 */
async function CirclesContent({ searchParams }: CirclesPageProps) {
  const raw = await searchParams;
  const params = parseCirclesSearchParams(raw);
  const discover = isDiscoverMode(params);

  return discover ? <DiscoverContent /> : <SearchResults params={params} />;
}

/**
 * 추천 모드 본문 — 人気 strip + 新着 strip.
 * 카테고리 탭은 /search 페이지로 이양. 사용자가 카테고리별 탐색을 원하면 헤더 🔍 → 카테고리 그리드.
 */
async function DiscoverContent() {
  const [popular, recent] = await Promise.all([getPopularCircles(6), getRecentCircles(6)]);

  return (
    <div className="container mx-auto max-w-6xl space-y-8 px-4 py-6">
      {/* 셔플 디스커버리 진입 카드 — 인기 강조 회피 + serendipity 강화 동선.
          기존 strip 들과 독립된 큰 entry point 으로 노출 */}
      <Link
        href="/shuffle"
        className="bg-keio-navy text-keio-navy-foreground hover:bg-keio-navy/90 focus-visible:ring-ring group flex items-center gap-4 rounded-2xl p-5 shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        <Emoji name="party-popper" size={40} />
        <div className="flex-1">
          <h2 className="text-lg font-semibold">シャッフルで探す</h2>
          <p className="text-sm opacity-80">気軽にサークルを発見</p>
        </div>
        <ChevronRight
          className="size-5 transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </Link>

      <HorizontalCircleStrip title="人気のサークル" circles={popular} />
      <HorizontalCircleStrip title="新着のサークル" circles={recent} />
    </div>
  );
}

/**
 * 결과 모드 본문 — 사이드바(lg+) + filterCircles 결과 + 페이지네이션.
 * 모바일에서는 Results 내부 상단에 「N件 + 絞り込みを編集」 한 줄 노출 (당근앱 패턴).
 */
function SearchResults({ params }: { params: CirclesSearchParams }) {
  return (
    <div className="container mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[260px_1fr]">
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
 * 「絞り込みを編集」 칩 — 모바일 only (lg 사이드바 노출 시 중복 회피).
 * 결과 카운트 텍스트와 같은 줄에 좌우 배치되어 시선 흐름이 자연스러움.
 * 가벼운 outline chip 톤 — 페이지 본문이 메인이고 편집 진입은 보조 액션.
 */
function EditFiltersLink({ params }: { params: CirclesSearchParams }) {
  const count = countAppliedFilters(params);
  const searchUrl = buildSearchUrl(params);

  return (
    <Link
      href={searchUrl}
      className="border-border bg-background hover:bg-muted focus-visible:ring-ring inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs transition-colors focus-visible:ring-2 focus-visible:outline-none lg:hidden"
    >
      <SlidersHorizontal className="size-3.5" aria-hidden="true" />
      絞り込みを編集
      {count > 0 && (
        <span className="bg-foreground text-background ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold">
          {count}
        </span>
      )}
    </Link>
  );
}

/**
 * 결과 모드 상단 헤더 — 「N件のサークル」 (좌) + 「絞り込みを編集」 칩 (우, 모바일 only).
 * 한 행 좌우 배치로 카운트와 편집 진입점이 동선상 가까이 배치됨.
 */
function ResultsHeader({ total, params }: { total: number; params: CirclesSearchParams }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-muted-foreground text-sm">{total}件のサークル</p>
      <EditFiltersLink params={params} />
    </div>
  );
}

/** 결과 렌더 — filterCircles 호출 + CardGrid + Pagination + 빈 결과 */
async function Results({ params }: { params: CirclesSearchParams }) {
  const result = await filterCircles({
    q: params.q,
    category: params.category,
    frequency: params.frequency,
    officialType: params.officialType,
    tags: params.tags,
    feeMax: params.feeMax,
    page: params.page,
    activityDays: params.activityDays,
    memberSize: params.memberSize,
    recruitmentStatus: params.recruitmentStatus,
    activityTimeBand: params.activityTimeBand,
    sort: params.sort,
  });

  if (result.items.length === 0) {
    return (
      <div className="space-y-6">
        <ResultsHeader total={0} params={params} />
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ResultsHeader total={result.total} params={params} />
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

/** 페이지 전체 fallback — 카드 그리드 skeleton (sticky 영역 제거됨) */
function CirclesPageFallback() {
  return (
    <div className="container mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[260px_1fr]">
      <aside className="hidden lg:block">
        <Skeleton className="h-96 w-full" />
      </aside>
      <section className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[16/9] w-full" />
          ))}
        </div>
      </section>
    </div>
  );
}

/** 빈 결과 — 「該当するサークルがありません」 + 리셋 링크 */
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

/** 페이지네이션 — 「前へ / X / 次へ」, 다른 필터는 buildCirclesUrl 로 보존 */
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
