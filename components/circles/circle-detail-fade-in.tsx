"use client";

/**
 * CircleDetailFadeIn — 상세 페이지 본문(커버 + container) 진입 페이드인 래퍼.
 *
 * 목적: 스켈레톤 → 실제 콘텐츠가 "빡" 뜨지 않고 그 자리에서 부드럽게 나타나도록(opacity fade).
 *
 * 위치 이동(translateY) 없이 **opacity 만** 변화시킨다:
 *  - transform 을 쓰지 않으므로 내부 sticky 탭 / fixed CTA 의 기준(containing block)을
 *    가로채 깨뜨리는 문제가 애초에 없다. (상세 페이지 fixed/sticky 함정 회피)
 *
 * 접근성: useReducedMotion() 시 애니메이션 없이 즉시 표시.
 */

import { LazyMotion, domAnimation, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";

export function CircleDetailFadeIn({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();

  return (
    <LazyMotion features={domAnimation}>
      <m.div
        // space-y-6: 기존 article 의 커버↔container 간격을 래퍼 안에서 유지
        className="space-y-6"
        initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={reduceMotion ? { duration: 0 } : { duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </m.div>
    </LazyMotion>
  );
}
