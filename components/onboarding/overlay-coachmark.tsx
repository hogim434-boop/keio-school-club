"use client";

/**
 * 오버레이 코치마크 엔진 — 「한 장짜리 오버레이」 방식 온보딩 가이드.
 *
 * 말풍선(단계 이동) 방식과 달리:
 * - 화면을 어둡게 덮되, 각 대상 요소만 SVG mask 로 "구멍"을 뚫어 밝게 보이게(스포트라이트).
 * - 모든 대상 요소를 화살표 + 라벨로 "한 번에" 가리킴.
 * - 단계 이동·버튼 없음. 화면(배경)을 탭하면 닫힘.
 *
 * 설계 방침(말풍선 엔진과 동일):
 * - 대상 요소는 `data-coachmark="..."` 속성으로 지정 (엔진 교체 시 속성은 그대로).
 * - steps 배열 외부 주입 → 엔진(이 파일)만 교체 가능, 속성 + 데이터는 그대로.
 * - 처음 방문 시에만 표시 (localStorage로 기억).
 * - motion/react LazyMotion + domAnimation + m.* 패턴 (프로젝트 표준, 번들 최소화).
 * - useReducedMotion() 접근성 대응.
 * - z-50 고정 (BottomNav z-30 보다 위).
 */

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, LazyMotion, domAnimation, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";

import { cn } from "@/lib/utils";
import type { CoachmarkProps, CoachmarkStep } from "./coachmark";

// ─────────────────────────────────────────────
// 상수
// ─────────────────────────────────────────────

/** 라벨(설명 칩) 너비 (px) */
const LABEL_WIDTH = 240;
/** 화면 가장자리 여백 (px) */
const EDGE_PADDING = 12;
/** 강조 박스가 타겟보다 바깥으로 넓어지는 여백 (px) */
const HIGHLIGHT_PAD = 4;
/** 강조 박스와 라벨 사이 간격 (px) */
const LABEL_GAP = 12;

// ─────────────────────────────────────────────
// 측정 결과 타입
// ─────────────────────────────────────────────

/** 화면에 보이는 대상 1개의 측정 결과 */
interface Highlight {
  step: CoachmarkStep;
  /** 타겟 요소의 화면상 위치/크기 (getBoundingClientRect 기반) */
  rect: { top: number; left: number; width: number; height: number };
  /** 라벨을 타겟 아래(bottom) / 위(top) 중 어디에 둘지 — 타겟이 화면 상단이면 아래에 표시 */
  placement: "top" | "bottom";
}

// ─────────────────────────────────────────────
// 오버레이 코치마크 엔진 (메인 컴포넌트)
// ─────────────────────────────────────────────

/**
 * OverlayCoachmarkEngine — 한 장짜리 오버레이 코치마크 엔진.
 *
 * 다른 방식(말풍선/스포트라이트 등)으로 교체할 때는 wrapper에서 import만 바꾸면 됩니다.
 * 대상 요소의 `data-coachmark` 속성과 steps 배열 데이터는 그대로 유지됩니다.
 */
export function OverlayCoachmarkEngine({ steps, storageKey }: CoachmarkProps) {
  // 화면 표시 여부
  const [visible, setVisible] = useState(false);
  // 현재 화면에 보이는 대상들의 측정 결과
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  // 뷰포트 크기 (px) — SVG 좌표계를 getBoundingClientRect 와 동일한 픽셀로 못박기 위함.
  // "100%" 로 두면 모바일에서 레이아웃 뷰포트(주소창 포함)와 비주얼 뷰포트가 어긋나 구멍이 틀어진다.
  const [viewport, setViewport] = useState({ w: 0, h: 0 });

  const reducedMotion = useReducedMotion();

  // ── 모든 대상 요소 위치 측정 ────────────────
  const measure = useCallback(() => {
    const vh = window.innerHeight;
    // SVG 좌표계 기준이 될 뷰포트 픽셀 크기 갱신
    setViewport({ w: window.innerWidth, h: vh });
    const result: Highlight[] = [];

    for (const step of steps) {
      const el = document.querySelector<HTMLElement>(`[data-coachmark="${step.target}"]`);
      if (!el) continue;

      const r = el.getBoundingClientRect();
      // 크기 0(미렌더) 또는 화면 완전히 밖이면 제외
      if (r.width === 0 || r.height === 0) continue;
      if (r.bottom < 0 || r.top > vh) continue;

      const center = r.top + r.height / 2;
      result.push({
        step,
        rect: { top: r.top, left: r.left, width: r.width, height: r.height },
        // 타겟이 화면 위쪽 절반이면 라벨을 아래, 아래쪽 절반이면 라벨을 위에
        placement: center < vh / 2 ? "bottom" : "top",
      });
    }

    setHighlights(result);
  }, [steps]);

  // ── 마운트 시 localStorage 확인 (첫 방문만) ──
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(storageKey)) return;
    setVisible(true);
  }, [storageKey]);

  // ── 표시되면 측정 (지연 재측정 + resize 대응) ─
  useEffect(() => {
    if (!visible) return;

    measure();
    // 레이아웃/폰트/이미지 로드 후 흔들림 보정용 재측정
    const t1 = setTimeout(measure, 80);
    const t2 = setTimeout(measure, 300);

    window.addEventListener("resize", measure, { passive: true });
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("resize", measure);
    };
  }, [visible, measure]);

  // ── 표시 중 배경 스크롤 잠금 ─────────────────
  // fixed 오버레이는 스크롤을 JS로 추적하면 한 프레임 늦게 따라와 구멍이 어긋난다.
  // 가이드 표시 동안 배경 스크롤을 막아 구멍이 항상 대상과 정확히 정렬되게 한다.
  useEffect(() => {
    if (!visible) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [visible]);

  // ── 닫기 (완료) ─────────────────────────────
  function handleDismiss() {
    localStorage.setItem(storageKey, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <LazyMotion features={domAnimation}>
      <AnimatePresence>
        <m.div
          key="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0.01 : 0.25 }}
          className="fixed inset-0 z-50 touch-none overscroll-contain"
          onClick={handleDismiss}
          role="dialog"
          aria-modal="true"
          aria-label="アプリの使い方ガイド"
        >
          {/* ── SVG 스포트라이트 오버레이 ──────────────────────────────────
              mask의 흰 rect = 오버레이 표시 영역, 검은 rect = 구멍(투명, 원래 화면 보임).
              pointerEvents:none 으로 클릭은 부모 m.div 가 처리.
          */}
          <svg
            aria-hidden="true"
            width={viewport.w}
            height={viewport.h}
            viewBox={`0 0 ${viewport.w} ${viewport.h}`}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              pointerEvents: "none",
            }}
          >
            <defs>
              <mask id="coachmark-spotlight-mask">
                {/* 전체를 흰색으로 채움 → 오버레이가 전체에 적용됨 */}
                <rect width={viewport.w} height={viewport.h} fill="white" />
                {/* 각 강조 대상 영역을 검은색으로 → 그 부분만 오버레이 구멍(투명) */}
                {highlights.map((h) => {
                  const holeTop = h.rect.top - HIGHLIGHT_PAD;
                  const holeLeft = h.rect.left - HIGHLIGHT_PAD;
                  const holeWidth = h.rect.width + HIGHLIGHT_PAD * 2;
                  const holeHeight = h.rect.height + HIGHLIGHT_PAD * 2;
                  return (
                    <rect
                      key={h.step.target}
                      x={holeLeft}
                      y={holeTop}
                      width={holeWidth}
                      height={holeHeight}
                      rx={12}
                      ry={12}
                      fill="black"
                    />
                  );
                })}
              </mask>
            </defs>
            {/* 어두운 오버레이 — mask 적용으로 구멍 영역은 투명하게 보임 */}
            <rect
              width={viewport.w}
              height={viewport.h}
              fill="black"
              fillOpacity={0.65}
              mask="url(#coachmark-spotlight-mask)"
            />
          </svg>

          {/* 상단 헤더 안내 */}
          <div className="absolute top-[env(safe-area-inset-top)] left-1/2 mt-6 -translate-x-1/2 px-4 text-center">
            <p className="text-base font-bold text-white">KCircleの使い方</p>
            <p className="mt-1 text-xs text-white/70">画面をタップで閉じます</p>
          </div>

          {/* 각 대상 강조 + 라벨 (한 번에 모두 표시) */}
          {highlights.map((h, i) => (
            <HighlightItem
              key={h.step.target}
              item={h}
              reducedMotion={!!reducedMotion}
              delay={reducedMotion ? 0 : 0.1 + i * 0.08}
            />
          ))}
        </m.div>
      </AnimatePresence>
    </LazyMotion>
  );
}

// ─────────────────────────────────────────────
// 서브 컴포넌트: 대상 1개 강조 + 라벨
// ─────────────────────────────────────────────

/** 대상 요소를 흰 테두리로 강조하고, 그 옆에 화살표 + 설명 라벨을 표시 */
function HighlightItem({
  item,
  reducedMotion,
  delay,
}: {
  item: Highlight;
  reducedMotion: boolean;
  delay: number;
}) {
  const { rect, placement, step } = item;

  // 강조 박스 — 타겟보다 약간 넓게
  const boxTop = rect.top - HIGHLIGHT_PAD;
  const boxLeft = rect.left - HIGHLIGHT_PAD;
  const boxWidth = rect.width + HIGHLIGHT_PAD * 2;
  const boxHeight = rect.height + HIGHLIGHT_PAD * 2;

  // 라벨 가로 위치 — 타겟 중앙 정렬 후 화면 경계 안으로 clamp
  const centerX = rect.left + rect.width / 2;
  const labelLeft = Math.min(
    Math.max(centerX - LABEL_WIDTH / 2, EDGE_PADDING),
    window.innerWidth - LABEL_WIDTH - EDGE_PADDING
  );

  // 화살표의 라벨 내 좌측 오프셋 — 타겟 중앙을 향하게
  const arrowLeft = Math.min(Math.max(centerX - labelLeft - 8, 12), LABEL_WIDTH - 28);

  // 라벨 세로 위치 — 강조 박스 아래(bottom) 또는 위(top)
  const labelStyle: React.CSSProperties =
    placement === "bottom"
      ? { top: boxTop + boxHeight + LABEL_GAP, left: labelLeft, width: LABEL_WIDTH }
      : {
          // 위에 둘 때는 bottom 기준으로 배치 (화면 하단 요소용)
          bottom: window.innerHeight - boxTop + LABEL_GAP,
          left: labelLeft,
          width: LABEL_WIDTH,
        };

  const enterAnim = reducedMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 } }
    : {
        initial: { opacity: 0, scale: 0.9 },
        animate: { opacity: 1, scale: 1 },
      };

  return (
    <>
      {/* 강조 박스 — 흰 테두리 + 부드러운 글로우. 클릭은 배경으로 통과 */}
      <m.div
        aria-hidden="true"
        initial={enterAnim.initial}
        animate={enterAnim.animate}
        transition={
          reducedMotion
            ? { duration: 0.01 }
            : { type: "spring", stiffness: 380, damping: 24, delay }
        }
        style={{
          position: "fixed",
          top: boxTop,
          left: boxLeft,
          width: boxWidth,
          height: boxHeight,
          pointerEvents: "none",
        }}
        className="rounded-xl shadow-[0_0_0_4px_rgba(255,255,255,0.25)] ring-2 ring-white"
      />

      {/* 화살표 + 설명 라벨 */}
      <m.div
        initial={enterAnim.initial}
        animate={enterAnim.animate}
        transition={
          reducedMotion
            ? { duration: 0.01 }
            : { type: "spring", stiffness: 380, damping: 24, delay: delay + 0.05 }
        }
        style={{ position: "fixed", ...labelStyle }}
      >
        {/* 화살표 — placement에 따라 라벨 위/아래에서 타겟을 가리킴 */}
        <Arrow placement={placement} arrowLeft={arrowLeft} />

        {/* 라벨 칩 */}
        <div className="rounded-xl bg-white px-3.5 py-2.5 shadow-lg">
          <p className="text-keio-navy text-sm leading-snug font-bold">{step.title}</p>
          <p className={cn("text-foreground/70 mt-0.5 text-xs leading-relaxed")}>
            {step.description}
          </p>
        </div>
      </m.div>
    </>
  );
}

// ─────────────────────────────────────────────
// 서브 컴포넌트: 화살표
// ─────────────────────────────────────────────

/** 라벨의 흰 삼각형 화살표 — placement에 따라 위(▲)/아래(▼) */
function Arrow({ placement, arrowLeft }: { placement: "top" | "bottom"; arrowLeft: number }) {
  if (placement === "bottom") {
    // 라벨이 타겟 아래 → 화살표는 라벨 상단에서 위(▲)를 향함
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
          borderBottom: "8px solid white",
        }}
      />
    );
  }

  // 라벨이 타겟 위 → 화살표는 라벨 하단에서 아래(▼)를 향함
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
        borderTop: "8px solid white",
      }}
    />
  );
}
