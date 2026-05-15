"use client";

import { LazyMotion, domAnimation, m, useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";

interface KCircleLogoProps {
  /**
   * 심볼 크기 — 헤더 기본 md, favicon 단독은 sm, OG/로그인은 lg.
   * 워드마크 없이 심볼 단독 사용이라 시각적 무게 보강용 큰 사이즈.
   * - sm: 28px (favicon, BottomNav 인라인)
   * - md: 48px (헤더 표준 — h-20 헤더에서 사방 16px 정사각 padding)
   * - lg: 64px (로그인 페이지, OG 이미지)
   */
  size?: "sm" | "md" | "lg";
  /** 외부 클래스 (Tailwind merge) */
  className?: string;
}

/** size prop → tailwind wrapper 크기 + K 글자 크기 + 원 두께 매핑.
 *  strokeWidth 1.5 — lucide-react 의 default 2 보다 한 단계 얇게 (circle 은 둘레가 단순해서 같은 두께라도 더 두꺼워 보임). */
const SIZE_MAP = {
  sm: { wrapper: "size-7", k: "text-sm", strokeWidth: 1 },
  md: { wrapper: "size-12", k: "text-xl", strokeWidth: 1 },
  lg: { wrapper: "size-16", k: "text-2xl", strokeWidth: 1 },
} as const;

/** 원의 둘레 = 2π × r = 2π × 12 ≈ 75.4 (viewBox 0-28 기준).
 *  strokeDasharray + strokeDashoffset 으로 그리기 애니메이션 제어 시 사용. */
const CIRCLE_CIRCUMFERENCE = 75.4;

/**
 * KCircle 로고 — K-Ring 디자인 + Mount 「Ring Draw」 애니메이션 (2026 모던 SaaS 트렌드).
 *
 * 구조: 얇은 원 안에 Bold K. 워드마크 없이 심볼 단독.
 * - Circle = 동아리 (서클) 의미가 심볼에 직접 구현
 * - 크기별 stroke 두께 비례 (sm 2 → lg 2.5) — 작을 때 너무 얇아 보이는 것 회피
 *
 * Mount Animation (Linear/Notion 풍):
 * - Ring: stroke-dashoffset 으로 12시 방향에서 시계 방향으로 그려짐 (450ms, expo-out)
 * - K: ring 거의 완성 시점에 opacity:0 + scale:0.85 에서 페이드+스케일 인 (delay 300ms, 250ms)
 * - 총 ~700ms 후 정적 상태
 *
 * 접근성:
 * - `useReducedMotion` 으로 reduced motion 사용자는 즉시 완성 상태 (WCAG SC 2.3.3)
 * - SVG aria-hidden (장식). 의미는 부모 Link 의 aria-label
 */
export function KCircleLogo({ size = "md", className }: KCircleLogoProps) {
  const cfg = SIZE_MAP[size];
  const reducedMotion = useReducedMotion();

  // reduced motion 사용자는 initial 을 완성 상태로 강제 (애니메이션 skip)
  const circleInitial = reducedMotion
    ? { strokeDashoffset: 0 }
    : { strokeDashoffset: CIRCLE_CIRCUMFERENCE };
  const kInitial = reducedMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.85 };

  return (
    <LazyMotion features={domAnimation}>
      <span
        className={cn(
          "relative inline-flex shrink-0 items-center justify-center",
          cfg.wrapper,
          className
        )}
      >
        <svg
          className="absolute inset-0"
          viewBox="0 0 28 28"
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
        >
          <m.circle
            cx="14"
            cy="14"
            r="12"
            fill="none"
            strokeWidth={cfg.strokeWidth}
            strokeLinecap="round"
            strokeDasharray={CIRCLE_CIRCUMFERENCE}
            // 12시 방향에서 시계방향 시작 — SVG 의 default 시작점 (3시) 을 -90° 회전으로 보정
            transform="rotate(-90 14 14)"
            className="stroke-black dark:stroke-black"
            initial={circleInitial}
            animate={{ strokeDashoffset: 0 }}
            // expo out — smooth deceleration (iOS 풍, ui-animation-expert 리서치 추천)
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          />
        </svg>
        <m.span
          className={cn("leading-none font-bold", cfg.k)}
          initial={kInitial}
          animate={{ opacity: 1, scale: 1 }}
          // ring 이 거의 완성될 때(300ms) K 등장 시작 → 700ms 시점에 완전 정착
          transition={{ delay: 0.3, duration: 0.25, ease: "easeOut" }}
        >
          K
        </m.span>
      </span>
    </LazyMotion>
  );
}
