import { Skeleton } from "@/components/ui/skeleton";

/**
 * /compare 라우트 진입 즉시 표시되는 loading UI.
 *
 * 현재 ComparePage 는 ComingSoon 컴포넌트(데이터 fetch 없음)를 렌더한다.
 * Phase 2(T-024) 에서 ?ids= 쿼리 fetch 로 실제 비교 테이블이 구현되면
 * 이 skeleton 을 비교 테이블 형태로 업데이트한다.
 *
 * 레이아웃: ComingSoon 카드 구조 skeleton (notifications/loading.tsx 와 동일 패턴).
 */
export default function CompareLoading() {
  return (
    <main className="container mx-auto flex min-h-[calc(100vh-5rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6 rounded-xl border p-6 text-center">
        {/* 아이콘 원 */}
        <div className="flex flex-col items-center gap-3">
          <Skeleton className="size-12 rounded-full" />
          {/* 타이틀 */}
          <Skeleton className="h-8 w-24" />
          {/* 설명 */}
          <Skeleton className="h-4 w-56" />
        </div>
        {/* 배지 */}
        <div className="flex justify-center">
          <Skeleton className="h-6 w-44 rounded-full" />
        </div>
      </div>
    </main>
  );
}
