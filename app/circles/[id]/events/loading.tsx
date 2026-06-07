/**
 * app/circles/[id]/events/loading.tsx
 *
 * 이벤트 관리 목록 진입 즉시 보이는 스켈레톤 (cacheComponents OFF 정책).
 * page.tsx 의 실제 레이아웃(뒤로가기 + 헤더 + 카드 목록)과 높이를 맞춰 점프를 방지한다.
 */

import { Skeleton } from "@/components/ui/skeleton";

export default function EventListLoading() {
  return (
    <main className="container mx-auto max-w-2xl px-4 pt-6 pb-24">
      {/* 뒤로가기 */}
      <div className="mb-6">
        <Skeleton className="h-4 w-48" />
      </div>

      {/* 헤더: 타이틀 + 작성 버튼 */}
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-10 w-20 shrink-0 rounded-md" />
      </div>

      {/* 카드 목록 */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-16" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-xl border p-4">
            <div className="flex items-start justify-between gap-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-5 w-12 rounded-full" />
            </div>
            <Skeleton className="h-3 w-48" />
            <Skeleton className="h-3 w-32" />
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-9 w-full rounded-md" />
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
