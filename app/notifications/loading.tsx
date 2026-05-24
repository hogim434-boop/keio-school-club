/**
 * /notifications 진입 시 즉시 표시되는 스켈레톤.
 * cacheComponents OFF + loading.tsx 정책에 따라 서버에서 getFeed()를 가져오는
 * 동안 리스트 골격을 먼저 보여준다.
 */
export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6">
      {/* 헤더 스켈레톤 */}
      <header className="mb-5 space-y-2">
        <div className="bg-muted h-6 w-24 animate-pulse rounded" />
        <div className="bg-muted h-4 w-56 animate-pulse rounded" />
      </header>

      {/* 알림 행 스켈레톤 — 5줄 */}
      <div className="rounded-xl border">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 border-b px-4 py-3.5 last:border-b-0">
            {/* 안읽음 점 자리 */}
            <div className="w-3 shrink-0 pt-1.5" />

            {/* 아이콘 원형 */}
            <div className="bg-muted size-9 shrink-0 animate-pulse rounded-full" />

            {/* 텍스트 영역 */}
            <div className="flex-1 space-y-1.5 py-0.5">
              <div className="bg-muted h-4 w-3/4 animate-pulse rounded" />
              {/* 본문 줄: 짝수 행에만 표시해 자연스럽게 */}
              {i % 2 === 0 && <div className="bg-muted h-3 w-5/6 animate-pulse rounded" />}
              <div className="bg-muted h-3 w-16 animate-pulse rounded" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
