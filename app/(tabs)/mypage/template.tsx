import { PageTransition } from "@/components/layout/page-transition";

/**
 * マイページ 진입 전환 — 순수 opacity 페이드(mode="fade").
 *
 * fade-up(y 이동)의 transform 이 Next.js 라우트 전환의 「맨 위로 스크롤」 리셋과
 * 간헐적으로 충돌해, 이전 페이지 스크롤 위치가 유지되는 버그를 유발한다.
 * transform 없는 fade 로 통일.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <PageTransition mode="fade">{children}</PageTransition>;
}
