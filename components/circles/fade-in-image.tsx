"use client";

import { useState } from "react";
import Image, { type ImageProps } from "next/image";
import { useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";

/**
 * FadeInImage — next/image를 감싸 로드 완료 시 opacity 0→1 페이드인.
 *
 * 동작 원리:
 *   1. 초기: opacity-0 (이미지 아직 로드 안 됨)
 *   2. onLoad 발화 → setLoaded(true) → opacity-100 전환 (500ms ease)
 *   3. prefers-reduced-motion 활성화 시: 처음부터 opacity-100 (페이드 생략)
 *   4. 이미 캐시된 이미지: onLoad가 매우 빠르게 발화 → 거의 즉시 표시
 *
 * className 병합:
 *   cn()으로 병합하므로 외부에서 전달한 hover 줌·transition 클래스와 공존.
 *   예) `group-hover:scale-[1.04] transition-transform` 는 그대로 유지.
 *
 * 성능:
 *   opacity만 사용 → GPU 가속, 레이아웃 리플로우 없음.
 */
export function FadeInImage({ className, onLoad, ...props }: ImageProps) {
  // OS의 「동작 줄이기」 설정 감지. null(SSR/감지 전)은 false로 취급.
  const shouldReduceMotion = useReducedMotion() ?? false;

  // 이미지 로드 완료 여부 — true가 되면 opacity-100 클래스로 전환
  const [loaded, setLoaded] = useState(false);

  const handleLoad: React.ReactEventHandler<HTMLImageElement> = (e) => {
    setLoaded(true);
    // 부모 컴포넌트가 onLoad 콜백을 전달했으면 그것도 호출
    onLoad?.(e);
  };

  return (
    // eslint-disable-next-line jsx-a11y/alt-text -- alt는 ImageProps(...props)에 포함됨 (required)
    <Image
      {...props}
      onLoad={handleLoad}
      className={cn(
        // reduced motion이 아닐 때만 opacity 전환 효과 적용
        !shouldReduceMotion && "transition-opacity duration-500",
        // 로드 전이고 reduced motion 아님: 투명. 그 외(로드 완료 or reduced motion): 불투명.
        !loaded && !shouldReduceMotion ? "opacity-0" : "opacity-100",
        // 외부에서 전달된 클래스 (hover 줌, object-cover 등) — tailwind-merge가 충돌 해결
        className
      )}
    />
  );
}
