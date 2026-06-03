/**
 * app/circles/[id]/dm/inbox/loading.tsx
 *
 * 인박스 페이지 진입 시 즉시 표시되는 스켈레톤 로딩 UI.
 *
 * page.tsx 의 Suspense fallback 과 동일한 구조를 사용해
 * 「loading.tsx → 실제 콘텐츠」 전환 시 레이아웃 점프(CLS)를 방지한다.
 */

import { Skeleton } from "@/components/ui/skeleton";

export default function DmInboxLoading() {
  return (
    <main className="container mx-auto max-w-2xl px-4 pt-6 pb-24">
      {/* 뒤로가기 링크 자리 */}
      <div className="mb-6">
        <Skeleton className="h-5 w-40 rounded-full" />
      </div>

      {/* 페이지 헤딩 자리 */}
      <div className="mb-6 space-y-2">
        <Skeleton className="h-8 w-32 rounded-lg" />
        <Skeleton className="h-4 w-52 rounded" />
      </div>

      {/* 스레드 카드 스켈레톤 5개 */}
      <div className="divide-y rounded-xl border">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 px-4 py-4">
            {/* 발신자 아이콘 */}
            <Skeleton className="size-10 shrink-0 rounded-full" />

            <div className="min-w-0 flex-1 space-y-2">
              {/* 발신자명 + 타임스탬프 */}
              <div className="flex items-center justify-between gap-2">
                <Skeleton className="h-4 w-24 rounded" />
                <Skeleton className="h-3 w-14 rounded" />
              </div>
              {/* 카테고리 + 상태 배지 */}
              <div className="flex gap-1.5">
                <Skeleton className="h-4 w-20 rounded-full" />
                <Skeleton className="h-4 w-14 rounded-full" />
              </div>
              {/* 미리보기 텍스트 */}
              <Skeleton className="h-3 w-3/4 rounded" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
