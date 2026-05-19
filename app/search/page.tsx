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
    // overflow-x-clip — SearchCategories 의 음수 마진 가로 캐러셀이 페이지 자체 가로 스크롤로
    // 전파되는 걸 차단. clip 은 scroll container 를 만들지 않아 stacking context 영향 X.
    // 자식 캐러셀(overflow-x-auto)의 자체 가로 스크롤은 그대로 동작.
    <main className="overflow-x-clip pb-20 md:pb-12">
      {/* key — searchParams 가 변경되면 Suspense 자식이 강제 리마운트되어
          새 RSC payload 로 평가됨. cacheComponents 환경에서 stale 결과 차단. */}
      <Suspense key={JSON.stringify(raw)} fallback={<SearchPageFallback />}>
        <SearchContent raw={raw} />
      </Suspense>
    </main>
  );
}

async function SearchContent({ raw }: { raw: Record<string, string | string[] | undefined> }) {
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
