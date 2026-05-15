import { Suspense } from "react";

import { SearchPageBody } from "@/components/search/search-page-body";
import { SearchPageHeader } from "@/components/search/search-page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { parseCirclesSearchParams } from "@/lib/circles/search-params";

interface SearchPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * 검색 페이지 (RSC) — 당근앱 패턴 + 다중 선택 + sticky 「適用」.
 *
 * 구조:
 * - SearchPageHeader (Client): sticky 검색 input (q 입력 → /circles?q=... navigate)
 * - SearchPageBody (Client): draft state 보유. RecentSearches + QuickFilters + SearchCategories + ApplyButton
 *
 * 칩 클릭은 draft 토글만 → 사용자가 여러 조건을 모은 후 하단 sticky 「適用」 한 번에 navigate.
 *
 * cacheComponents 호환: 본문 전체 Suspense 로 감싸 searchParams await 영역 보호.
 * key={JSON.stringify(initial)} — URL 외부 변경 시 SearchPageBody 리마운트로 draft 동기화.
 */
export default function SearchPage({ searchParams }: SearchPageProps) {
  return (
    <main className="pb-20 md:pb-12">
      <Suspense fallback={<SearchPageFallback />}>
        <SearchContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function SearchContent({ searchParams }: SearchPageProps) {
  const raw = await searchParams;
  const initial = parseCirclesSearchParams(raw);

  return (
    <>
      <SearchPageHeader initial={initial} />
      <SearchPageBody key={JSON.stringify(initial)} initial={initial} />
    </>
  );
}

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
