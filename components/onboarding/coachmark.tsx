"use client";

/**
 * 코치마크 엔진 — 말풍선(툴팁) 방식 온보딩 가이드.
 *
 * 설계 방침:
 * - 오버레이/딤 없음. 가리킬 요소 옆에 말풍선만 띄움.
 * - 대상 요소는 `data-coachmark="..."` 속성으로 지정 (엔진 교체 시 속성은 그대로).
 * - steps 배열 외부 주입 → 엔진(이 파일)은 교체 가능, 속성 + 데이터는 그대로.
 * - 처음 방문 시에만 표시 (localStorage로 기억).
 * - motion/react LazyMotion + domAnimation + m.* 패턴 (프로젝트 표준, 번들 최소화).
 * - useReducedMotion() 접근성 대응 필수.
 * - z-50 고정 (BottomNav z-30 보다 위).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, LazyMotion, domAnimation, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";

import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────
// 타입 정의
// ─────────────────────────────────────────────

/** 코치마크 단계 1개의 정의 */
export interface CoachmarkStep {
  /** [data-coachmark="..."] 의 값. querySelector 셀렉터로 변환됨. */
  target: string;
  /** 말풍선 제목 (일본어) */
  title: string;
  /** 말풍선 설명 (일본어) */
  description: string;
}

export interface CoachmarkProps {
  /** 각 단계의 타겟·문구 정의 배열 */
  steps: CoachmarkStep[];
  /**
   * localStorage 키. 이 키로 완료 여부를 기억.
   * 예: "kcircle-onboarding-home-v1"
   */
  storageKey: string;
}

// ─────────────────────────────────────────────
// 위치 계산 타입
// ─────────────────────────────────────────────

interface TooltipPosition {
  top: number;
  left: number;
  /** 말풍선이 타겟 아래에 위치 → 화살표는 상단(▲) / 위에 위치 → 하단(▼) */
  placement: "bottom" | "top";
  /** 화살표의 말풍선 내 좌측 오프셋 */
  arrowLeft: number;
}

// 말풍선 고정 너비 (px) — CSS와 일치시킬 것
const TOOLTIP_WIDTH = 272;
// 말풍선 예상 높이 (px) — 공간 계산용 근삿값
const TOOLTIP_HEIGHT = 128;
// 타겟과 말풍선 사이 간격 (px)
const GAP = 10;
// 화면 가장자리 여백 (px)
const EDGE_PADDING = 12;

/** 타겟 DOMRect 기반으로 말풍선 위치를 계산합니다. */
function calcPosition(rect: DOMRect): TooltipPosition {
  const vh = window.innerHeight;
  const vw = window.innerWidth;

  // 아래 공간이 충분하면 아래, 아니면 위
  const placement: "bottom" | "top" =
    rect.bottom + GAP + TOOLTIP_HEIGHT <= vh ? "bottom" : "top";

  const top =
    placement === "bottom"
      ? rect.bottom + GAP
      : rect.top - TOOLTIP_HEIGHT - GAP;

  // 좌우: 타겟 중앙 기준, 화면 경계 안으로 clamp
  const idealLeft = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2;
  const left = Math.min(Math.max(idealLeft, EDGE_PADDING), vw - TOOLTIP_WIDTH - EDGE_PADDING);

  // 화살표 위치: 타겟 중앙이 말풍선 내 어디인지
  const targetCenterX = rect.left + rect.width / 2;
  const arrowLeft = Math.min(
    Math.max(targetCenterX - left - 8, 12),
    TOOLTIP_WIDTH - 28
  );

  return { top, left, placement, arrowLeft };
}

// ─────────────────────────────────────────────
// 코치마크 엔진 (메인 컴포넌트)
// ─────────────────────────────────────────────

/**
 * CoachmarkEngine — 재사용 가능한 말풍선 코치마크 엔진.
 *
 * 다른 방식(스포트라이트/딤 등)으로 교체할 때는 이 컴포넌트만 교체하면 됩니다.
 * 대상 요소의 `data-coachmark` 속성과 steps 배열 데이터는 그대로 유지됩니다.
 */
export function CoachmarkEngine({ steps, storageKey }: CoachmarkProps) {
  // 화면에 표시 여부
  const [visible, setVisible] = useState(false);
  // 현재 단계 인덱스
  const [currentStep, setCurrentStep] = useState(0);
  // 말풍선 위치 (null이면 아직 미측정)
  const [pos, setPos] = useState<TooltipPosition | null>(null);

  // prefers-reduced-motion 감지
  const reducedMotion = useReducedMotion();

  // 재시도 카운터 ref (리렌더 없이 관리)
  const retryRef = useRef(0);

  // ── 위치 측정 ──────────────────────────────
  const measureTarget = useCallback(
    (stepIndex: number) => {
      const step = steps[stepIndex];
      if (!step) return;

      const selector = `[data-coachmark="${step.target}"]`;
      const el = document.querySelector<HTMLElement>(selector);

      if (!el) {
        // 아직 DOM에 없으면 최대 10회, 50ms 간격으로 재시도
        if (retryRef.current < 10) {
          retryRef.current += 1;
          setTimeout(() => measureTarget(stepIndex), 50);
        } else {
          // 그래도 못 찾으면 다음 단계로 skip
          retryRef.current = 0;
          if (stepIndex + 1 < steps.length) {
            setCurrentStep(stepIndex + 1);
          } else {
            handleDismiss();
          }
        }
        return;
      }

      retryRef.current = 0;

      // 뷰포트 밖이면 스크롤 후 측정
      const rect = el.getBoundingClientRect();
      const isOutside =
        rect.bottom < 0 ||
        rect.top > window.innerHeight ||
        rect.right < 0 ||
        rect.left > window.innerWidth;

      if (isOutside) {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        // 스크롤 완료 후 위치 재측정 (smooth scroll 대기)
        setTimeout(() => {
          const updatedRect = el.getBoundingClientRect();
          setPos(calcPosition(updatedRect));
        }, 400);
      } else {
        setPos(calcPosition(rect));
      }
    },
    [steps] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // ── 마운트 시 localStorage 확인 ─────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    // 이미 본 적 있으면 아무것도 표시하지 않음
    if (localStorage.getItem(storageKey)) return;
    setVisible(true);
  }, [storageKey]);

  // ── 단계 변경 시 위치 재측정 ──────────────
  useEffect(() => {
    if (!visible) return;
    setPos(null); // 이전 위치 초기화 (깜박임 방지)
    measureTarget(currentStep);
  }, [currentStep, visible, measureTarget]);

  // ── 리사이즈 / 스크롤 시 위치 재계산 ────────
  useEffect(() => {
    if (!visible) return;

    const recalc = () => {
      const step = steps[currentStep];
      if (!step) return;
      const el = document.querySelector<HTMLElement>(`[data-coachmark="${step.target}"]`);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setPos(calcPosition(rect));
    };

    window.addEventListener("resize", recalc, { passive: true });
    window.addEventListener("scroll", recalc, { passive: true });

    return () => {
      window.removeEventListener("resize", recalc);
      window.removeEventListener("scroll", recalc);
    };
  }, [visible, currentStep, steps]);

  // ── 완료 / 스킵 ────────────────────────────
  function handleDismiss() {
    localStorage.setItem(storageKey, "1");
    setVisible(false);
  }

  function handleNext() {
    if (currentStep < steps.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      // 마지막 단계 → 「完了」
      handleDismiss();
    }
  }

  // 표시 조건 아님
  if (!visible) return null;

  const isLastStep = currentStep === steps.length - 1;
  const step = steps[currentStep];

  return (
    <LazyMotion features={domAnimation}>
      <AnimatePresence mode="wait">
        {pos && (
          <m.div
            key={`step-${currentStep}`}
            // ── 등장 애니메이션 ──
            initial={
              reducedMotion
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.92, y: pos.placement === "bottom" ? -6 : 6 }
            }
            animate={
              reducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }
            }
            exit={
              reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92 }
            }
            transition={
              reducedMotion
                ? { duration: 0.01 }
                : { type: "spring", stiffness: 380, damping: 22, mass: 0.8 }
            }
            // ── 위치 고정 ──
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              width: TOOLTIP_WIDTH,
              zIndex: 50,
            }}
            // 클릭 이벤트가 아래 요소로 통과되지 않도록
            onClick={(e) => e.stopPropagation()}
          >
            {/* 화살표 — 타겟 방향 */}
            <Arrow placement={pos.placement} arrowLeft={pos.arrowLeft} />

            {/* 말풍선 본체 */}
            <div
              className={cn(
                "bg-keio-navy text-white rounded-xl px-4 py-3 shadow-lg",
                "flex flex-col gap-2"
              )}
            >
              {/* 단계 인디케이터 + 스킵 */}
              <div className="flex items-center justify-between">
                <StepDots total={steps.length} current={currentStep} />
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="text-white/60 hover:text-white text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 rounded"
                  aria-label="ガイドをスキップ"
                >
                  スキップ
                </button>
              </div>

              {/* 제목 */}
              <p className="text-sm font-semibold leading-snug">{step.title}</p>

              {/* 설명 */}
              <p className="text-white/80 text-xs leading-relaxed">{step.description}</p>

              {/* 다음/완료 버튼 */}
              <div className="flex justify-end pt-0.5">
                <button
                  type="button"
                  onClick={handleNext}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60",
                    "bg-white text-keio-navy hover:bg-white/90"
                  )}
                  aria-label={isLastStep ? "ガイドを完了" : "次のガイドへ"}
                >
                  {isLastStep ? "完了" : "次へ"}
                </button>
              </div>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </LazyMotion>
  );
}

// ─────────────────────────────────────────────
// 서브 컴포넌트: 화살표
// ─────────────────────────────────────────────

/** 말풍선의 화살표 삼각형 — placement에 따라 상단(▲) 또는 하단(▼) */
function Arrow({
  placement,
  arrowLeft,
}: {
  placement: "bottom" | "top";
  arrowLeft: number;
}) {
  // keio-navy 색상 (Tailwind 커스텀 색상과 맞춰 인라인 스타일 사용)
  const color = "var(--color-keio-navy, #1a2e5e)";

  if (placement === "bottom") {
    // 말풍선이 타겟 아래 → 화살표는 말풍선 상단에 위를 향함 (▲)
    return (
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: -8,
          left: arrowLeft,
          width: 0,
          height: 0,
          borderLeft: "8px solid transparent",
          borderRight: "8px solid transparent",
          borderBottom: `8px solid ${color}`,
        }}
      />
    );
  }

  // 말풍선이 타겟 위 → 화살표는 말풍선 하단에 아래를 향함 (▼)
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        bottom: -8,
        left: arrowLeft,
        width: 0,
        height: 0,
        borderLeft: "8px solid transparent",
        borderRight: "8px solid transparent",
        borderTop: `8px solid ${color}`,
      }}
    />
  );
}

// ─────────────────────────────────────────────
// 서브 컴포넌트: 단계 도트 인디케이터
// ─────────────────────────────────────────────

/** 현재 단계를 점(●●○)으로 표시 */
function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-1" aria-label={`${total}ステップ中${current + 1}ステップ目`}>
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "inline-block rounded-full transition-all",
            i === current
              ? "bg-white w-4 h-1.5"   // 활성 — 가로로 늘어난 흰색 pill
              : "bg-white/40 w-1.5 h-1.5" // 비활성 — 반투명 작은 원
          )}
        />
      ))}
    </div>
  );
}
