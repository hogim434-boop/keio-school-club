import { Skeleton } from "@/components/ui/skeleton";

/**
 * /notifications 라우트 진입 즉시 표시되는 loading UI.
 *
 * 현재 NotificationsPage 는 ComingSoon 컴포넌트(데이터 fetch 없음)를 렌더하므로
 * 실질적으로 이 loading.tsx 가 노출될 시간이 매우 짧다.
 * 그럼에도 라우트 전환 시 빈 화면 점프를 방지하기 위해 추가한다.
 *
 * 레이아웃: ComingSoon 컴포넌트의 카드 구조(아이콘 원 + 타이틀 + 배지)를 skeleton 으로 모사.
 */
export default function NotificationsLoading() {
  return (
    <main className="container mx-auto flex min-h-[calc(100vh-5rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6 rounded-xl border p-6 text-center">
        {/* 아이콘 원 */}
        <div className="flex flex-col items-center gap-3">
          <Skeleton className="size-12 rounded-full" />
          {/* 타이틀 */}
          <Skeleton className="h-8 w-32" />
          {/* 설명 */}
          <Skeleton className="h-4 w-64" />
        </div>
        {/* 배지 */}
        <div className="flex justify-center">
          <Skeleton className="h-6 w-36 rounded-full" />
        </div>
      </div>
    </main>
  );
}
