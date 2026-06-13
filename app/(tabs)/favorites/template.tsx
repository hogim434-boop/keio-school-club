import { PageTransition } from "@/components/layout/page-transition";

/**
 * お気に入り 페이지 진입 전환 — 순수 opacity 페이드(mode="fade").
 *
 * fade-up(y 이동)은 페이지 전체를 감싸는 조상에 transform 을 만들어,
 * Next.js 라우트 전환의 「맨 위로 스크롤」 리셋과 간헐적으로 충돌한다
 * (이전 페이지 스크롤 위치가 유지된 채 표시되는 버그). transform 없는 fade 로 통일.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <PageTransition mode="fade">{children}</PageTransition>;
}
