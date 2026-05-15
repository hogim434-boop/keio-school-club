import { Skeleton } from "@/components/ui/skeleton";

/**
 * /circles 라우트 진입 즉시 표시되는 loading UI.
 *
 * Next.js App Router 는 loading.tsx 를 자동 Suspense fallback 으로 감싸서
 * Link 클릭 시점에 표시 → 데이터 fetch 동안 화면 깜빡임 0.
 *
 * 디자인: 추천 모드와 결과 모드 양쪽을 커버하는 카드 그리드 skeleton
 * (page.tsx 의 `CirclesPageFallback` 과 동일 톤, sticky 영역 제거됨).
 */
export default function CirclesLoading() {
  return (
    <main className="pb-20 md:pb-12">
      <div className="container mx-auto max-w-6xl space-y-8 px-4 py-6">
        {/* 셔플 진입 카드 placeholder */}
        <Skeleton className="h-20 w-full rounded-2xl" />

        {/* 가로 strip 2개 (人気·新着) placeholder — 모바일 가로 스크롤 톤 */}
        {[0, 1].map((i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-6 w-32" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, j) => (
                <Skeleton key={j} className="aspect-[16/9] w-full rounded-xl" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
