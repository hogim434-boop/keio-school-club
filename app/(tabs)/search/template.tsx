"use client";

import { createContext, type ReactNode } from "react";
import { useRouter } from "next/navigation";

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
 * 검색 페이지 template — exit context 만 제공 (진입 페이드는 콘텐츠 쪽으로 이동).
 *
 * ⚠️ 진입 페이드를 여기(template)에 두면 「스켈레톤」에만 재생되는 문제:
 *   네비게이션 시점에 이 m.div 가 마운트될 때 자식은 loading.tsx / SearchPageFallback(스켈레톤)
 *   이므로 페이드가 스켈레톤에 소비되고, 실제 콘텐츠는 fallback→content swap 으로 그냥 "툭" 교체됨.
 *   → 페이드인 체감이 사라진다.
 *   해결: PageTransition 을 page.tsx 의 Suspense **내부**(SearchContent 래핑)로 옮겨,
 *        실제 콘텐츠가 마운트되는 순간에 페이드가 재생되도록 한다.
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
      {children}
    </SearchSlideOutContext.Provider>
  );
}
