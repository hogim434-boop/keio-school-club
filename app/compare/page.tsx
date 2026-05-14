import { ComingSoon } from "@/components/layout/coming-soon";

// Phase 2 T-024 에서 최대 3개 서클을 횡열 비교 테이블로 실제 구현 예정
// 그 때 ?ids= 쿼리 fetch 로 Suspense 경계 추가 필요
export default function ComparePage() {
  return (
    <ComingSoon
      title="比較"
      description="お気に入りから選んだサークルを最大 3 件まで横並びで比較"
      plannedPhase="Phase 2 (T-024)"
    />
  );
}
