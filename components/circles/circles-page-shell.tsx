"use client";

import { type ReactNode } from "react";
import { LazyMotion, domAnimation, m } from "motion/react";

import { useIsInternalNavigation } from "@/lib/utils/use-is-internal-navigation";

/**
 * /circles 페이지 본문 wrapper.
 *
 * /circles 는 「홈」 톤 — 항상 그 자리에 있는 페이지로 인지되도록 설계.
 * 그래서 entry 동작은 두 갈래로 분기:
 *
 * - **내부 navigation** (Link 클릭, router.push, router.back, BottomNav 탭 등) :
 *   transition duration 0 → 즉시 opacity 1. animation 없는 효과.
 *   - 이유: search/detail 「戻る」 시 그쪽 페이지가 슬라이드 아웃 하는 동안
 *     /circles 가 자연스럽게 드러나는 「홈으로 돌아간다」 톤.
 *
 * - **외부 진입·새로고침·직접 진입** (referrer 가 외부 또는 빈 경우) :
 *   opacity 0 → 1 fade-in (1s, Material standard ease-out).
 *   - 「갑자기 콘텐츠가 뜨는」 hard-cut 회피. 차분한 등장.
 *
 * Hydration 안전:
 * - 첫 렌더(SSR + client 첫 hydration) 단계에선 `isInternal === null` 이라 opacity 0 유지.
 *   SSR HTML 과 client 첫 HTML 이 동일 → hydration mismatch 회피.
 * - mount 후 useEffect → isInternal 결정 → animate target 변경 → 자연 transition.
 *
 * template.tsx 대신 page 안에서 wrap 하는 이유 — cacheComponents:true 환경에서
 * `/circles/[id]` prerender 시 외곽 client template 와 충돌. shell 은 /circles 로 영향 범위 한정.
 */
export function CirclesPageShell({ children }: { children: ReactNode }) {
  const isInternal = useIsInternalNavigation();

  // null: 아직 결정 안 됨 → opacity 0 유지 (SSR/client 첫 렌더 일치)
  // true:  내부 → duration 0 으로 즉시 opacity 1 (animation 없는 효과)
  // false: 외부 → 1s 부드러운 fade-in
  const transition =
    isInternal === null
      ? { duration: 0 }
      : isInternal
        ? { duration: 0 }
        : { duration: 0.7, ease: [0, 0, 0.2, 1] as const };

  return (
    <LazyMotion features={domAnimation}>
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isInternal === null ? 0 : 1 }}
        transition={transition}
      >
        {children}
      </m.div>
    </LazyMotion>
  );
}
