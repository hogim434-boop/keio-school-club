/**
 * StepProgress — 인증 플로우 상단 분절 진행 바 컴포넌트
 *
 * 용도:
 *   멀티 스텝 온보딩 화면의 상단에 배치하는 가로 분절 진행 바.
 *   total 개의 분절 중 current 번째까지를 慶應 네이비(#003366)로 채운다.
 *
 * 애니메이션:
 *   - motion/react의 LazyMotion + domAnimation으로 번들 크기를 최소화.
 *   - 이미 완료된 단계는 첫 렌더 시 즉시 채워짐(initial={false}).
 *   - 단계가 변경될 때만 width 0%→100% 트랜지션이 재생됨.
 *
 * 접근성:
 *   - role="progressbar", aria-valuenow/min/max 로 스크린 리더 지원.
 */

"use client";

import { LazyMotion, domAnimation } from "motion/react";
import * as m from "motion/react-m";
import { cn } from "@/lib/utils";

interface StepProgressProps {
  /** 현재 단계 (1-based). 이 값까지의 분절이 채워진다. */
  current: number;
  /** 전체 단계 수. 이 개수만큼 분절이 렌더된다. */
  total: number;
  /** 컨테이너 div에 추가할 Tailwind 클래스 (cn으로 병합됨). */
  className?: string;
}

/**
 * 가로 분절 진행 바.
 * total 개의 얇은 캡슐 중 current 번째까지 慶應 네이비로 채운다.
 */
export function StepProgress({ current, total, className }: StepProgressProps) {
  return (
    // LazyMotion: domAnimation feature 세트만 로드해 번들을 경량화
    <LazyMotion features={domAnimation}>
      {/* 접근성: 스크린 리더가 진행 상태를 인식하도록 progressbar 역할 부여 */}
      <div
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={1}
        aria-valuemax={total}
        className={cn(
          // 분절들을 가로로 나열, 균등 간격
          "flex gap-2",
          className
        )}
      >
        {Array.from({ length: total }, (_, i) => (
          // 각 분절: 얇은 회색 트랙 (overflow-hidden으로 채움 div를 클리핑)
          <div key={i} className="bg-muted h-1 flex-1 overflow-hidden rounded-full">
            {/*
              m.div: LazyMotion 내부에서만 사용 가능한 경량 motion 컴포넌트.
              initial={false}: 첫 렌더 시 animate 값을 즉시 적용 (트랜지션 없이).
              animate: i < current이면 너비를 100%로, 아니면 0%로.
              transition: duration 0.4s, 커스텀 cubic-bezier (스무스한 감속 곡선).
            */}
            <m.div
              className="bg-keio-navy h-full"
              initial={false}
              animate={{ width: i < current ? "100%" : "0%" }}
              transition={{
                duration: 0.4,
                ease: [0.22, 1, 0.36, 1],
              }}
            />
          </div>
        ))}
      </div>
    </LazyMotion>
  );
}
