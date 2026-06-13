import { Suspense } from "react";
import Link from "next/link";

import { SearchPageBody } from "@/components/search/search-page-body";
import { SearchPageHeader } from "@/components/search/search-page-header";
import { CircleListCard } from "@/components/circles/circle-list-card";
import { Pager } from "@/components/circles/pager";
import { SortDropdown } from "@/components/search/sort-dropdown";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { buildSearchUrl, parseCirclesSearchParams } from "@/lib/circles/search-params";
import { searchPublicCircles } from "@/lib/supabase/queries/circles-public";

interface SearchPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * 검색 페이지 (RSC) — 당근앱 패턴 + 다중 선택 + sticky 「適用」 + 인라인 결과.
 *
 * 구조 (2가지 모드):
 *
 * [발견 모드] q 미입력, all=false:
 *   - SearchPageHeader (Client): sticky 검색 input
 *   - SearchPageBody (Client): RecentSearches + QuickFilters + SearchCategories + ApplyButton
 *
 * [결과 모드] q 입력 시:
 *   - SearchPageHeader (Client): sticky 검색 input
 *   - 인라인 결과: searchPublicCircles 호출 → CircleListCard 리스트 + 페이지네이션
 *   - 정렬 드롭다운 (SortDropdown): popular / recent / alphabetical / large 4종
 *   - 빈 상태: 「該当するサークル·部活動が見つかりませんでした」
 *
 * cacheComponents 호환:
 * - 부모에서 searchParams 를 미리 await → page 자체를 dynamic 으로 명시
 * - Suspense 에 key={JSON.stringify(raw)} → searchParams 변경 시 자식 강제 리마운트
 *   (stale RSC payload 재사용으로 「이전 필터로 검색 페이지 진입」 버그 차단)
 * - SearchPageBody 의 key 는 client draft 동기화용 (별개 목적, 그대로 유지)
 */
export default async function SearchPage({ searchParams }: SearchPageProps) {
  // 부모에서 await — page 자체를 dynamic 으로 만들어 cacheComponents 경계 명시
  const raw = await searchParams;

  return (
    // div 사용 — (tabs)/layout.tsx 가 이미 <main> 으로 감싸므로 page 본체는 div.
    //   중첩 <main> 은 HTML 표준 위반 + 진입 시 layout 재계산으로 sub-pixel jitter 발생
    //   → SearchTemplate 의 m.div entry 트랜지션이 작동 안 하는 회귀의 진짜 원인.
    // overflow-x-clip — SearchCategories 의 음수 마진 가로 캐러셀이 페이지 자체 가로 스크롤로
    //   전파되는 걸 차단. clip 은 scroll container 를 만들지 않아 stacking context 영향 X.
    //   자식 캐러셀(overflow-x-auto)의 자체 가로 스크롤은 그대로 동작.
    // pb-20 md:pb-12 — 이전 main 의 패딩 그대로 유지 (sticky CTA 영역 확보).
    <div className="overflow-x-clip pb-20 md:pb-12">
      {/* key — searchParams 가 변경되면 Suspense 자식이 강제 리마운트되어
          새 RSC payload 로 평가됨. cacheComponents 환경에서 stale 결과 차단. */}
      <Suspense key={JSON.stringify(raw)} fallback={<SearchPageFallback />}>
        <SearchContent raw={raw} />
      </Suspense>
    </div>
  );
}

async function SearchContent({ raw }: { raw: Record<string, string | string[] | undefined> }) {
  const initial = parseCirclesSearchParams(raw);

  // 결과 모드 판정 — q 가 있으면 인라인 결과 표시
  const isResultMode = Boolean(initial.q && initial.q.trim().length > 0);

  if (isResultMode) {
    // ── 결과 모드: 검색어 기반 인라인 결과 표시 ───────────────────────────────
    // "alphabetical" 은 CirclesSearchParams.sort allowlist 에 없어 parseCirclesSearchParams 에서
    // undefined 로 처리됨. raw 에서 직접 추출해 circles-public sort 로 연결.
    const sortRaw = Array.isArray(raw.sort) ? raw.sort[0] : raw.sort;
    const SEARCH_SORT_OPTIONS = ["popular", "recent", "alphabetical", "large"] as const;
    type SearchSort = (typeof SEARCH_SORT_OPTIONS)[number];
    const sortParam: SearchSort | undefined = SEARCH_SORT_OPTIONS.includes(sortRaw as SearchSort)
      ? (sortRaw as SearchSort)
      : (initial.sort ?? undefined);

    const { circles, total, totalPages } = await searchPublicCircles({
      q: initial.q,
      category: initial.category.length > 0 ? initial.category : undefined,
      frequency: initial.frequency.length > 0 ? initial.frequency : undefined,
      sort: sortParam,
      page: initial.page,
    });

    const currentPage = initial.page ?? 1;

    return (
      <>
        <SearchPageHeader initial={initial} />
        <div className="container mx-auto max-w-6xl px-4 py-4">
          {/* 결과 헤더 — 건수 + 정렬 드롭다운 */}
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-muted-foreground text-sm">
              {total > 0 ? (
                <>
                  <span className="text-foreground font-semibold">{total}</span>件のサークル·部活動
                </>
              ) : (
                "検索結果"
              )}
            </p>
            <SortDropdown currentSort={sortParam} initial={initial} />
          </div>

          {/* 결과 리스트 또는 빈 상태 */}
          {circles.length === 0 ? (
            <SearchEmptyState />
          ) : (
            <>
              <ul className="divide-border divide-y">
                {circles.map((circle) => (
                  <li key={circle.id}>
                    <CircleListCard circle={circle} />
                  </li>
                ))}
              </ul>

              {/* 페이지네이션 — 2페이지 이상일 때만 표시. 공통 Pager 컴포넌트 사용 */}
              {totalPages > 1 && (
                <Pager
                  current={currentPage}
                  totalPages={totalPages}
                  prevHref={
                    currentPage <= 1 ? null : buildSearchUrl({ ...initial, page: currentPage - 1 })
                  }
                  nextHref={
                    currentPage >= totalPages
                      ? null
                      : buildSearchUrl({ ...initial, page: currentPage + 1 })
                  }
                />
              )}
            </>
          )}
        </div>
      </>
    );
  }

  // ── 발견 모드: 기존 필터 선택 UI 표시 ────────────────────────────────────────
  return (
    <>
      <SearchPageHeader initial={initial} />
      <SearchPageBody key={JSON.stringify(initial)} initial={initial} />
    </>
  );
}

// ============================================================
// 서브 컴포넌트 (RSC)
// ============================================================

/**
 * 빈 검색 결과 — 「該当するサークル·部活動が見つかりませんでした」.
 * T-008 검증 기준 카피 적용.
 */
function SearchEmptyState() {
  return (
    <div className="py-20 text-center">
      <p className="text-muted-foreground mb-2 text-base font-medium">
        該当するサークル·部活動が見つかりませんでした
      </p>
      <p className="text-muted-foreground mb-6 text-sm">
        別のキーワードやフィルターをお試しください
      </p>
      <Button asChild variant="outline" size="sm">
        <Link href="/search">検索をリセット</Link>
      </Button>
    </div>
  );
}

/**
 * 페이지 전체 로딩 fallback — 검색 입력 영역 + 결과 스켈레톤.
 */
function SearchPageFallback() {
  return (
    <>
      <header className="bg-background sticky top-0 z-30">
        <div className="container mx-auto flex max-w-6xl items-center gap-2 px-4 py-3">
          <Skeleton className="size-9 rounded-full" />
          <Skeleton className="h-10 flex-1 rounded-full" />
        </div>
      </header>
      <div className="container mx-auto max-w-6xl space-y-6 px-4 py-5">
        <Skeleton className="h-9 w-32" />
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    </>
  );
}
