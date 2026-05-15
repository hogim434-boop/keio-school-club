"use client";

import { createContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { LazyMotion, domAnimation, m } from "motion/react";

/**
 * 셔플 페이지 「戻る」 슬라이드 아웃 트리거 — SwipeDeck 의 戻る 버튼이 useContext 로 호출.
 * 호출되면 우측으로 슬라이드 아웃 → /circles 로 router.push.
 */
export const ShuffleSlideOutContext = createContext<() => void>(() => {});

/**
 * /shuffle 페이지 전환 애니메이션 — iOS Push 패턴.
 *
 * - Entry: 우측에서 슬라이드 인 + opacity fade (search·circle detail 와 동일 톤)
 * - Exit: 戻る 버튼 클릭 시 우측으로 슬라이드 아웃 → router.push("/circles")
 * - prefers-reduced-motion 사용자는 m.div skip → 즉시 노출/이동 (WCAG SC 2.3.3)
 *
 * STALE STATE 회피:
 * - cacheComponents:true + Next.js App Router 환경에서 template 인스턴스가 재사용되어
 *   exiting=true 가 보존되는 케이스 방지. mount 시 exiting=false 강제 reset.
 * - onAnimationComplete 중복 호출 방지를 navigatedRef 로 guard.
 *
 * 동선: 보통 /circles 의 「シャッフルで探す」 진입 카드 → /shuffle → 우측 슬라이드 인.
 *       戻る → 우측 슬라이드 아웃 → /circles 로 push (history.back 이 아니라 push 인 이유:
 *       직접 진입·새 탭 케이스에서도 항상 /circles 로 보내 안전).
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
      <ShuffleSlideOutContext.Provider value={() => router.push("/circles")}>
        {children}
      </ShuffleSlideOutContext.Provider>
    );
  }

  return (
    <LazyMotion features={domAnimation}>
      <m.div
        initial={{ x: "100%", opacity: 0 }}
        animate={exiting ? { x: "100%", opacity: 0 } : { x: 0, opacity: 1 }}
        // iOS UINavigationController push easing — cubic-bezier(0.32, 0.72, 0, 1).
        // 300ms — search·detail template 과 동일한 톤
        transition={{ type: "tween", duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
        onAnimationComplete={() => {
          if (exiting && !navigatedRef.current) {
            navigatedRef.current = true;
            router.push("/circles");
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
