"use client";

/**
 * PageTransition — leaf 페이지(favorites / mypage / notifications / search / calendar) 공통 진입 전환.
 *
 * 목적:
 * - 진입 애니메이션이 없던 페이지들이 로딩 후 "딱" 나타나 딱딱하던 문제를 완화.
 *
 * 두 가지 mode:
 * - "fade-up"(기본): opacity 0 / y 8 → opacity 1 / y 0. 살짝 떠오르며 나타나는 가벼운 진입.
 *   favorites / mypage / notifications 처럼 화면 고정(fixed) 자식이 없는 페이지용.
 * - "fade": opacity 0 → 1 **만** (transform 일절 없음). 더 길게(0.6s) 재생해 페이드를 시각적으로 강조.
 *   search / calendar 처럼 `position: fixed` 자식(하단 CTA·sticky 헤더)이 있는 페이지용.
 *
 *   ⚠️ fixed 함정 회피: 조상 요소에 transform(translateY·scale 등)이 걸리면 CSS 명세상
 *   `position: fixed` 자식의 기준이 viewport → 그 transform 박스로 바뀌어, 페이드 재생 구간 동안
 *   fixed 요소가 같이 움직인다. (검색 페이지 하단 「サークルを見る」 버튼이 8px 딸려 움직이던 버그)
 *   opacity 는 containing block 을 만들지 않으므로 fixed 자식이 안정적으로 고정된다.
 *   → fixed/sticky 자식이 있는 페이지는 반드시 mode="fade" 를 쓸 것. y·scale·blur(filter) 금지.
 *
 * 동작:
 * - LazyMotion + domAnimation: 모션 기능을 필요한 만큼만 번들에 포함 (프로젝트 표준 최적화 패턴).
 * - 마운트 시 한 번만 진입. 슬라이드 아웃 · Context · sessionStorage 일절 없음.
 *
 * 접근성:
 * - useReducedMotion() === true (OS "동작 줄이기") 면 initial 을 false 로 두어
 *   애니메이션 없이 즉시 최종 상태로 표시 (WCAG SC 2.3.3).
 */

import { LazyMotion, domAnimation, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";

import { EASE_IOS } from "@/lib/motion/tokens";

interface PageTransitionProps {
  children: React.ReactNode;
  /** 진입 방식 — 기본 "fade-up". fixed/sticky 자식이 있는 페이지는 "fade" 사용. */
  mode?: "fade-up" | "fade";
}

export function PageTransition({ children, mode = "fade-up" }: PageTransitionProps) {
  /* OS "동작 줄이기" 감지 — true 면 진입 애니메이션 생략하고 즉시 표시 */
  const shouldReduceMotion = useReducedMotion();

  // fade 모드는 transform 을 전혀 만들지 않도록 opacity 만 다룬다 (fixed 자식 안정).
  // fade-up 은 기존대로 opacity + y 8px. 페이드를 더 살리기 위해 fade 는 더 길게(0.6s) 재생.
  const isFade = mode === "fade";
  const initial = shouldReduceMotion ? false : isFade ? { opacity: 0 } : { opacity: 0, y: 8 };
  const animate = isFade ? { opacity: 1 } : { opacity: 1, y: 0 };
  const duration = isFade ? 0.6 : 0.3;

  return (
    <LazyMotion features={domAnimation}>
      <m.div initial={initial} animate={animate} transition={{ duration, ease: EASE_IOS }}>
        {children}
      </m.div>
    </LazyMotion>
  );
}
