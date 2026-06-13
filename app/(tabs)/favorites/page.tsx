import { PullToRefresh } from "@/components/layout/pull-to-refresh";
import { FavoritesPageBody } from "@/components/favorites/favorites-page-body";

/**
 * 즐겨찾기 페이지 (T-017) — 게스트 localStorage(`kc:favorites`) 기반.
 *
 * 클라이언트 주도(localStorage 읽기 → 서버 액션 `getFavoriteCircles` 로 서클 fetch)라
 * 본문은 Client Component(FavoritesPageBody)로 분리한다.
 * 글로벌 헤더/하단탭은 노출 유지(인증 페이지 아님). `/favorites` 는 isPublicPath 공개.
 *
 * PullToRefresh: 서버 컴포넌트에서 클라이언트 래퍼로 감싸 PTR 제스처 활성화.
 * FavoritesPageBody(Client)는 children으로 전달 — 기존 motion 애니메이션 유지.
 */
export default function FavoritesPage() {
  return (
    <PullToRefresh>
      <FavoritesPageBody />
    </PullToRefresh>
  );
}
