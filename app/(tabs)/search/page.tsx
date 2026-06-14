import { Suspense } from "react";

import { PageTransition } from "@/components/layout/page-transition";
import { SearchPageBody } from "@/components/search/search-page-body";
import { SearchPageHeader } from "@/components/search/search-page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { parseCirclesSearchParams } from "@/lib/circles/search-params";

interface SearchPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * 검색 페이지 (RSC) — 「필터/검색 UI」 전용. 결과는 항상 /circles 에서 표시한다.
 *
 * 구조:
 *   - SearchPageHeader (Client): sticky 검색 input (검색어는 여기서 유지)
 *   - SearchPageBody (Client): RecentSearches + QuickFilters + SearchCategories + ApplyButton
 *
 * ⚠️ 단일 모드인 이유:
 *   과거에는 q 가 있으면 /search 에서 인라인 결과 리스트(result mode)를 띄웠는데,
 *   결과 페이지(/circles)에서 「絞り込みを編集」로 돌아오면 필터가 아니라 리스트가 보여
 *   "필터로 돌아가려는데 리스트가 뜨는" 문제가 있었다. 이제 /search 는 q 유무와 무관하게
 *   항상 필터 UI를 보여주고(검색어는 입력창에 유지), 「サークルを見る」로 /circles 결과로 이동한다.
 *
 * cacheComponents 호환:
 * - 부모에서 searchParams 를 미리 await → page 자체를 dynamic 으로 명시
 * - Suspense 에 key={JSON.stringify(raw)} → searchParams 변경 시 자식 강제 리마운트
 *   (stale RSC payload 재사용으로 「이전 필터로 검색 페이지 진입」 버그 차단)
 */
export default async function SearchPage({ searchParams }: SearchPageProps) {
  // 부모에서 await — page 자체를 dynamic 으로 만들어 cacheComponents 경계 명시
  const raw = await searchParams;

  return (
    // div 사용 — (tabs)/layout.tsx 가 이미 <main> 으로 감싸므로 page 본체는 div.
    //   중첩 <main> 은 HTML 표준 위반 + 진입 시 layout 재계산으로 sub-pixel jitter 발생.
    // overflow-x-clip — SearchCategories 의 음수 마진 가로 캐러셀이 페이지 자체 가로 스크롤로
    //   전파되는 걸 차단. clip 은 scroll container 를 만들지 않아 stacking context 영향 X.
    // pb-20 md:pb-12 — sticky CTA 영역 확보.
    <div className="overflow-x-clip pb-20 md:pb-12">
      {/* key — searchParams 가 변경되면 Suspense 자식이 강제 리마운트되어
          새 RSC payload 로 평가됨. cacheComponents 환경에서 stale 결과 차단. */}
      <Suspense key={JSON.stringify(raw)} fallback={<SearchPageFallback />}>
        {/* PageTransition 을 Suspense 「내부」에 배치 — SearchContent 가 suspend 중일 땐
            fallback(스켈레톤)만 보이고, 데이터가 준비돼 SearchContent 가 마운트되는 순간
            PageTransition 도 함께 마운트되며 페이드인이 재생된다. (mode="fade": opacity 전용,
            하단 fixed 「サークルを見る」 버튼이 딸려 움직이지 않도록 transform 미사용) */}
        <PageTransition mode="fade">
          <SearchContent raw={raw} />
        </PageTransition>
      </Suspense>
    </div>
  );
}

async function SearchContent({ raw }: { raw: Record<string, string | string[] | undefined> }) {
  const initial = parseCirclesSearchParams(raw);

  // /search 는 항상 필터/검색 UI. q 가 있어도 입력창에 유지된 채 필터를 편집할 수 있고,
  // 「サークルを見る」(ApplyButton) 로 /circles 결과 페이지로 이동한다.
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
 * 페이지 전체 로딩 fallback — 검색 입력 영역 + 필터/카테고리 스켈레톤.
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
