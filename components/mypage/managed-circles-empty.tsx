"use client";

/**
 * ManagedCirclesEmpty — 운영 동아리 0건 빈 상태 컴포넌트.
 *
 * favorites-page-body.tsx 의 빈 상태 패턴을 차용:
 * - LazyMotion features={domAnimation} + m.div fade+scale 진입
 * - useReducedMotion() 대응: true 이면 initial === animate (즉시 표시)
 * - Emoji 컴포넌트의 3D 이모지 + "bust-in-silhouette"
 * - Button asChild 로 /circles/new 링크
 */

import Link from "next/link";
import { LazyMotion, domAnimation, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";

import { Button } from "@/components/ui/button";
import { Emoji } from "@/components/ui/emoji";
import { EASE_EXPO } from "@/lib/motion/tokens";

export function ManagedCirclesEmpty() {
  /* OS "동작 줄이기" 감지 */
  const shouldReduceMotion = useReducedMotion();

  return (
    <LazyMotion features={domAnimation}>
      <m.div
        className="flex flex-col items-center gap-4 py-16 text-center"
        /* reduced motion: 즉시 완성 상태. 일반: scale + opacity 진입 */
        initial={shouldReduceMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          duration: 0.3,
          ease: EASE_EXPO,
        }}
      >
        {/* 3D 이모지 원형 배경 */}
        <m.div
          className="bg-muted flex size-24 items-center justify-center rounded-full"
          /* reduced motion 아닐 때 천천히 위아래로 float */
          animate={shouldReduceMotion ? undefined : { y: [0, -6, 0] }}
          transition={
            shouldReduceMotion ? undefined : { duration: 3, ease: "easeInOut", repeat: Infinity }
          }
        >
          <Emoji name="bust-in-silhouette" size={52} />
        </m.div>

        {/* 안내 문구 */}
        <div className="space-y-1">
          <p className="font-semibold">まだサークルを運営していません</p>
          <p className="text-muted-foreground text-sm">サークルを登録して運営を始めましょう</p>
        </div>

        {/* 登録 CTA 버튼 */}
        <Button asChild className="h-12">
          <Link href="/circles/new">＋ 最初のサークルを登録</Link>
        </Button>
      </m.div>
    </LazyMotion>
  );
}
