import { ComingSoon } from "@/components/layout/coming-soon";

// Phase 1.3 T-016 에서 프로필·verified 뱃지·등록 서클 수 카드로 실제 구현 예정
// 그 때 cookies 기반 프로필 fetch 로 Suspense 경계 추가 필요
export default function MyPagePage() {
  return (
    <ComingSoon
      title="マイページ"
      description="プロフィールと keio_verified バッジを確認するアカウントハブ"
      plannedPhase="Phase 1.3 (T-016)"
    />
  );
}
