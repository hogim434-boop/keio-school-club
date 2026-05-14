import { ComingSoon } from "@/components/layout/coming-soon";

// Phase 1.3 T-016 에서 본인이 등록한 서클 status (審査中/公開中/却下) 표시로 실제 구현 예정
export default function MyCirclesPage() {
  return (
    <ComingSoon
      title="登録サークル管理"
      description="自分が登録したサークルの審査状況・拒否理由を確認"
      plannedPhase="Phase 1.3 (T-016)"
    />
  );
}
