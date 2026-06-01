import { Skeleton } from "@/components/ui/skeleton";

/**
 * EventDetailSkeleton — 이벤트 상세 페이지 로딩 스켈레톤.
 *
 * app/events/[id]/page.tsx 의 Suspense fallback 에서 사용.
 * 실제 페이지 레이아웃(Hero 16:9 + 메타 그리드 + 설명 + 서클 링크)와 일치시킨다.
 *
 * 주의: <main> 패딩은 호출처(page.tsx)가 담당. 이 컴포넌트는 내용만 렌더.
 */
export function EventDetailSkeleton() {
  return (
    <article className="space-y-6">
      {/* 히어로 커버 — 16:9 */}
      <Skeleton className="aspect-[16/9] w-full md:aspect-[21/9]" />

      <div className="container mx-auto max-w-2xl space-y-6 px-4">
        {/* 헤더 — 카테고리 배지 + 제목 */}
        <div className="space-y-2">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-7 w-4/5" />
        </div>

        {/* 메타 그리드 — 4행 */}
        <div className="divide-border divide-y">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
              <Skeleton className="size-5 w-6 shrink-0 rounded" />
              <div className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-4 w-36" />
              </div>
            </div>
          ))}
        </div>

        {/* 설명 */}
        <Skeleton className="h-24 w-full" />

        {/* 서클 링크 카드 */}
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
    </article>
  );
}
