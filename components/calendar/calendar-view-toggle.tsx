"use client";

/**
 * components/calendar/calendar-view-toggle.tsx
 *
 * 月表示 / リスト 의 뷰 전환 토글 (Client Component).
 *
 * - URL searchParams `?view=month|list` 와 동기화.
 *   → 뒤로가기·공유·리로드 시에도 같은 뷰가 유지된다.
 * - router.push 대신 router.replace 사용 — 히스토리 스택에 쌓지 않음.
 * - 일본어 캐피 사용: 月表示 / リスト
 *
 * [애니메이션 전략]
 * - layoutId="calendar-toggle-pill" 을 이용한 sliding pill 패턴.
 *   활성 칸의 흰 pill 이 <m.span> 으로 렌더되며,
 *   Framer Motion 이 두 칸 사이 이동을 spring 으로 보간한다.
 * - LazyMotion + domAnimation 으로 번들 크기를 최소화.
 * - useReducedMotion 으로 접근성 보장 (모션 축소 설정 사용자).
 */

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { CalendarDays, List } from "lucide-react";
import { LazyMotion, domAnimation, m, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

export type CalendarView = "month" | "list";

interface CalendarViewToggleProps {
  /** 현재 활성 뷰 (서버에서 searchParams 로 결정하여 주입) */
  currentView: CalendarView;
}

export function CalendarViewToggle({ currentView }: CalendarViewToggleProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  /**
   * 뷰 전환 핸들러
   * - 현재 searchParams 를 복사해 view 만 교체 → month 파라미터 등 다른 값 유지
   *
   * [P8: View Transitions API]
   * document.startViewTransition 으로 감싸면 브라우저가 전환 전·후의
   * 화면을 각각 스냅샷으로 찍어, 같은 view-transition-name 을 가진 요소들을
   * 자동으로 morph(위치·크기 보간) 합니다.
   * 미지원 브라우저 (Firefox < 129, 구 Safari 등) 는 즉시 router.replace (폴백 안전).
   */
  function switchView(view: CalendarView) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", view);
    const next = `${pathname}?${params.toString()}`;

    // router.replace 실행 함수를 별도 변수로 분리 — startViewTransition 콜백으로 전달
    const update = () => router.replace(next);

    // View Transitions API 가드:
    // - typeof document 체크: SSR/Edge 환경에서 ReferenceError 방지
    // - "startViewTransition" in document: Firefox 128 이하·구 Safari 에서 undefined
    if (typeof document !== "undefined" && "startViewTransition" in document) {
      (
        document as Document & {
          startViewTransition: (callback: () => void) => void;
        }
      ).startViewTransition(update);
    } else {
      // 미지원 브라우저 폴백: 즉시 라우팅
      update();
    }
  }

  return (
    /*
     * LazyMotion 이 두 ToggleButton 을 감싸야 layoutId 매칭이 동작한다.
     * "月表示" 버튼의 pill 과 "リスト" 버튼의 pill 이 같은 layoutId 를 공유하므로,
     * 한쪽이 사라지고 다른 쪽이 나타날 때 Motion 이 연속된 이동으로 처리한다.
     */
    <LazyMotion features={domAnimation}>
      {/* 앱 스타일 pill 토글 — shadcn Tabs 대신 커스텀 구현 (더 compact) */}
      <div
        role="tablist"
        aria-label="表示切り替え"
        className="bg-muted flex items-center gap-0.5 rounded-lg p-0.5"
      >
        <ToggleButton
          label="月表示"
          icon={<CalendarDays className="size-3.5" aria-hidden="true" />}
          isActive={currentView === "month"}
          onClick={() => switchView("month")}
          ariaSelected={currentView === "month"}
        />
        <ToggleButton
          label="リスト"
          icon={<List className="size-3.5" aria-hidden="true" />}
          isActive={currentView === "list"}
          onClick={() => switchView("list")}
          ariaSelected={currentView === "list"}
        />
      </div>
    </LazyMotion>
  );
}

// ─────────────────────────────────────────────
//  내부 버튼 컴포넌트
// ─────────────────────────────────────────────

interface ToggleButtonProps {
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
  ariaSelected: boolean;
}

function ToggleButton({ label, icon, isActive, onClick, ariaSelected }: ToggleButtonProps) {
  /*
   * useReducedMotion: OS/브라우저의 "모션 줄이기" 설정을 감지.
   * true 이면 spring 대신 duration: 0 으로 즉시 전환 — 접근성 배려.
   */
  const reducedMotion = useReducedMotion();

  return (
    /*
     * relative 가 핵심: 자식 <m.span> 이 absolute inset-0 이므로
     * 기준 컨테이너가 되어야 pill 이 버튼 영역 안에 정확히 깔린다.
     */
    <button
      role="tab"
      aria-selected={ariaSelected}
      onClick={onClick}
      className={cn(
        // relative: <m.span absolute inset-0> 의 위치 기준점
        "relative flex items-center gap-1 rounded-md px-3 py-1 text-xs font-medium transition-colors",
        // 활성 여부에 따라 텍스트 색만 전환 (배경은 pill 이 담당)
        isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {/*
       * [Sliding Pill 핵심]
       * - isActive 일 때만 이 <m.span> 이 DOM 에 마운트된다.
       * - layoutId="calendar-toggle-pill" 로 두 버튼의 pill 이 같은 "물리적 개체"임을 선언.
       * - 月表示→リスト 클릭 시: 월표示 버튼의 pill 이 언마운트되고
       *   リスト 버튼의 pill 이 마운트되는데, Motion 이 이를 감지해
       *   pill 이 오른쪽으로 미끄러지는 spring 애니메이션으로 연결한다.
       *
       * spring 파라미터 의미:
       *   stiffness: 500  — 스프링 강도 (높을수록 빠르게 목표에 도달)
       *   damping:   38   — 감쇠 (높을수록 진동 없이 멈춤)
       *   mass:      0.6  — 가상 질량 (낮을수록 가볍고 민첩하게 움직임)
       */}
      {isActive && (
        <m.span
          layoutId="calendar-toggle-pill"
          className="bg-background absolute inset-0 rounded-md shadow-sm"
          transition={
            reducedMotion
              ? { duration: 0 }
              : { type: "spring", stiffness: 500, damping: 38, mass: 0.6 }
          }
        />
      )}

      {/*
       * z-10: pill(<m.span>) 은 absolute 로 버튼 배경에 깔리므로
       * 텍스트·아이콘은 z-10 으로 반드시 pill 위에 위치시켜야 가독성 보장.
       */}
      <span className="relative z-10 flex items-center gap-1">
        {icon}
        {label}
      </span>
    </button>
  );
}
