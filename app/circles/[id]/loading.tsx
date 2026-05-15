import { Skeleton } from "@/components/ui/skeleton";

/**
 * /circles/[id] 상세 페이지 라우트 진입 즉시 표시되는 loading UI.
 * 풀-블리드 cover 이미지 + 정보 패널 윤곽 skeleton — 메루카리·Airbnb 상세 페이지 톤.
 */
export default function CircleDetailLoading() {
  return (
    <main className="pb-24">
      {/* 풀-블리드 cover 영역 (16:9) */}
      <Skeleton className="aspect-video w-full rounded-none" />

      <div className="container mx-auto max-w-3xl space-y-6 px-4 py-6">
        {/* 카테고리 + 공인유형 배지 */}
        <div className="flex gap-2">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>

        {/* 단체명 + 메타 */}
        <div className="space-y-2">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>

        {/* 태그 칩 */}
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-16 rounded-full" />
          ))}
        </div>

        {/* 본문 단락 */}
        <div className="space-y-2 pt-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>

        {/* 갤러리 4장 */}
        <div className="grid grid-cols-2 gap-3 pt-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square w-full rounded-lg" />
          ))}
        </div>
      </div>
    </main>
  );
}
