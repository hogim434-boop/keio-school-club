"use client";

import { createContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { LazyMotion, domAnimation, m } from "motion/react";

/**
 * 검색 페이지 exit action — 「戻る」(history.back) 와 「適用」(forward navigate) 두 종류.
 *
 * - `{ kind: "back" }`: SearchPageHeader 의 「戻る」 버튼 → 우측으로 슬라이드 아웃 + history.back()
 * - `{ kind: "navigate", url }`: ApplyButton 의 「適用」 → 아래로 슬라이드 다운 (iOS modal dismiss) + router.push(url)
 */
export type SearchExitAction = { kind: "back" } | { kind: "navigate"; url: string };

/**
 * 검색 페이지 exit 트리거 context — SearchPageHeader / ApplyButton 이 useContext 로 호출.
 * 시그니처가 (action) 으로 통합되어 두 종류의 exit animation 을 분기 처리.
 */
export const SearchSlideOutContext = createContext<(action: SearchExitAction) => void>(() => {});

/**
 * 검색 페이지 전환 애니메이션 — iOS Push 패턴 (entry) + 두 종류 exit.
 *
 * Entry: 우측에서 슬라이드 인 + opacity fade (상세 페이지와 동일, iOS Push)
 * Exit (back): 우측으로 슬라이드 아웃 → history.back() (페이지 되돌리기)
 * Exit (navigate / 適用): 아래로 슬라이드 다운 + fade → router.push(결과 URL) (메루카리/Airbnb modal dismiss 패턴)
 *
 * STALE STATE 회피:
 * - mount 시 exitAction = null reset + calledRef = false
 * - onAnimationComplete 중복 호출 방지를 calledRef 로 guard (이전 디버깅에서 확인된 패턴)
 */
export default function SearchTemplate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [animationEnabled, setAnimationEnabled] = useState(true);
  const [exitAction, setExitAction] = useState<SearchExitAction | null>(null);
  const calledRef = useRef(false);

  // mount 시점 stale state reset — 인스턴스 재사용 시 이전 exit 보존 회피
  useEffect(() => {
    setExitAction(null);
    calledRef.current = false;
  }, []);

  // prefers-reduced-motion 사용자는 m.div skip → 즉시 navigate (WCAG SC 2.3.3)
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) setAnimationEnabled(false);
  }, []);

  if (!animationEnabled) {
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

  // exit 방향 분기 — back: 우측 (x), navigate: 아래 (y)
  const animateTarget = (() => {
    if (exitAction?.kind === "back") return { x: "100%", y: 0, opacity: 0 };
    if (exitAction?.kind === "navigate") return { x: 0, y: "100%", opacity: 0 };
    return { x: 0, y: 0, opacity: 1 };
  })();

  return (
    <LazyMotion features={domAnimation}>
      <m.div
        initial={{ x: "100%", y: 0, opacity: 0 }}
        animate={animateTarget}
        // iOS UINavigationController push easing — cubic-bezier(0.32, 0.72, 0, 1).
        // 250ms (modal dismiss) ~ 350ms (push). 평균 300ms 로 통일 — Material 가이드 200-300ms 범위.
        transition={{ type: "tween", duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
        onAnimationComplete={() => {
          if (!exitAction || calledRef.current) return;
          calledRef.current = true;
          if (exitAction.kind === "back") router.back();
          else router.push(exitAction.url);
        }}
        className="will-change-transform"
      >
        <SearchSlideOutContext.Provider value={setExitAction}>
          {children}
        </SearchSlideOutContext.Provider>
      </m.div>
    </LazyMotion>
  );
}
