import { Skeleton } from "@/components/ui/skeleton";

/**
 * /circles/[id]/reports/[reportId] 라우트 진입 즉시 표시되는 loading UI.
 *
 * page.tsx 의 `ReportDetailFallback` Suspense fallback 과 동일한 마크업을 그대로 사용.
 * Next.js App Router 는 loading.tsx 를 자동 Suspense fallback 으로 래핑하므로
 * 링크 클릭 시점에 바로 표시되어 데이터 fetch 동안 빈 화면이 나타나지 않는다.
 *
 * 레이아웃: max-w-3xl 컨테이너 + pt-16 (floating 뒤로가기 버튼 여백)
 *   - 메타 행 (배지 + 날짜) skeleton
 *   - 제목 skeleton
 *   - 장소 skeleton
 *   - 사진 갤러리 skeleton (3장)
 *   - 본문 텍스트 skeleton (5줄)
 */
export default function ReportDetailLoading() {
  return (
    <main className="pb-12">
      <article className="space-y-6">
        {/* floating 뒤로가기는 작아서 skeleton 불필요 */}
        <div className="container mx-auto max-w-3xl space-y-6 px-4 pt-16">
          {/* 메타 + 제목 + 장소 skeleton */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-14" />
            </div>
            <Skeleton className="h-9 w-3/4" />
            <Skeleton className="h-5 w-1/2" />
          </div>

          {/* 갤러리 skeleton — 3장 */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square w-full" />
            ))}
          </div>

          {/* 본문 skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </article>
    </main>
  );
}
