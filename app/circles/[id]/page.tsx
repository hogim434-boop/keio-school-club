import { ComingSoon } from "@/components/layout/coming-soon";

// Phase 1.1 T-012 에서 갤러리·태그·요약 카드·F012 「参加する」 모달로 실제 구현 예정
// 그 때 동적 [id] 파라미터 fetch 로 Suspense 경계 추가 필요
export default function CircleDetailPage() {
  return (
    <ComingSoon
      title="サークル詳細"
      description="サークルの活動内容・連絡先・ギャラリーを確認できる詳細ページ"
      plannedPhase="Phase 1.1 (T-012)"
    />
  );
}
