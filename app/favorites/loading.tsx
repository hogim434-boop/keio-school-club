import { Skeleton } from "@/components/ui/skeleton";

/**
 * /favorites 라우트 진입 즉시 표시되는 loading UI.
 *
 * FavoritesPageBody(Client Component) 는 마운트 후 localStorage를 읽어 fetch하므로
 * 서버 렌더 시점에는 아무것도 표시되지 않는다.
 * loading.tsx 를 추가해 라우트 전환 직후 카드 그리드 윤곽을 즉시 보여준다.
 *
 * 레이아웃: max-w-6xl 컨테이너
 *   - 헤더: 타이틀 + 건수 자리
 *   - 2열 카드 그리드 (FavoritesPageBody 의 showSkeleton 분기와 동일 톤)
 *     카드: 4:3 커버 + 카테고리 배지 줄 + 서클명 줄
 */
export default function FavoritesLoading() {
  return (
    <div className="container mx-auto max-w-6xl space-y-4 px-4 py-6">
      {/* 헤더: 타이틀 + 건수 자리 */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-5 w-8" />
      </div>

      {/* 카드 그리드 — 2열 기본, sm: 3열, xl: 4열 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2">
            {/* 카드 커버 이미지 자리 (4:3 비율) */}
            <Skeleton className="aspect-[4/3] w-full rounded-xl" />
            {/* 카테고리 배지 자리 */}
            <Skeleton className="h-4 w-16 rounded" />
            {/* 서클명 자리 */}
            <Skeleton className="h-4 w-3/4 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
