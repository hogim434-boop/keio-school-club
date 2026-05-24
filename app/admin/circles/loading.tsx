/**
 * /admin/circles 진입 시 즉시 표시되는 스켈레톤 (cacheComponents OFF + loading.tsx 정책).
 * 실제 큐(page.tsx)가 pending 목록을 서버에서 가져오는 동안 레이아웃 골격을 먼저 보여준다.
 */
export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6">
      <header className="mb-4 space-y-2">
        <div className="bg-muted h-6 w-32 animate-pulse rounded" />
        <div className="bg-muted h-4 w-64 animate-pulse rounded" />
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-xl border p-4">
            <div className="flex gap-3">
              <div className="bg-muted size-16 shrink-0 animate-pulse rounded-md" />
              <div className="flex-1 space-y-2 py-1">
                <div className="bg-muted h-4 w-3/4 animate-pulse rounded" />
                <div className="bg-muted h-3 w-1/2 animate-pulse rounded" />
                <div className="bg-muted h-3 w-2/5 animate-pulse rounded" />
              </div>
            </div>
            <div className="bg-muted h-4 w-2/3 animate-pulse rounded" />
            <div className="flex gap-2 pt-1">
              <div className="bg-muted h-9 flex-1 animate-pulse rounded-md" />
              <div className="bg-muted h-9 flex-1 animate-pulse rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
