import { Skeleton } from "@/components/ui/skeleton";

/**
 * /shuffle 라우트 진입 즉시 표시되는 loading UI.
 * 풀스크린 카드 1장 + 하단 좌우 액션 버튼 placeholder — 실제 SwipeDeck 마운트 직전의 윤곽.
 */
export default function ShuffleLoading() {
  return (
    <main className="min-h-dvh">
      <div className="relative mx-auto flex h-dvh max-w-md flex-col px-4 pb-32">
        {/* 헤더 영역 — 戻る 버튼 placeholder */}
        <header
          className="flex items-center"
          style={{
            paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)",
            paddingBottom: "0.75rem",
          }}
        >
          <Skeleton className="size-10 rounded-full" />
        </header>

        {/* 카드 영역 — 풀스크린 카드 1장 */}
        <div className="relative flex-1">
          <Skeleton className="absolute inset-0 rounded-3xl" />
        </div>

        {/* 좌우 액션 버튼 (✕ / ❤️) placeholder */}
        <div className="fixed inset-x-0 bottom-8 z-10 flex items-center justify-center gap-8">
          <Skeleton className="size-16 rounded-full" />
          <Skeleton className="size-16 rounded-full" />
        </div>
      </div>
    </main>
  );
}
