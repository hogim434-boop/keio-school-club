import { Skeleton } from "@/components/ui/skeleton";

/**
 * CircleDetailSkeleton — 상세 페이지(/circles/[id]) 로딩 스켈레톤.
 *
 * 라우트 진입 시 loading.tsx, 데이터 로딩 시 page.tsx 의 Suspense fallback 에서
 * **같은 컴포넌트**를 사용해 스켈레톤이 중간에 형태가 바뀌는 점프를 방지한다.
 * 실제 상세 레이아웃(CoverImage 16:9→21:9 + max-w-6xl + 헤더/탭/요약/개요/레포트)과 일치시킨다.
 *
 * 주의: <main> 패딩(pb-24 md:pb-28)은 호출처(loading.tsx / page.tsx)가 담당.
 * 이 컴포넌트는 그 안쪽 <article> 만 렌더한다.
 */
export function CircleDetailSkeleton() {
  return (
    <article className="space-y-6">
      {/* 커버 — 실제 CoverImage 와 동일 비율(16:9 → md 21:9) */}
      <Skeleton className="aspect-[16/9] w-full md:aspect-[21/9]" />

      <div className="container mx-auto max-w-6xl space-y-6 px-4">
        {/* 헤더 skeleton — 카테고리 배지 + 단체명 + 메타 */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-16" />
          </div>
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-5 w-1/3" />
        </div>

        {/* 탭 네비게이션 skeleton */}
        <div className="flex gap-4 border-b pb-0">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-16" />
        </div>

        {/* 요약 정보 5종 skeleton — divide-y 행 리스트와 일치 */}
        <div className="divide-border divide-y pt-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
              <Skeleton className="size-5 w-6 shrink-0 rounded" />
              <div className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          ))}
        </div>

        {/* 개요 skeleton */}
        <Skeleton className="h-20 w-full" />

        {/* 活動レポート 미리보기 캐러셀 skeleton — 정사각 카드 4개 */}
        <div className="space-y-3">
          <Skeleton className="h-6 w-32" />
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="w-36 shrink-0 space-y-2 md:w-44">
                <Skeleton className="aspect-square w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}
