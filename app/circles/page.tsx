import { ComingSoon } from "@/components/layout/coming-soon";

// Phase 1.1 T-011 에서 카테고리 탭·필터·카드 그리드로 실제 구현 예정
// 그 때 searchParams 사용으로 Suspense 경계 추가 필요
export default function CirclesPage() {
  return (
    <ComingSoon
      title="サークル一覧"
      description="カテゴリやタグで慶應公認サークルを検索できる一覧ページ"
      plannedPhase="Phase 1.1 (T-011)"
    />
  );
}
