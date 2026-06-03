import { PageTransition } from "@/components/layout/page-transition";

/**
 * 캘린더 페이지 진입 전환 — 순수 opacity 페이드(mode="fade").
 *
 * 캘린더 リスト 뷰에 `sticky top-0` 날짜 헤더가 있어, transform 을 만드는 fade-up(y 이동) 을
 * 쓰면 페이드 재생 중 sticky 기준이 흔들린다. 그래서 transform 없는 fade 모드(opacity only)로
 * 통일 — 검색 페이지와 동일한 톤·duration(0.6s).
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <PageTransition mode="fade">{children}</PageTransition>;
}
