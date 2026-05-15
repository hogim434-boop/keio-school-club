import { ComingSoon } from "@/components/layout/coming-soon";

/**
 * お知らせ 페이지 — 헤더의 Bell 아이콘 클릭 시 진입.
 * Phase 2 에서 notifications 테이블 + 실시간 구독으로 실제 알림 리스트 구현 예정.
 */
export default function NotificationsPage() {
  return (
    <ComingSoon
      title="お知らせ"
      description="新しいサークル情報や参加申し込みの通知をお届けします"
      plannedPhase="Phase 2"
    />
  );
}
