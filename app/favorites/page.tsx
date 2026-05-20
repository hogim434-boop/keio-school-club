import { FavoritesPageBody } from "@/components/favorites/favorites-page-body";

/**
 * 즐겨찾기 페이지 (T-017) — 게스트 localStorage(`kc:favorites`) 기반.
 *
 * 클라이언트 주도(localStorage 읽기 → 서버 액션 `getFavoriteCircles` 로 서클 fetch)라
 * 본문은 Client Component(FavoritesPageBody)로 분리한다.
 * 글로벌 헤더/하단탭은 노출 유지(인증 페이지 아님). `/favorites` 는 isPublicPath 공개.
 */
export default function FavoritesPage() {
  return <FavoritesPageBody />;
}
