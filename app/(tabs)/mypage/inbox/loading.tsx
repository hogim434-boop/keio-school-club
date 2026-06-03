import { Skeleton } from "@/components/ui/skeleton";

/**
 * /mypage/inbox 라우트 진입 즉시 표시되는 스켈레톤 UI.
 *
 * 레이아웃:
 * - 페이지 헤더 (뒤로가기 + 타이틀)
 * - 스레드 카드 스켈레톤 × 5 (아이콘 원 + 본문 3줄)
 */
export default function MyInboxLoading() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-6">
      {/* ── 페이지 헤더 ── */}
      <div className="mb-6 flex items-center gap-3">
        <Skeleton className="size-8 rounded-md" />
        <Skeleton className="h-7 w-40" />
      </div>

      {/* ── 스레드 카드 스켈레톤 × 5 ── */}
      <div className="flex flex-col divide-y overflow-hidden rounded-xl border">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 px-4 py-4">
            {/* 아이콘 원 */}
            <Skeleton className="size-10 shrink-0 rounded-full" />

            {/* 본문 */}
            <div className="flex-1 space-y-2">
              {/* 상단: 동아리명 + 타임스탬프 */}
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-14" />
              </div>
              {/* 중단: 카테고리 배지 */}
              <Skeleton className="h-4 w-24 rounded-full" />
              {/* 하단: 메시지 미리보기 */}
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
