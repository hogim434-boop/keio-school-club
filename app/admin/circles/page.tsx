import { ComingSoon } from "@/components/layout/coming-soon";

// Phase 1.4 T-019 에서 pending 큐 + 公式名簿 대조 + 승인/거절 + 이메일 알림 트리거로 실제 구현 예정
// role='admin' 사전 가드는 T-006 의 is_admin() RPC 도입 후 추가
export default function AdminCirclesPage() {
  return (
    <ComingSoon
      title="承認管理"
      description="管理者が pending サークル登録申請を確認し、承認または却下"
      plannedPhase="Phase 1.4 (T-019)"
    />
  );
}
