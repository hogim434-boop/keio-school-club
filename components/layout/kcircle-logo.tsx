"use client";

/**
 * KCircleLogo — "K CLUB" 선 그리기(self-drawing) 워드마크 애니메이션
 *
 * 모션 컨셉:
 *   SVG <text> 요소에 stroke-dashoffset 애니메이션을 걸어 글자 외곽선이
 *   왼쪽(K)에서 오른쪽(B)으로 순차적으로 "그려지는" handwriting 효과.
 *   외곽선이 완성된 직후 fill-opacity 0→1 로 솔리드 마무리 (가독성 확보).
 *
 * 구현 기법: SVG stroke-dasharray + stroke-dashoffset
 *   - strokeDasharray: 글자 외곽선의 전체 길이 (넉넉하게 큰 값 사용 — 정확한 길이 불필요)
 *   - strokeDashoffset: 이 값이 0→길이로 줄어들면 선이 그려지는 것처럼 보임
 *   - motion의 animate()로 각 글자(<text>)를 0.12s stagger로 순차 제어
 *
 * 레이아웃 안정성:
 *   SVG의 viewBox와 width/height를 고정해 그리는 도중 헤더가 reflow되지 않음.
 *   fill="transparent" + stroke로 시작해도 공간은 처음부터 점유됨.
 *
 * 색 체계:
 *   "K"    → foreground (oklch(0.145 0 0) — 진한 먹색)
 *   "CLUB" → keio-navy (var(--keio-navy) — 慶應 濃紺)
 *
 * 접근성:
 *   useReducedMotion() → sm 사이즈와 마찬가지로 즉시 솔리드 "K CLUB" 정적 표시
 *   SVG aria-hidden → 장식. 의미는 부모 Link의 aria-label이 담당.
 */

import { useEffect, useRef, useState } from "react";
import { LazyMotion, domAnimation, m, useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";

// ─── props 타입 정의 ───────────────────────────────────────────────────────────

interface KCircleLogoProps {
  /**
   * 워드마크 크기.
   * - sm: 소형 — 정적 솔리드 "K CLUB" 즉시 렌더 (애니메이션 없음)
   * - md: 헤더 표준 (h-20 헤더 안에서 읽히는 크기)
   * - lg: 로그인/회원가입 페이지 (큼직하게 브랜드 임팩트)
   */
  size?: "sm" | "md" | "lg";
  /** 외부 클래스 (Tailwind merge 적용) */
  className?: string;
}

// ─── 사이즈별 SVG 파라미터 테이블 ─────────────────────────────────────────────

/**
 * 각 사이즈별 SVG 렌더링 파라미터.
 *
 * fontSize: SVG text 요소의 font-size 속성값 (px 단위)
 * svgWidth: SVG 요소의 실제 렌더 너비 (viewBox x와 연동)
 * svgHeight: SVG 요소의 실제 렌더 높이
 * baseline: text 요소의 y 속성 (baseline 위치 — 대략 fontSize * 0.8)
 * letterSpacing: SVG letter-spacing (단위 없음, px 기준)
 *
 * 폰트 패밀리는 상속(var(--font-sans))으로 받음.
 * 실제 글자 너비는 폰트마다 달라지므로 svgWidth는 여유 있게 설정.
 */
const SIZE_CFG = {
  sm: {
    fontSize: 14,
    svgWidth: 72,
    svgHeight: 20,
    baseline: 15,
    letterSpacing: 0.4,
    fontWeight: 700,
  },
  md: {
    fontSize: 20,
    svgWidth: 102,
    svgHeight: 28,
    baseline: 22,
    letterSpacing: 0.6,
    fontWeight: 700,
  },
  lg: {
    fontSize: 42,
    svgWidth: 300,
    svgHeight: 56,
    baseline: 42,
    letterSpacing: 1.2,
    fontWeight: 700,
  },
} as const;

// ─── easing 상수 ─────────────────────────────────────────────────────────────

/**
 * expo-out 커브: 빠르게 시작해 부드럽게 멈춤.
 * 선이 그려지는 속도감에 잘 맞음 — 처음엔 빠르게 긋고, 끝에서 자연스럽게 멈춤.
 */
const EXPO_OUT = [0.22, 1, 0.36, 1] as const;

/**
 * 워드마크 텍스트. "K CLUB" 를 **하나의 <text>** 로 렌더한다.
 * 글자를 개별 x 위치로 두면 폰트 종류(예: Geist vs 폴백)에 따라 자간이 벌어져
 * "CLUB" 가 한 단어로 안 묶이는 문제가 있어, 폰트의 자연 자간에 맡긴다.
 * (K 와 CLUB 사이는 공백 1칸 → 단어 구분, CLUB 4글자는 폰트 커닝으로 한 단어처럼 밀착)
 */
const WORDMARK = "K CLUB";
/** 순차 그리기용 글자 배열 (공백 제외). 인덱스 = stagger 순서(K→C→L→U→B). */
const WORDMARK_LETTERS = ["K", "C", "L", "U", "B"] as const;
/** "K CLUB" 문자열에서 각 글자의 인덱스 (K=0, 공백=1, C=2, L=3, U=4, B=5). 측정에 사용. */
const LETTER_CHAR_INDEX = [0, 2, 3, 4, 5] as const;
/** 측정 전 폴백 x 위치(fontSize 배수). K(0)는 항상 정확, 나머지는 측정 후 정확값으로 교체. */
const LETTER_X_FALLBACK = [0, 1.0, 1.65, 2.3, 2.95] as const;

/** 텍스트 색 — 전체 검정(foreground). SVG fill/stroke 는 인라인 var 로 지정. */
const TEXT_COLOR = "var(--foreground)";

// ─── 정적 워드마크 컴포넌트 (sm + reduced-motion 용) ──────────────────────────

/**
 * StaticWordmark — 즉시 솔리드로 표시되는 "K CLUB" 워드마크.
 *
 * sm 사이즈와 prefers-reduced-motion 사용자 모두 이 컴포넌트로 렌더됨.
 * SVG text에 stroke 없이 fill만 — 처음부터 완전히 가독성 있는 상태.
 */
function StaticWordmark({ size, className }: { size: "sm" | "md" | "lg"; className?: string }) {
  const cfg = SIZE_CFG[size];

  return (
    <span className={cn("inline-flex shrink-0 items-center", className)}>
      {/* SVG 워드마크 — 장식이므로 aria-hidden */}
      <svg
        width={cfg.svgWidth}
        height={cfg.svgHeight}
        viewBox={`0 0 ${cfg.svgWidth} ${cfg.svgHeight}`}
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
        overflow="visible"
      >
        {/* "K CLUB" 단일 text — 박스 중앙 정렬(textAnchor middle)로 어긋남 방지 */}
        <text
          x={cfg.svgWidth / 2}
          y={cfg.baseline}
          textAnchor="middle"
          fontSize={cfg.fontSize}
          fontWeight={cfg.fontWeight}
          letterSpacing={cfg.letterSpacing}
          fill={TEXT_COLOR}
          stroke="none"
          fontFamily="var(--font-logo)"
        >
          {WORDMARK}
        </text>
      </svg>
    </span>
  );
}

// ─── 풀 애니메이션 내부 컴포넌트 ──────────────────────────────────────────────

/**
 * AnimatedWordmarkInner — 글자별 순차 self-drawing 워드마크.
 *
 * "K CLUB" 를 글자별 <m.text> 로 그리되, 각 글자의 x 위치는 측정용 단일 <text> 에서
 * getStartPositionOfChar() 로 **폰트 자간을 그대로 측정**해 배치한다.
 * → CLUB 자간은 단어처럼 밀착 유지하면서 K→C→L→U→B **순차** 스트로크가 가능.
 *
 * 각 글자: strokeDashoffset(외곽선 그리기) → fillOpacity(채움) 2단계를 STAGGER 간격으로 순차 재생.
 * (이전엔 단어 전체가 한 번에 그려져 순차감이 없었음)
 */
function AnimatedWordmarkInner({ size, className }: { size: "md" | "lg"; className?: string }) {
  const cfg = SIZE_CFG[size];
  // 글자당 dash — 한 글자 외곽선 길이보다 "충분히 큰" 단일 값.
  // (작으면 dash/gap 패턴이 반복돼 글자 외곽선 중간에 공백이 생겨 선이 끊겨 보임 = 깨짐)
  const dash = cfg.fontSize * 14;

  // 측정용 텍스트 ref + 글자 x 위치 + SVG 박스 폭 (측정 전엔 폴백)
  const measureRef = useRef<SVGTextElement>(null);
  const [xs, setXs] = useState<number[]>(() => LETTER_X_FALLBACK.map((r) => r * cfg.fontSize));
  // 박스 폭을 실제 글자 폭에 맞춰야 중앙 컨테이너에서 어긋나지 않음
  const [boxW, setBoxW] = useState<number>(cfg.svgWidth);

  useEffect(() => {
    const t = measureRef.current;
    if (!t) return;
    try {
      // "K CLUB" 각 글자의 실제 시작 x (폰트 커닝·letterSpacing 반영)
      const measured = LETTER_CHAR_INDEX.map((i) => t.getStartPositionOfChar(i).x);
      setXs(measured);
      // 실제 워드마크 폭 → SVG 박스 폭으로 사용 (좌측 여백 제거 → flex 중앙정렬 정확)
      const w = t.getComputedTextLength();
      if (w > 0) setBoxW(Math.ceil(w) + Math.ceil(cfg.fontSize * 0.12));
    } catch {
      // 측정 미지원/실패 시 폴백 유지
    }
  }, [cfg.fontSize]);

  const DRAW = 0.5; // 글자당 외곽선 그리기
  const FILL = 0.22; // 글자당 채움
  const STAGGER = 0.16; // 글자 간 시작 간격 — 순차감의 핵심

  return (
    <span className={cn("inline-flex shrink-0 items-center", className)}>
      {/* overflow visible: 폰트 descender 가 viewBox 를 벗어날 수 있음. aria-hidden: 장식.
          width/viewBox 는 측정된 실제 글자 폭(boxW) — 좌측 여백 없이 flex 중앙정렬 정확. */}
      <svg
        width={boxW}
        height={cfg.svgHeight}
        viewBox={`0 0 ${boxW} ${cfg.svgHeight}`}
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
        overflow="visible"
      >
        {/* 측정 전용 숨김 텍스트 — getStartPositionOfChar 로 글자 x 측정 (보이지 않음) */}
        <text
          ref={measureRef}
          x={0}
          y={cfg.baseline}
          fontSize={cfg.fontSize}
          fontWeight={cfg.fontWeight}
          letterSpacing={cfg.letterSpacing}
          fontFamily="var(--font-logo)"
          fill="none"
          stroke="none"
          style={{ opacity: 0 }}
          aria-hidden="true"
        >
          {WORDMARK}
        </text>

        {/* 글자별 순차 self-draw — start = i*STAGGER 로 K→C→L→U→B 순서 */}
        {WORDMARK_LETTERS.map((ch, i) => {
          const start = i * STAGGER;
          return (
            <m.text
              key={ch}
              x={xs[i]}
              y={cfg.baseline}
              fontSize={cfg.fontSize}
              fontWeight={cfg.fontWeight}
              fontFamily="var(--font-logo)"
              fill={TEXT_COLOR}
              stroke={TEXT_COLOR}
              strokeWidth={1}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={dash}
              style={{ paintOrder: "stroke fill" }}
              initial={{ strokeDashoffset: dash, fillOpacity: 0, strokeOpacity: 1 }}
              animate={{ strokeDashoffset: 0, fillOpacity: 1, strokeOpacity: 0 }}
              transition={{
                strokeDashoffset: { duration: DRAW, ease: EXPO_OUT, delay: start },
                fillOpacity: { duration: FILL, ease: EXPO_OUT, delay: start + DRAW },
                strokeOpacity: { duration: FILL, ease: EXPO_OUT, delay: start + DRAW },
              }}
            >
              {ch}
            </m.text>
          );
        })}
      </svg>
    </span>
  );
}

// ─── 메인 컴포넌트 (공개 API) ─────────────────────────────────────────────────

/**
 * KCircleLogo — 공개 export.
 *
 * 호출부 3곳(헤더, 로그인폼, 회원가입폼)이 이 이름과 props 시그니처에 의존.
 * export 이름과 props({ size?, className? })는 절대 변경 금지.
 *
 * 분기:
 *   sm → StaticWordmark (즉시 솔리드, 애니메이션 없음)
 *   reduced-motion → StaticWordmark (WCAG SC 2.3.3 준수)
 *   md / lg → LazyMotion > AnimatedWordmarkInner (self-drawing 풀 시퀀스)
 */
export function KCircleLogo({ size = "md", className }: KCircleLogoProps) {
  const reducedMotion = useReducedMotion();

  // sm 또는 reduced-motion: 즉시 솔리드 워드마크 렌더
  if (size === "sm" || reducedMotion) {
    return <StaticWordmark size={size ?? "md"} className={className} />;
  }

  // md / lg: LazyMotion으로 감싸 번들 분할 적용
  // LazyMotion + domAnimation: CSS 애니메이션 기능만 로드 (번들 최적화)
  return (
    <LazyMotion features={domAnimation}>
      <AnimatedWordmarkInner size={size} className={className} />
    </LazyMotion>
  );
}
