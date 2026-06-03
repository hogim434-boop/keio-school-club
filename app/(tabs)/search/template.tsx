"use client";

import { createContext, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { PageTransition } from "@/components/layout/page-transition";

/**
 * 검색 페이지 exit action — 「戻る」(history.back) 와 「適用」(forward navigate) 두 종류.
 *
 * - `{ kind: "back" }`: SearchPageHeader 의 「戻る」 버튼 → router.back()
 * - `{ kind: "navigate", url }`: ApplyButton 의 「適用」 → router.push(url)
 */
export type SearchExitAction = { kind: "back" } | { kind: "navigate"; url: string };

/**
 * 검색 페이지 exit 트리거 context — SearchPageHeader / ApplyButton 이 useContext 로 호출.
 * 트랜지션 없이 즉시 router.back() 또는 router.push() 호출.
 *
 * 시그니처 보존: 호출처 (search-page-header, apply-button) 무수정.
 */
export const SearchSlideOutContext = createContext<(action: SearchExitAction) => void>(() => {});

/**
 * 검색 페이지 template — 진입 페이드 전환 (PageTransition) + exit context 유지.
 *
 * 트랜지션 이력 (중요):
 * - 과거에는 iOS Push 「슬라이드(x축 이동)」 전환을 적용했으나, 「back / navigate」 두 종류
 *   exit 분기 + Suspense fallback(SearchPageFallback) swap 의 상호작용으로 진입 시
 *   「왼쪽 과도 슬라이드 → 우측 조정」 변칙 모션이 발생해 트랜지션을 완전 제거했었다.
 * - 이번에는 x축 슬라이드가 아닌 순수 페이드(PageTransition: opacity + y 8px, 300ms)만 적용한다.
 *   x축 이동이 없어 「왼쪽 과도 슬라이드」 변칙이 원천적으로 재현되지 않고, PageTransition 은
 *   exit 트랜지션이 없는 enter-only 라 fallback→content swap 시에도 m.div 인스턴스가 유지되어
 *   entry abort/race 가 발생하지 않는다. favorites / mypage / 캘린더 탭과 톤·duration 통일.
 *
 * exit 동선(SlideOutContext) 은 트랜지션 없이 즉시 이동 — 시그니처 보존, 호출처 무수정.
 * - 「戻る」 → router.back() 즉시
 * - 「適用」 → router.push(url) 즉시
 */
export default function SearchTemplate({ children }: { children: ReactNode }) {
  const router = useRouter();
  return (
    <SearchSlideOutContext.Provider
      value={(action) => {
        if (action.kind === "back") router.back();
        else router.push(action.url);
      }}
    >
      {/* mode="fade": 순수 opacity 페이드(transform 없음) — 하단 fixed 「サークルを見る」 버튼이
          페이드 재생 중 딸려 움직이지 않도록. y/scale 등 transform 계열 금지. */}
      <PageTransition mode="fade">{children}</PageTransition>
    </SearchSlideOutContext.Provider>
  );
}
