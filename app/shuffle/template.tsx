"use client";

import { createContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { LazyMotion, domAnimation, m } from "motion/react";

import { EASE_IOS } from "@/lib/motion/tokens";

/**
 * 셔플 페이지 「戻る」 슬라이드 아웃 트리거 — SwipeDeck 의 戻る 버튼이 useContext 로 호출.
 * 호출되면 우측으로 슬라이드 아웃 → 직전 페이지로 복귀 (router.back).
 * history 가 비어있는 경우 (직접 URL 진입·새 탭) 만 홈(/) 으로 폴백.
 */
export const ShuffleSlideOutContext = createContext<() => void>(() => {});

/**
 * 「戻る」 액션 — 직전 페이지로 복귀, history 없으면 홈으로.
 * 기존엔 무조건 `/circles` 로 push 했으나, 홈 → 셔플 → 戻る 흐름에서 사용자에게
 * 「예전 홈 화면」(= /circles, 큐레이션 없는 단순 일람) 이 보이는 회귀 발생.
 * 동선 일관성 확보를 위해 router.back() 기반으로 전환.
 */
function navigateBackOrHome(router: ReturnType<typeof useRouter>) {
  if (typeof window !== "undefined" && window.history.length > 1) {
    router.back();
  } else {
    router.push("/");
  }
}

/**
 * /shuffle 페이지 전환 애니메이션 — iOS Push 패턴.
 *
 * - Entry: 우측에서 슬라이드 인 + opacity fade (search·circle detail 와 동일 톤)
 * - Exit: 戻る 버튼 클릭 시 우측으로 슬라이드 아웃 → 직전 페이지로 복귀
 * - prefers-reduced-motion 사용자는 m.div skip → 즉시 노출/이동 (WCAG SC 2.3.3)
 *
 * STALE STATE 회피:
 * - cacheComponents:true + Next.js App Router 환경에서 template 인스턴스가 재사용되어
 *   exiting=true 가 보존되는 케이스 방지. mount 시 exiting=false 강제 reset.
 * - onAnimationComplete 중복 호출 방지를 navigatedRef 로 guard.
 *
 * 동선:
 * - 홈(/) 의 「シャッフルで探す」 또는 동아리 일람(/circles) 진입 카드 → /shuffle → 우측 슬라이드 인.
 * - 戻る → 우측 슬라이드 아웃 → router.back() 으로 들어온 곳 (홈 또는 /circles) 으로 정확히 복귀.
 * - 직접 URL/새 탭 진입 등 history 가 없는 경우만 홈(/) 으로 폴백.
 */
export default function ShuffleTemplate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [animationEnabled, setAnimationEnabled] = useState(true);
  const [exiting, setExiting] = useState(false);
  const navigatedRef = useRef(false);

  // mount 시점 stale state reset — 인스턴스가 재사용되어 exiting=true 가 보존된 케이스 회피
  useEffect(() => {
    setExiting(false);
    navigatedRef.current = false;
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) setAnimationEnabled(false);
  }, []);

  if (!animationEnabled) {
    return (
      <ShuffleSlideOutContext.Provider value={() => navigateBackOrHome(router)}>
        {children}
      </ShuffleSlideOutContext.Provider>
    );
  }

  return (
    <LazyMotion features={domAnimation}>
      <m.div
        // 셔플 페이지는 「셔플 모드 진입」 액션 톤이라 외부 진입·새로고침 시에도 항상 슬라이드 유지
        initial={{ x: "100%", opacity: 0 }}
        animate={exiting ? { x: "100%", opacity: 0 } : { x: 0, opacity: 1 }}
        // iOS UINavigationController push easing — cubic-bezier(0.32, 0.72, 0, 1).
        // 300ms — search·detail template 과 동일한 톤
        transition={{ type: "tween", duration: 0.3, ease: EASE_IOS }}
        onAnimationComplete={() => {
          if (exiting && !navigatedRef.current) {
            navigatedRef.current = true;
            navigateBackOrHome(router);
          }
        }}
        className="will-change-transform"
      >
        <ShuffleSlideOutContext.Provider value={() => setExiting(true)}>
          {children}
        </ShuffleSlideOutContext.Provider>
      </m.div>
    </LazyMotion>
  );
}
