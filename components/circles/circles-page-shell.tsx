"use client";

import { createContext, useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, LazyMotion, domAnimation, m } from "motion/react";

import { EASE_IOS } from "@/lib/motion/tokens";
import { useIsInternalNavigation } from "@/lib/utils/use-is-internal-navigation";

/**
 * /circles shell 의 exit action — 카테고리 그리드 클릭 등 in-page navigate 트리거.
 * 동작: 홈 페이지가 왼쪽으로 슬라이드 아웃 → 카테고리 결과 페이지가 페이드 인.
 */
export type CirclesExitAction = { kind: "navigate"; url: string };

/**
 * shell exit 트리거 context — HomeCategoryGrid 등 본문 내부 컴포넌트가 useContext 로 호출.
 *
 * 기본값 null: CirclesPageShell(Provider) 밖에서 쓰일 때(예: 홈 화면)를 구분하기 위함.
 * 소비 측(SlideOutLink)은 null 이면 슬라이드 전환 없이 일반 Link 이동으로 폴백한다.
 */
export const CirclesSlideOutContext = createContext<((action: CirclesExitAction) => void) | null>(
  null
);

/**
 * /circles 페이지 본문 wrapper.
 *
 * **트랜지션 분기**:
 * - **카테고리 클릭** (`slideOutOnExit === true`):
 *   - 옛 m.div: 왼쪽 슬라이드 아웃 (`x: 0 → -100%`, opacity `1 → 0`, 300ms, iOS push easing)
 *   - 새 m.div: 페이드 인 (`opacity 0 → 1`, 300ms)
 * - **외부 진입·새로고침** (`isInternal === false`): 700ms fade-in (홈은 "그 자리에 있는 페이지" 톤).
 * - **다른 internal navigation** (페이지네이션·search「適用」등): 즉시 노출 (duration 0).
 * - **첫 렌더** (`isInternal === null`): SSR HTML 과 client 첫 HTML 일치 (hydration mismatch 회피).
 *
 * **AnimatePresence + URL-based key 패턴**:
 * - m.div 의 key 를 `${pathname}?${searchParams}` 로 잡아서 URL 변경 시 자동 unmount/remount.
 * - AnimatePresence + `mode="wait"`: 옛 m.div 의 exit 완료 후 새 m.div mount → fade-in.
 * - key 가 URL-기반 unique 문자열이라 다른 motion 컴포넌트(상세 page template 등)와 충돌 없음.
 *
 * **`slideOutOnExit` state 의 역할**:
 * - 카테고리 클릭이 trigger 한 navigation 인지 판별 → exit 모션 톤 결정.
 * - 페이지네이션·필터 변경 등 다른 URL 변경 시엔 hard-cut (옛 m.div 가 슬라이드 아웃 하지 않음).
 *
 * **template.tsx 대신 page 안 wrap 하는 이유** — cacheComponents:true 환경에서 /circles/[id]
 * prerender 시 외곽 client template 와 충돌. shell 영향 범위 /circles 로 한정.
 */
export function CirclesPageShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isInternal = useIsInternalNavigation();
  const [animationEnabled, setAnimationEnabled] = useState(true);
  // 카테고리 클릭으로 시작된 navigation 인지 표시. handleExit 가 set, enter 완료 시 reset.
  const [slideOutOnExit, setSlideOutOnExit] = useState(false);

  // prefers-reduced-motion 사용자는 슬라이드/페이드 모두 skip → 즉시 navigate (WCAG SC 2.3.3)
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) setAnimationEnabled(false);
  }, []);

  if (!animationEnabled) {
    return (
      <CirclesSlideOutContext.Provider value={(action) => router.push(action.url)}>
        {children}
      </CirclesSlideOutContext.Provider>
    );
  }

  // m.div key — URL 기반 unique. 새로고침 시엔 같은 URL → 같은 key → m.div 재마운트 안 됨.
  // 카테고리 클릭으로 URL 변경 시 → key 변경 → AnimatePresence 가 exit→enter 시퀀스 실행.
  const animKey = `${pathname}?${searchParams.toString()}`;

  // 카테고리 그리드 클릭 핸들러 — slideOutOnExit 활성화 + navigate.
  // 같은 frame 의 router.push 는 비동기 navigation 시작 → URL 변경 → key 변경 → exit 발화.
  const handleExit = (action: CirclesExitAction) => {
    setSlideOutOnExit(true);
    router.push(action.url);
  };

  // Enter transition 분기 (m.div mount 시 initial → animate)
  // - slideOutOnExit: 카테고리 클릭 직후 새 m.div mount → 300ms fade-in
  // - isInternal === null: SSR hydration safe (duration 0)
  // - isInternal === true: 다른 internal navigation — 즉시 노출
  // - isInternal === false: 외부 진입/새로고침 — 700ms fade-in
  const enterTransition = slideOutOnExit
    ? { duration: 0.3, ease: [0, 0, 0.2, 1] as const }
    : isInternal === null
      ? { duration: 0 }
      : isInternal
        ? { duration: 0 }
        : { duration: 0.7, ease: [0, 0, 0.2, 1] as const };

  // Exit animation (옛 m.div unmount 시 발화)
  // - slideOutOnExit: 왼쪽 슬라이드 아웃 (iOS push easing)
  // - 그 외: hard-cut (시각 효과 없음)
  const exitAnimation = slideOutOnExit
    ? {
        x: "-100%",
        opacity: 0,
        transition: {
          type: "tween" as const,
          duration: 0.3,
          ease: EASE_IOS,
        },
      }
    : { opacity: 0, transition: { duration: 0 } };

  return (
    <LazyMotion features={domAnimation}>
      <AnimatePresence mode="wait">
        <m.div
          key={animKey}
          initial={{ x: 0, opacity: 0 }}
          animate={{ x: 0, opacity: isInternal === null ? 0 : 1 }}
          exit={exitAnimation}
          transition={enterTransition}
          onAnimationComplete={() => {
            // enter animation 완료 시 slideOutOnExit reset (다음 카테고리 클릭을 위해).
            // exit animation 은 AnimatePresence 가 별도 처리하므로 이 콜백은 enter 만 발화.
            if (slideOutOnExit) setSlideOutOnExit(false);
          }}
          className={slideOutOnExit ? "will-change-transform" : undefined}
        >
          <CirclesSlideOutContext.Provider value={handleExit}>
            {children}
          </CirclesSlideOutContext.Provider>
        </m.div>
      </AnimatePresence>
    </LazyMotion>
  );
}
