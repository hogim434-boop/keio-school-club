import { ComingSoon } from "@/components/layout/coming-soon";

// Phase 1.4 T-019 에서 pending 큐 + 公式名簿 대조 + 승인/거절 + 이메일 알림 트리거로 실제 구현 예정
// role='admin' 가드는 상위 app/admin/layout.tsx 의 AdminGuard 에서 처리 — 본 page 도달 시점에 이미 admin 검증 완료
export default function AdminCirclesPage() {
  return (
    <ComingSoon
      title="承認管理"
      description="管理者が pending サークル登録申請を確認し、承認または却下"
      plannedPhase="Phase 1.4 (T-019)"
    />
  );
}
