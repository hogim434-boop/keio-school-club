import { Skeleton } from "@/components/ui/skeleton";

/**
 * /search 라우트 진입 즉시 표시되는 loading UI.
 * page.tsx 의 `SearchPageFallback` 과 동일 톤 — sticky 검색 input + 카테고리 그리드 윤곽.
 */
export default function SearchLoading() {
  return (
    <main className="overflow-x-clip pb-20 md:pb-12">
      {/* sticky 검색 input 영역 */}
      <header className="bg-background sticky top-0 z-30">
        <div className="container mx-auto flex max-w-6xl items-center gap-2 px-4 py-3">
          <Skeleton className="size-9 rounded-full" />
          <Skeleton className="h-10 flex-1 rounded-full" />
        </div>
      </header>

      <div className="container mx-auto max-w-6xl space-y-6 px-4 py-5">
        {/* QuickFilters 칩 줄 */}
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-20 shrink-0 rounded-full" />
          ))}
        </div>

        {/* 카테고리 그리드 — 3×2 페이지 1장 톤 */}
        <Skeleton className="h-9 w-32" />
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <Skeleton className="size-14 rounded-full" />
              <Skeleton className="h-3 w-12" />
            </div>
          ))}
        </div>

        {/* sticky 「適用」 버튼 placeholder */}
        <Skeleton className="h-12 w-full rounded-full" />
      </div>
    </main>
  );
}
