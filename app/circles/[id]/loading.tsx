import { CircleDetailSkeleton } from "@/components/circles/circle-detail-skeleton";

/**
 * /circles/[id] 상세 페이지 라우트 진입 즉시 표시되는 loading UI.
 *
 * page.tsx 의 Suspense fallback(DetailFallback)과 **동일한 CircleDetailSkeleton** 을 사용해,
 * 「loading.tsx → page 내부 fallback → 실제」 전환 시 스켈레톤 형태가 바뀌는 점프를 없앤다.
 * <main> 패딩은 page.tsx 와 동일하게 맞춘다(pb-24 md:pb-28).
 */
export default function CircleDetailLoading() {
  return (
    <main className="pb-24 md:pb-28">
      <CircleDetailSkeleton />
    </main>
  );
}
