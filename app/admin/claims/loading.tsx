/**
 * /admin/claims 진입 시 즉시 표시되는 스켈레톤 (cacheComponents OFF + loading.tsx 정책).
 */
export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6">
      <header className="mb-4 space-y-2">
        <div className="bg-muted h-6 w-40 animate-pulse rounded" />
        <div className="bg-muted h-4 w-72 animate-pulse rounded" />
      </header>

      <ul className="divide-y rounded-xl border">
        {Array.from({ length: 3 }).map((_, i) => (
          <li key={i} className="space-y-3 p-4">
            <div className="flex items-center gap-2">
              <div className="bg-muted h-5 w-20 animate-pulse rounded-full" />
              <div className="bg-muted h-4 w-32 animate-pulse rounded" />
            </div>
            <div className="bg-muted h-16 animate-pulse rounded-md" />
            <div className="flex items-center justify-between">
              <div className="bg-muted h-3 w-24 animate-pulse rounded" />
              <div className="flex gap-2">
                <div className="bg-muted h-8 w-16 animate-pulse rounded-md" />
                <div className="bg-muted h-8 w-16 animate-pulse rounded-md" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
