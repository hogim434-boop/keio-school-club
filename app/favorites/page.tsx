import { ComingSoon } from "@/components/layout/coming-soon";

// Phase 1.3 T-017 에서 favorites 테이블 fetch + 비교 송출로 실제 구현 예정
// 그 때 로그인 사용자 fetch 로 Suspense 경계 추가 필요
export default function FavoritesPage() {
  return (
    <ComingSoon
      title="お気に入り"
      description="気になるサークルを保存し、後で比較するためのページ"
      plannedPhase="Phase 1.3 (T-017)"
    />
  );
}
