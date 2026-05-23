"use client";

/**
 * PageTransition — leaf 페이지(favorites / mypage / notifications / compare) 공통 진입 전환.
 *
 * 목적:
 * - 진입 애니메이션이 없던 페이지들이 로딩 후 "딱" 나타나 딱딱하던 문제를 완화.
 * - 가벼운 fade-up(살짝 아래에서 위로 떠오르며 서서히 나타남)만 적용.
 *
 * 동작:
 * - LazyMotion + domAnimation: 모션 기능을 필요한 만큼만 번들에 포함 (프로젝트 표준 최적화 패턴).
 * - 마운트 시 opacity 0 / y 8 → opacity 1 / y 0 로 한 번만 진입.
 * - 슬라이드 아웃 · Context · sessionStorage 일절 없음. 순수 enter fade 만 담당.
 *
 * 접근성:
 * - useReducedMotion() === true (OS "동작 줄이기") 면 initial 을 false 로 두어
 *   애니메이션 없이 즉시 최종 상태로 표시 (WCAG SC 2.3.3).
 */

import { LazyMotion, domAnimation, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";

import { EASE_IOS } from "@/lib/motion/tokens";

export function PageTransition({ children }: { children: React.ReactNode }) {
  /* OS "동작 줄이기" 감지 — true 면 진입 애니메이션 생략하고 즉시 표시 */
  const shouldReduceMotion = useReducedMotion();

  return (
    <LazyMotion features={domAnimation}>
      <m.div
        // reduced motion 이면 initial=false → 첫 프레임부터 최종 상태(애니메이션 없음)
        initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        // 300ms + iOS easing — 프로젝트 전반의 진입 톤과 통일
        transition={{ duration: 0.3, ease: EASE_IOS }}
      >
        {children}
      </m.div>
    </LazyMotion>
  );
}
