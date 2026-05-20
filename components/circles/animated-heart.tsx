"use client";

/**
 * AnimatedHeart — 좋아요 하트 마이크로 인터랙션 캡슐화 컴포넌트
 *
 * 두 가지 모션이 조합됩니다:
 * 1. 팝(Pop): active 전환 시 하트가 0.85 → 1.2 → 1 로 스프링 바운스. Apple/토스 스타일.
 * 2. 링 펄스(Ring Pulse): active 전환 시 반투명 원형 테두리가 바깥으로 확산 후 사라짐. 1회만 재생.
 *
 * 마운트 시 팝 금지: initial={false} 로 이미 좋아요된 상태로 마운트될 때 팝이 재생되지 않음.
 * prefers-reduced-motion: useReducedMotion 훅으로 감지해 모든 모션 비활성.
 *
 * 사용 예:
 *   <AnimatedHeart active={isLiked} className="size-5" colorClassName="text-red-500" />
 */

import { useEffect, useRef, useState } from "react";
import { LazyMotion, domAnimation, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { Heart } from "lucide-react";

import { cn } from "@/lib/utils";

interface AnimatedHeartProps {
  /** 현재 좋아요 활성 상태 */
  active: boolean;
  /**
   * 아이콘 크기 등 Heart 에 전달할 Tailwind 클래스
   * 예: "size-5", "size-6"
   */
  className?: string;
  /**
   * 활성 상태일 때 적용할 색상 클래스 — 래퍼 span 에 적용되어
   * Heart(stroke=currentColor + fill-current)와 링(border-current)이 동일 색 상속.
   * 비활성 시에는 적용하지 않아 부모의 muted 색이 상속됨.
   * 예: "text-red-500", "text-keio-navy"
   */
  colorClassName?: string;
}

/**
 * 좋아요 하트 아이콘 + 팝 + 링 펄스 애니메이션을 캡슐화한 컴포넌트.
 * 이 컴포넌트 자체는 장식 요소(aria-hidden)이며, 접근성 라벨은 부모 버튼이 담당한다.
 */
export function AnimatedHeart({ active, className, colorClassName }: AnimatedHeartProps) {
  /** 시스템 「모션 줄이기」 설정 감지 — true 면 모든 모션 비활성 */
  const reducedMotion = useReducedMotion();

  /**
   * 링 펄스 트리거 카운터.
   * 0 → N 으로 증가할 때마다 key={burst} 로 m.span 이 새로 마운트되어 1회 재생됨.
   * 비활성→활성 전환 시에만 증가하므로, 비활성 전환 시 링이 나오지 않음.
   */
  const [burst, setBurst] = useState(0);

  /**
   * 이전 active 값을 추적하는 ref.
   * false → true 전환인지 판별해 링 펄스를 1회만 발생시킴.
   */
  const prevActive = useRef(active);

  useEffect(() => {
    // 비활성 → 활성 전환 시에만 링 펄스 카운터 증가
    if (active && !prevActive.current && !reducedMotion) {
      setBurst((b) => b + 1);
    }
    prevActive.current = active;
  }, [active, reducedMotion]);

  return (
    // LazyMotion: domAnimation feature 세트만 로드해 번들 최소화 (step-progress 동일 패턴)
    <LazyMotion features={domAnimation}>
      {/*
       * 래퍼 span — 링과 하트의 기준점(relative + inline-flex).
       * active 일 때만 colorClassName 적용 → 비활성 시 부모의 muted 색 상속 유지.
       */}
      <span
        className={cn(
          "relative inline-flex items-center justify-center",
          // 활성 상태일 때만 색상 클래스 적용 (비활성은 부모 색 상속)
          active && colorClassName
        )}
      >
        {/*
         * 링 펄스 — key={burst} 로 매 좋아요 시 새로 마운트 → 1회 재생.
         * burst === 0 이면 최초(마운트) 시 링 없음 (마운트 팝 금지와 동일 철학).
         * border-current: 래퍼 span 의 currentColor 상속 (= colorClassName 색).
         */}
        {burst > 0 && !reducedMotion && (
          <m.span
            key={burst}
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full border border-current"
            initial={{ scale: 0.6, opacity: 0.55 }}
            animate={{ scale: 1.8, opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        )}

        {/*
         * 하트 팝 — active 전환 시 스프링 바운스 키프레임 [0.85 → 1.2 → 1].
         * initial={false}: 마운트 시 animate 값을 즉시 적용 → 이미 좋아요된 카드가
         * 화면에 등장해도 팝이 재생되지 않음 (step-progress 동일 패턴).
         * ease: [0.34, 1.56, 0.64, 1] → 오버슈트(1.56)가 있는 스프링 감각 cubic-bezier.
         */}
        <m.span
          initial={false}
          animate={
            active && !reducedMotion
              ? { scale: [0.85, 1.2, 1] } // 팝 키프레임: 작게→크게→자연 크기
              : { scale: 1 }
          }
          transition={
            active && !reducedMotion
              ? {
                  duration: 0.35,
                  times: [0, 0.55, 1], // 각 키프레임의 시간 비율
                  ease: [0.34, 1.56, 0.64, 1], // 오버슈트 있는 스프링 커브
                }
              : { duration: 0.15 }
          }
          className="inline-flex"
        >
          {/*
           * fill-current: active 일 때 래퍼 span 의 currentColor 로 채워짐.
           * stroke 는 Lucide 기본값(currentColor) 유지.
           */}
          <Heart className={cn(className, active && "fill-current")} aria-hidden="true" />
        </m.span>
      </span>
    </LazyMotion>
  );
}
