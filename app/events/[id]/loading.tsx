import { EventDetailSkeleton } from "@/components/event/event-detail-skeleton";

/**
 * /events/[id] 라우트 진입 즉시 표시되는 loading UI.
 *
 * page.tsx 의 Suspense fallback 과 동일한 EventDetailSkeleton 을 사용해,
 * 「loading.tsx → Suspense fallback → 실제」 전환 시 스켈레톤 형태가 바뀌는 점프를 없앤다.
 */
export default function EventDetailLoading() {
  return (
    <main className="pb-24 md:pb-16">
      <EventDetailSkeleton />
    </main>
  );
}
