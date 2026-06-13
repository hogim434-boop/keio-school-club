"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

import { cn } from "@/lib/utils";

// ── 상수 ────────────────────────────────────────────────────────────────────

/** 이 px 이상 당기면 새로고침 트리거 */
const PULL_THRESHOLD = 70;
/** 최대 당김 저항 거리 (px) — 이 이상은 더 당겨지지 않음 */
const PULL_MAX = 100;
/** 인디케이터 원형 크기 (px) */
const INDICATOR_SIZE = 36;
/** 인디케이터가 새로고침 중일 때 상단에서의 거리 (px) */
const INDICATOR_REFRESH_Y = 14;

// ── 타입 ────────────────────────────────────────────────────────────────────

/** 당김 단계: idle → pulling → triggered → refreshing → idle */
type PullPhase = "idle" | "pulling" | "triggered" | "refreshing";

interface PullToRefreshProps {
  /** 감쌀 자식 콘텐츠 */
  children: React.ReactNode;
  className?: string;
}

// ── 컴포넌트 ─────────────────────────────────────────────────────────────────

/**
 * PullToRefresh — 스크롤 최상단에서 아래로 당기면 새로고침하는 네이티브 제스처 래퍼.
 *
 * 동작:
 *   touchstart / touchmove / touchend 로 제스처 추적.
 *   window.scrollY === 0 (최상단) 에서 아래로 당길 때만 활성화.
 *   당긴 거리에 비례해 상단에 인디케이터(RefreshCw 아이콘) 표시.
 *   PULL_THRESHOLD 이상 당기고 손 떼면 router.refresh() 호출.
 *
 * 브라우저 기본 PTR 충돌 방지:
 *   1. overscroll-behavior-y: contain → Chrome Android 기본 PTR 억제.
 *   2. touchmove에서 e.preventDefault() → iOS bounce / 기타 브라우저 PTR 추가 방지.
 *      (touchmove 리스너는 { passive: false } 필수 — 나머지는 passive 로 성능 보호)
 *
 * 성능:
 *   transform / opacity 만 사용 → GPU 가속, 레이아웃 리플로우 0.
 *   데스크탑(마우스)에서는 터치 이벤트가 발화하지 않으므로 자동으로 비활성.
 *
 * 접근성 (prefers-reduced-motion):
 *   당김 transform 최소화 (콘텐츠는 거의 움직이지 않음).
 *   새로고침 기능 자체는 유지 (인디케이터만 최소 이동).
 */
export function PullToRefresh({ children, className }: PullToRefreshProps) {
  const router = useRouter();

  // ── 렌더링용 상태 ──────────────────────────────────────────────────────────
  /** 현재 당긴 거리 (0 ~ PULL_MAX px). 인디케이터·콘텐츠 위치 계산에 사용. */
  const [pullY, setPullY] = useState(0);
  /** 당김 단계 */
  const [phase, setPhase] = useState<PullPhase>("idle");

  // ── 이벤트 핸들러 클로저 스탈레 방지용 ref ────────────────────────────────
  // 이벤트 리스너는 마운트 시점의 클로저를 캡처하므로,
  // 최신 값이 필요한 경우 state 대신 ref 로 참조.
  const pullYRef = useRef(0);
  const phaseRef = useRef<PullPhase>("idle");
  const startYRef = useRef(0);
  const isTouchingRef = useRef(false); // touchstart 이후 여부
  const reducedMotionRef = useRef(false); // prefers-reduced-motion 캐시
  const wrapperRef = useRef<HTMLDivElement>(null);

  // ── prefers-reduced-motion 감지 ────────────────────────────────────────────
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotionRef.current = mq.matches;
    const onChange = (e: MediaQueryListEvent) => {
      reducedMotionRef.current = e.matches;
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // ── 상태 동기 갱신 헬퍼 (ref + state 동시 업데이트) ──────────────────────
  const setPull = useCallback((y: number) => {
    pullYRef.current = y;
    setPullY(y);
  }, []);

  const setPhaseSync = useCallback((p: PullPhase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  // ── 새로고침 트리거 ────────────────────────────────────────────────────────
  const triggerRefresh = useCallback(() => {
    // 콘텐츠 원위치 + 새로고침 단계로 전환
    setPhaseSync("refreshing");
    setPull(0);

    // Next.js Router refresh — 서버에서 최신 데이터를 가져와 현재 페이지를 재렌더
    router.refresh();

    // 1초 후 인디케이터 숨기기 (데이터 로드 완료 예상 시간)
    const timer = setTimeout(() => {
      setPhaseSync("idle");
    }, 1000);

    return () => clearTimeout(timer);
  }, [router, setPull, setPhaseSync]);

  // ── 터치 이벤트 리스너 등록/해제 ─────────────────────────────────────────
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    /**
     * touchstart: 제스처 시작점 기록.
     * - 최상단(scrollY===0)이 아니면 무시 → 일반 스크롤은 건드리지 않음.
     * - 새로고침 중이면 무시 → 중복 트리거 방지.
     */
    const handleTouchStart = (e: TouchEvent) => {
      if (phaseRef.current === "refreshing") return;
      if (window.scrollY !== 0) return;

      isTouchingRef.current = true;
      startYRef.current = e.touches[0].clientY;
    };

    /**
     * touchmove: 당김 거리 계산 + 인디케이터 위치 업데이트.
     *
     * passive: false 로 등록 — 아래 방향 당김 시 e.preventDefault() 호출이 필요하기 때문.
     * 일반 스크롤(위·아래 이동)에서는 preventDefault 를 호출하지 않으므로 성능 영향 없음.
     */
    const handleTouchMove = (e: TouchEvent) => {
      if (!isTouchingRef.current) return;
      if (phaseRef.current === "refreshing") return;

      // 스크롤이 내려간 경우 → 최상단이 아님 → pulling 취소
      if (window.scrollY > 0) {
        isTouchingRef.current = false;
        setPull(0);
        setPhaseSync("idle");
        return;
      }

      const currentY = e.touches[0].clientY;
      const deltaY = currentY - startYRef.current;

      if (deltaY <= 0) {
        // 위로 당기는 경우 → 기본 스크롤 유지 (preventDefault 없음)
        if (pullYRef.current > 0) {
          setPull(0);
          setPhaseSync("idle");
        }
        return;
      }

      // 아래로 당기는 경우 → 브라우저 기본 PTR·bounce 방지
      // overscroll-behavior-y: contain 의 보조로 사용 (iOS Safari 완전 차단)
      e.preventDefault();

      // 저항감 있는 damping: √ 커브로 당길수록 무거워지는 느낌
      // reduced motion: 콘텐츠 이동을 최소화 (기능은 유지)
      const rawDamped = Math.min(Math.sqrt(deltaY) * 5.5, PULL_MAX);
      const damped = reducedMotionRef.current ? Math.min(rawDamped * 0.15, 8) : rawDamped;

      setPull(damped);

      const nextPhase: PullPhase = damped >= PULL_THRESHOLD ? "triggered" : "pulling";
      if (phaseRef.current !== nextPhase) {
        setPhaseSync(nextPhase);
      }
    };

    /**
     * touchend / touchcancel: 손 놓음 처리.
     * - triggered 상태: 새로고침 트리거
     * - 그 외: 인디케이터·콘텐츠 원위치 (spring 애니메이션)
     */
    const handleTouchEnd = () => {
      if (!isTouchingRef.current) return;
      isTouchingRef.current = false;
      startYRef.current = 0;

      if (phaseRef.current === "triggered") {
        triggerRefresh();
      } else if (phaseRef.current !== "refreshing") {
        setPull(0);
        setPhaseSync("idle");
      }
    };

    // passive: true → 브라우저가 스크롤 처리를 병렬로 진행 가능 (성능 최적화)
    wrapper.addEventListener("touchstart", handleTouchStart, { passive: true });
    // passive: false → touchmove 안에서 preventDefault() 를 호출하기 위해 필수
    wrapper.addEventListener("touchmove", handleTouchMove, { passive: false });
    wrapper.addEventListener("touchend", handleTouchEnd, { passive: true });
    wrapper.addEventListener("touchcancel", handleTouchEnd, { passive: true });

    return () => {
      wrapper.removeEventListener("touchstart", handleTouchStart);
      wrapper.removeEventListener("touchmove", handleTouchMove);
      wrapper.removeEventListener("touchend", handleTouchEnd);
      wrapper.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [triggerRefresh, setPull, setPhaseSync]);

  // ── 렌더 계산 ─────────────────────────────────────────────────────────────

  const isRefreshing = phase === "refreshing";
  const isActive = phase !== "idle";

  // 당김 진행률 (0.0 ~ 1.0)
  const progress = Math.min(pullY / PULL_THRESHOLD, 1);

  /**
   * 인디케이터 세로 위치 (translateY 값):
   *   - 당기는 중: pullY=0 → 상단 위 숨김 / pullY 증가 → 아래로 내려와 보임
   *   - 새로고침 중: INDICATOR_REFRESH_Y (14px) 아래에 고정
   */
  const indicatorTranslateY = isRefreshing ? INDICATOR_REFRESH_Y : pullY - INDICATOR_SIZE - 8;

  /**
   * 인디케이터 불투명도:
   *   - idle: 0 (숨김)
   *   - pulling: 당김 절반까지 0→1 fade-in (progress 0→0.5 → opacity 0→1)
   *   - triggered / refreshing: 완전 표시 (1.0)
   */
  const indicatorOpacity = (() => {
    if (!isActive) return 0;
    if (isRefreshing || phase === "triggered") return 1;
    return Math.min(progress * 2, 1);
  })();

  /**
   * 콘텐츠 translateY:
   *   - 당기는 중: pullY 만큼 아래로 밀기 (인디케이터가 보이도록)
   *   - 새로고침 중 / idle: 0 (원위치)
   */
  const contentTranslateY = isRefreshing ? 0 : pullY;

  /**
   * transition 타이밍:
   *   - pulling / triggered 중: "none" (손가락에 직접 따라가야 하므로 transition 없음)
   *   - idle / refreshing 전환 시: spring-like ease 로 부드럽게 원위치 or 고정 위치로 이동
   */
  const isAnimating = phase === "idle" || isRefreshing;

  return (
    // overscroll-behavior-y: contain → Chrome Android 기본 PTR 억제
    <div
      ref={wrapperRef}
      className={cn("relative", className)}
      style={{ overscrollBehaviorY: "contain" }}
    >
      {/* ── 당김 인디케이터 ──────────────────────────────────────────────────
          position: absolute (wrapper 기준) + z-50 → 콘텐츠 위에 오버레이.
          transform / opacity 만 사용 → GPU 가속, 리플로우 없음.
          aria-hidden: 시각적 장식이므로 스크린 리더에서 숨김.
          role="status" + aria-label: 새로고침 중 상태를 스크린 리더에 알림. */}
      <div
        aria-hidden={!isRefreshing}
        role={isRefreshing ? "status" : undefined}
        aria-label={isRefreshing ? "更新中" : undefined}
        className="pointer-events-none absolute inset-x-0 top-0 z-50 flex justify-center"
        style={{
          transform: `translateY(${indicatorTranslateY}px)`,
          opacity: indicatorOpacity,
          // idle/refreshing 전환 시: 부드러운 이동+페이드. 당기는 중: 즉시 추적.
          transition: isAnimating
            ? "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease"
            : "none",
        }}
      >
        {/* 인디케이터 원형 컨테이너 */}
        <div
          className="border-border/60 bg-background flex items-center justify-center rounded-full border shadow-md"
          style={{ width: INDICATOR_SIZE, height: INDICATOR_SIZE }}
        >
          <RefreshCw
            className={cn(
              "size-4 transition-colors duration-200",
              // 임계값 초과 시: 아이콘 강조 (「놓으면 새로고침」 신호)
              phase === "triggered" ? "text-foreground" : "text-muted-foreground",
              // 새로고침 중: 회전 스피너
              isRefreshing && "animate-spin"
            )}
            style={{
              // 새로고침 중이 아닐 때: 당김 진행률에 비례해 270도까지 회전
              // → 사용자가 얼마나 당겼는지 시각적 피드백
              transform: isRefreshing ? undefined : `rotate(${progress * 270}deg)`,
              transition: isRefreshing ? undefined : "none",
            }}
          />
        </div>
      </div>

      {/* ── 콘텐츠 래퍼 ──────────────────────────────────────────────────────
          당기는 동안 translateY 로 아래로 밀기 → 인디케이터가 보이는 공간 확보.
          손 뗄 때: cubic-bezier(0.16,1,0.3,1) expo-out 으로 부드럽게 원위치.
          transform 만 사용 → 레이아웃 리플로우 없음. */}
      <div
        style={{
          transform: contentTranslateY > 0 ? `translateY(${contentTranslateY}px)` : undefined,
          // 당기는 도중엔 transition 없음 (손가락 직접 추적).
          // idle / refreshing 전환 시에만 spring ease 적용.
          transition: isAnimating ? "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)" : "none",
          // 당기는 중만 will-change 힌트 → GPU 레이어 생성.
          // 평상시는 제거해 메모리 낭비 방지.
          willChange: contentTranslateY > 0 ? "transform" : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
}
