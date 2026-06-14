"use client";

/**
 * HomeHero — 홈 최상단 임팩트 히어로 섹션 (옵션 A: 대담한 타이포).
 *
 * 디자인 원칙 (2026 실제 앱 트렌드 기반):
 * - 「공격적 미니멀리즘」: 요소는 4개뿐 — eyebrow 배지 / 큰 헤드라인 / 검색창.
 *   장식·서브카피를 덜어내 첫 화면을 가볍고 단단하게.
 * - 큰 타이포 + 음수 자간(-0.03em) + extrabold 로 「프리미엄」 인상.
 *   (Airbnb 의 "Go Near" 식 대담한 헤드라인 + SaaS 2026 타이포 트렌드 차용)
 * - 색 강조 없이 검정 단색 헤드라인 — 큰 타이포·굵기만으로 임팩트(과한 색/그라데 금지).
 * - 라이브 통계 배지를 헤드라인 「위」 eyebrow 로 배치 (2026 hero 표준 위계).
 *
 * 애니메이션 전략:
 * - LazyMotion + domAnimation + m.* 패턴 (프로젝트 표준, 번들 최적화).
 * - stagger 로 eyebrow → 헤드라인 → 검색창 순차 등장 (fade + y 12→0).
 * - 숫자 카운트업: useMotionValue + useMotionValueEvent 로 정수 표시.
 * - reducedMotion === true: 모든 이동/카운트업 생략, 즉시 최종 상태.
 */

import { type ReactNode, useEffect, useRef, useState } from "react";
import {
  LazyMotion,
  domAnimation,
  m,
  useInView,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  animate,
} from "motion/react";

import { EASE_EXPO } from "@/lib/motion/tokens";

// ─── 타입 ────────────────────────────────────────────────────────────────────

interface HomeHeroProps {
  /** 승인된 동아리 총 수 (서버에서 주입) */
  count: number;
  /** HomeSearchBar 등 검색 진입 UI를 children으로 전달 (RSC → Client 패턴) */
  children: ReactNode;
}

// ─── 상수 ────────────────────────────────────────────────────────────────────

/**
 * EASE_EXPO 배열을 motion의 Easing 타입으로 안전하게 캐스팅.
 * motion/react 에서 cubic-bezier 배열은 [number,number,number,number] 튜플로 전달.
 */
const EASING = EASE_EXPO as [number, number, number, number];

/** stagger 딜레이 정의 (초 단위) — eyebrow → 헤드라인 → 검색창 순서 */
const DELAYS = {
  eyebrow: 0.1, // 라이브 카운트 배지(헤드라인 위)
  line1: 0.2, // 메인 카피 1줄째
  line2: 0.32, // 메인 카피 2줄째
  searchBar: 0.48, // 검색바
} as const;

// ─── 서브 컴포넌트: 숫자 카운트업 ───────────────────────────────────────────

interface CounterProps {
  target: number;
  reducedMotion: boolean;
}

/**
 * Counter — 0 → target 으로 카운트업 + 완료 시 미세 scale 펄스.
 *
 * 재카운팅(요청):
 * - useInView(once:false) 로 배지가 뷰포트에 들어올 때마다 감지.
 * - 화면 밖으로 나가면 0 으로 리셋, 다시 들어오면 0 → target 카운트업 재생.
 *   → 새로고침뿐 아니라 「스크롤로 다시 보일 때마다」 숫자가 올라간다.
 *
 * 구현:
 * - useMotionValue(0) 를 animate() 로 target 까지 1.2초 ease-out 으로 이동.
 * - useMotionValueEvent 로 렌더마다 정수 값을 state 에 기록해 표시.
 * - 카운트 완료 시 scale 펄스 1→1.08→1 로 숫자를 살짝 강조.
 * - reducedMotion === true: 즉시 target 값 표시, 애니메이션 없음.
 */
function Counter({ target, reducedMotion }: CounterProps) {
  // 숫자 span 에 부착할 ref — 뷰포트 진입 감지 대상
  const ref = useRef<HTMLSpanElement>(null);
  /**
   * useInView: 배지가 화면에 보이는지.
   * - once:false → 들어올 때마다 반복 감지(재카운팅 핵심)
   * - amount:0.8 → 숫자가 80% 이상 보일 때 "진입"으로 판단
   */
  const isInView = useInView(ref, { once: false, amount: 0.8 });

  // 현재 표시할 숫자 state (정수)
  const [display, setDisplay] = useState(reducedMotion ? target : 0);
  // scale 펄스용 state — 카운트 완료 시 트리거
  const [pulsed, setPulsed] = useState(false);
  // motion value — animate() 로 0 → target 이동
  const mv = useMotionValue(reducedMotion ? target : 0);

  // motion value 변화를 구독해 정수 state 업데이트
  useMotionValueEvent(mv, "change", (latest) => {
    setDisplay(Math.round(latest));
  });

  useEffect(() => {
    if (reducedMotion) {
      // 접근성: 즉시 최종 값
      setDisplay(target);
      return;
    }

    // 화면 밖이면 0 으로 리셋 — 다음에 다시 들어올 때 0 부터 카운트업
    if (!isInView) {
      mv.set(0);
      setDisplay(0);
      return;
    }

    // 뷰포트 진입 → 0 → target 카운트업 (1.2초 ease-out)
    const controls = animate(mv, target, {
      duration: 1.2,
      ease: "easeOut",
      onComplete: () => {
        // 카운트 완료 시 scale 펄스 1회 (숫자 강조)
        setPulsed(true);
        setTimeout(() => setPulsed(false), 400);
      },
    });

    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInView, target, reducedMotion]);

  return (
    <span
      ref={ref}
      className="inline-block origin-center"
      style={{
        // scale 펄스: 1 → 1.08 → 1 (GPU only transform)
        transform: pulsed ? "scale(1.08)" : "scale(1)",
        transition: pulsed
          ? "transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)"
          : "transform 0.2s ease-out",
      }}
    >
      {display}
    </span>
  );
}

// ─── 메인 컴포넌트 ───────────────────────────────────────────────────────────

/**
 * HomeHero — 히어로 섹션 본체 (옵션 A: 대담한 타이포).
 *
 * 렌더 구조:
 * 1. eyebrow 라이브 카운트 배지 (헤드라인 위, 작은 알약)
 * 2. 메인 카피 2줄 — 크고 굵은 타이포, 「すべての」만 네이비 (stagger 등장)
 * 3. children (검색바, stagger 등장)
 */
export function HomeHero({ count, children }: HomeHeroProps) {
  const reducedMotion = useReducedMotion() ?? false;

  /**
   * 표시용 동아리 수 — 10단위로 내림 후 「+」를 붙여 노출.
   * 정확한 "161" 은 「이게 전부」라는 확정 인상을 주므로,
   * 실제 앱들처럼 "160+" 로 둥글려 "계속 추가 중" 뉘앙스를 준다.
   * 카운트업도 이 내림 값까지 올라간다.
   */
  const displayCount = Math.floor(count / 10) * 10;

  /**
   * fadeUp variant 팩토리 — delay 값만 다른 동일한 "아래서 위로 fade 진입" 애니메이션.
   * reducedMotion 시: initial = animate 와 동일 (즉시 완성 상태).
   */
  const makeFadeUp = (delay: number) => ({
    initial: reducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: reducedMotion
      ? { duration: 0 }
      : {
          duration: 0.5,
          delay,
          ease: EASING,
        },
  });

  return (
    <LazyMotion features={domAnimation}>
      {/* 히어로 섹션 컨테이너 — 하단 간격은 page.tsx 의 space-y-8 이 담당. */}
      <div className="pt-1">
        <div className="space-y-4">
          {/* ── eyebrow: 라이브 카운트 배지 (헤드라인 위, 0.10s 등장) ──
           * 2026 hero 표준: 큰 헤드라인 「위」에 작은 신뢰 배지를 둬 위계를 잡는다.
           * 옅은 네이비 알약 + 깜빡이는 라이브 점(emerald) + 단색 네이비 숫자.
           */}
          <m.div {...makeFadeUp(DELAYS.eyebrow)}>
            {/* 화이트 칩 — 회색 채움 대신 흰 배경 + 헤어라인 보더 + 소프트 섀도.
                (2026 모던 상태칩: fill 이 아니라 border 로 깊이, 점·숫자가 또렷이 튐) */}
            <span className="bg-background border-border/60 inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 shadow-sm">
              {/* 라이브 점 — 데이터가 살아있다는 신호 (ping 펄스) */}
              <span className="relative flex size-2 shrink-0" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              <span className="text-muted-foreground text-xs font-medium">
                {/* 숫자를 부각 — 라벨(xs)보다 크고 굵게(text-base extrabold) */}
                <span className="text-keio-navy text-base font-extrabold tabular-nums">
                  <Counter target={displayCount} reducedMotion={reducedMotion} />+
                </span>{" "}
                団体掲載中 · 毎日更新
              </span>
            </span>
          </m.div>

          {/* ── 메인 카피 ── 크고 굵은 대담한 타이포 + 음수 자간(-0.03em).
           * 색 강조 없이 검정 단색 — 타이포 크기·굵기만으로 임팩트. */}
          <div className="space-y-0.5">
            {/* 1줄째: 0.20s 등장 */}
            <m.h1
              className="text-foreground text-[2rem] leading-[1.08] font-extrabold tracking-[-0.03em]"
              {...makeFadeUp(DELAYS.line1)}
            >
              慶應のすべての
            </m.h1>
            {/* 2줄째: 0.32s 등장 */}
            <m.p
              className="text-foreground text-[2rem] leading-[1.08] font-extrabold tracking-[-0.03em]"
              {...makeFadeUp(DELAYS.line2)}
            >
              サークル・部活動。
            </m.p>
          </div>

          {/* ── children (검색바): 0.48s 등장 ── */}
          <m.div {...makeFadeUp(DELAYS.searchBar)}>{children}</m.div>
        </div>
      </div>
    </LazyMotion>
  );
}
