"use client";

import { type ReactNode } from "react";
import { LazyMotion, domAnimation, m } from "motion/react";

/**
 * /circles 페이지 본문을 감싸는 entry 애니메이션 shell.
 *
 * template.tsx 대신 page 안에서 본문만 wrap 하는 이유:
 * - app/circles/template.tsx 로 만들면 자식 라우트 (/circles/[id], /circles/new) 가
 *   외곽 template 의 client wrapping 영향을 받아 prerender 단계에서 충돌 (cacheComponents:true 환경).
 * - shell 은 /circles 페이지 안에만 들어가므로 영향 범위가 정확히 /circles 로 한정.
 *
 * 톤: search·detail·shuffle template 과 동일한 iOS Push entry
 *     (우측에서 슬라이드 인 + opacity 0→1, 0.3s, iOS easing [0.32, 0.72, 0, 1]).
 *     opacity fade 가 hard-cut 회피 + 슬라이드의 방향감을 더해 자연스러운 진입.
 *
 * 한계: SPA query-only 변경 (/circles → /circles?category=sports) 시엔 shell 인스턴스가
 *       유지되어 entry 재발화 X. 그러나 /search·/circles/[id] 등 **다른 경로에서 진입** 할 때는
 *       마운트 → entry 발화 → 사용자가 느끼는 「페이지 이동」 시점에서는 항상 작동.
 */
export function CirclesPageShell({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation}>
      <m.div
        initial={{ x: "100%", opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: "tween", duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
        className="will-change-transform"
      >
        {children}
      </m.div>
    </LazyMotion>
  );
}
