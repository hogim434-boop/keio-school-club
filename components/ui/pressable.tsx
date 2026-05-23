"use client";

/**
 * Pressable — 네이티브 앱 느낌의 탭 피드백을 제공하는 motion.button 래퍼
 *
 * 기능:
 * - whileTap: 누르는 순간 scale 이 작아졌다가 spring 으로 복귀 (앱 네이티브 느낌)
 * - useReducedMotion 감지: prefers-reduced-motion 시 scale 효과 비활성
 * - intensity prop: 세 단계(subtle / normal / strong)로 눌리는 강도 조절
 * - WebkitTapHighlightColor transparent: iOS 기본 탭 하이라이트 제거
 * - touch-manipulation: 300ms 터치 딜레이 제거
 * - select-none: 길게 눌러도 텍스트 선택 안 됨
 *
 * 사용 예:
 *   <Pressable intensity="normal" onClick={handleClick} className="...">
 *     テキスト
 *   </Pressable>
 *
 * 주의: 이 컴포넌트 자체가 <button> 을 렌더링하므로, <button> 안에 중첩 사용 금지.
 */

import * as React from "react";
import { LazyMotion, domAnimation, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";

import { cn } from "@/lib/utils";

/** 눌리는 강도 — scale 값으로 매핑 */
const INTENSITY_SCALE = {
  subtle: 0.98, // 미세하게 — 탭 버튼, 리스트 아이템
  normal: 0.97, // 기본 — 주요 버튼, CTA
  strong: 0.93, // 강하게 — 좋아요 하트, 특수 버튼
} as const;

type Intensity = keyof typeof INTENSITY_SCALE;

interface PressableProps {
  /**
   * 눌리는 강도
   * - subtle: scale 0.98 (리스트 아이템, 탭 등)
   * - normal: scale 0.97 (기본 CTA 버튼) — 기본값
   * - strong: scale 0.93 (좋아요 하트 등 임팩트 있는 버튼)
   */
  intensity?: Intensity;
  /** 버튼 내부 콘텐츠 */
  children: React.ReactNode;
  /** 버튼 클릭 핸들러 */
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  /** 추가 CSS 클래스 */
  className?: string;
  /** 버튼 타입 — 기본값 "button" */
  type?: "button" | "submit" | "reset";
  /** 비활성 상태 */
  disabled?: boolean;
  /** 접근성 라벨 */
  "aria-label"?: string;
  /** 접근성 pressed 상태 */
  "aria-pressed"?: boolean;
}

/**
 * 네이티브 앱 느낌의 탭 피드백 버튼.
 * whileTap + spring 조합으로 iOS/Android 버튼 누름 느낌 재현.
 * prefers-reduced-motion 시 모션 비활성.
 */
export function Pressable({
  intensity = "normal",
  children,
  className,
  type = "button",
  ...props
}: PressableProps) {
  /** 시스템 「모션 줄이기」 설정 감지 */
  const prefersReducedMotion = useReducedMotion();

  const scale = INTENSITY_SCALE[intensity];

  return (
    /*
     * LazyMotion + m.button: full `motion` 대신 지연 로드되는 m 컴포넌트 사용으로 번들 최소화.
     * Pressable 은 여러 곳에서 단독 import 되므로 자체 LazyMotion 으로 감싸 자족적으로 동작시킨다.
     */
    <LazyMotion features={domAnimation}>
      <m.button
        /** 눌릴 때 scale 축소 + spring 복귀 — reduced-motion 시 비활성 */
        whileTap={prefersReducedMotion ? undefined : { scale }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 15,
        }}
        style={{
          /* iOS 기본 탭 하이라이트(파란 반투명) 제거 */
          WebkitTapHighlightColor: "transparent",
        }}
        type={type}
        className={cn(
          /* 터치 딜레이 300ms 제거 + 텍스트 선택 방지 */
          "touch-manipulation select-none",
          className
        )}
        {...props}
      >
        {children}
      </m.button>
    </LazyMotion>
  );
}
