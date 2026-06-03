/**
 * /admin/inquiry-reports 진입 시 즉시 표시되는 스켈레톤 (T-031).
 *
 * cacheComponents OFF + loading.tsx 정책:
 * page.tsx 가 Supabase から신고 목록을 서버에서 가져오는 동안 레이아웃 골격을 먼저 보여준다.
 */
export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6">
      {/* 헤더 스켈레톤 */}
      <header className="mb-4 space-y-2">
        <div className="bg-muted h-6 w-36 animate-pulse rounded" />
        <div className="bg-muted h-4 w-64 animate-pulse rounded" />
        <div className="bg-muted h-4 w-48 animate-pulse rounded" />
      </header>

      {/* 목록 아이템 스켈레톤 */}
      <div className="divide-y rounded-xl border">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-3 p-4">
            {/* 상단: 뱃지 + 서클명 + 일시 */}
            <div className="flex items-center gap-2">
              <div className="bg-muted h-5 w-14 animate-pulse rounded-full" />
              <div className="bg-muted h-4 w-32 animate-pulse rounded" />
              <div className="bg-muted ml-auto h-3 w-28 animate-pulse rounded" />
            </div>
            {/* 신고된 메시지 영역 */}
            <div className="bg-muted/50 space-y-1.5 rounded-md px-3 py-2">
              <div className="bg-muted h-2.5 w-24 animate-pulse rounded" />
              <div className="bg-muted h-4 w-full animate-pulse rounded" />
              <div className="bg-muted h-4 w-3/4 animate-pulse rounded" />
            </div>
            {/* 신고 사유 */}
            <div className="space-y-1">
              <div className="bg-muted h-2.5 w-16 animate-pulse rounded" />
              <div className="bg-muted h-4 w-full animate-pulse rounded" />
            </div>
            {/* 하단: 신고자 + 해결 버튼 */}
            <div className="flex items-center justify-between pt-1">
              <div className="bg-muted h-3 w-32 animate-pulse rounded" />
              <div className="bg-muted h-7 w-28 animate-pulse rounded" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
