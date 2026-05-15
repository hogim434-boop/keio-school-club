"use client";

import { createContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { LazyMotion, domAnimation, m } from "motion/react";

import { CIRCLE_REENTER_EVENT } from "@/components/circles/circle-card-link";

/**
 * 뒤로가기 슬라이드 아웃 트리거 — DetailPageHeader 의 「戻る」 버튼이 useContext 로 호출.
 */
export const SlideOutContext = createContext<() => void>(() => {});

/**
 * 서클 상세 페이지 전환 애니메이션 — iOS Push 패턴 (우측 슬라이드 인 + opacity fade) + 슬라이드 아웃.
 *
 * 설계:
 * - 같은 카드 재진입 (same-URL click) 은 Next.js Link 가 no-op 처리하여 navigation 미발화 →
 *   CircleCardLink 가 CustomEvent 발화 → 본 컴포넌트가 listen → setAnimKey 토글로 m.div key 변경
 *   → motion node 강제 re-mount → entry 재실행.
 * - exit 는 setExiting(true) 로 animate 값 변경 → motion transition → onAnimationComplete → router.back().
 * - prefers-reduced-motion 사용자는 m.div skip → 즉시 노출 (WCAG SC 2.3.3).
 *
 * STALE STATE 회피:
 * - Next.js 16 + cacheComponents:true 환경에서 router.back() 으로 빠져나간 뒤 같은 URL 로 재진입할 때
 *   template 인스턴스가 unmount 되지 않고 살아있는 케이스 확인됨. 그 결과 setExiting(true) 가
 *   다음 진입에서도 보존되어 m.div 가 off-screen 상태로 마운트 → entry animation 즉시 complete →
 *   onAnimationComplete 가 router.back() 즉시 재호출 → 사용자에게는 "안 들어가짐" 으로 보임.
 * - 해결: mount 시점에 setExiting(false) 강제 reset + router.back() 중복 호출 방지 ref.
 */
export default function CircleDetailTemplate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [animationEnabled, setAnimationEnabled] = useState(true);
  const [exiting, setExiting] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  // router.back() 중복 호출 방지 — onAnimationComplete 가 cleanup 시점에 한 번 더 발화하는 케이스
  const backCalledRef = useRef(false);

  // mount 시점 stale state reset — 인스턴스가 재사용되어 exiting=true 가 보존된 케이스 회피
  useEffect(() => {
    setExiting(false);
    backCalledRef.current = false;
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) setAnimationEnabled(false);
  }, []);

  // CircleCardLink 의 same-URL click CustomEvent 신호 수신 → animKey 토글
  useEffect(() => {
    const handler = () => setAnimKey((k) => k + 1);
    window.addEventListener(CIRCLE_REENTER_EVENT, handler);
    return () => window.removeEventListener(CIRCLE_REENTER_EVENT, handler);
  }, []);

  if (!animationEnabled) {
    return (
      <SlideOutContext.Provider value={() => router.back()}>{children}</SlideOutContext.Provider>
    );
  }

  return (
    <LazyMotion features={domAnimation}>
      <m.div
        // animKey 변경 시 motion node 강제 re-mount → initial→animate transition 자동 발화
        key={animKey}
        initial={{ x: "100%", opacity: 0 }}
        animate={exiting ? { x: "100%", opacity: 0 } : { x: 0, opacity: 1 }}
        // iOS UINavigationController push easing — cubic-bezier(0.32, 0.72, 0, 1).
        // spring 의 underdamped 진동(떨림) 회피 + 애플 native navigation 과 동일한 감속 곡선.
        transition={{ type: "tween", duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
        onAnimationComplete={() => {
          if (exiting && !backCalledRef.current) {
            backCalledRef.current = true;
            router.back();
          }
        }}
        className="will-change-transform"
      >
        <SlideOutContext.Provider value={() => setExiting(true)}>
          {children}
        </SlideOutContext.Provider>
      </m.div>
    </LazyMotion>
  );
}
