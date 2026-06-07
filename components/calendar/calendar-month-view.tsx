"use client";

/**
 * components/calendar/calendar-month-view.tsx
 *
 * 月表示 캘린더 뷰 (Client Component).
 *
 * 기능:
 * - shadcn Calendar (react-day-picker) 를 풀 너비로 렌더링
 * - 각 날짜 셀에 이벤트 카테고리 컬러 도트 표시 (최대 3개 + n 뱃지)
 * - 날짜 클릭 → 하단 Sheet 에 해당 날짜의 이벤트 리스트 표시
 * - URL searchParams `?month=YYYY-MM` 과 동기화 (앞뒤 달 이동)
 *
 * 모션 패턴 (P1 + P2 + P3):
 * - P1: 오늘 셀 — keio-navy 배경 + rounded-full (iOS 캘린더 표준)
 * - P2: 이벤트 있는 셀 hover → ring, 카테고리 도트 spring pop stagger
 * - P3: 월 이동 시 방향에 맞는 axis slide (AnimatePresence mode="wait")
 *
 * 설계 원칙:
 * - 이벤트 데이터는 서버에서 fetch 후 props 로 주입 (캘린더 자체는 클라이언트)
 * - react-day-picker 의 DayButton 커스텀으로 도트 렌더링
 * - Sheet 는 클라이언트 상태(selectedDate)로 open/close
 * - LazyMotion 은 컴포넌트 최상단에서 한 번만 래핑 (self-contained 패턴)
 */

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CalendarDays, MapPin, Sparkles, X } from "lucide-react";
import { DDayChip } from "@/components/event/d-day-chip";
import { ja } from "date-fns/locale";
import type { DayButton as DayButtonProps } from "react-day-picker";
// LazyMotion: motion 기능을 지연 로딩해 번들 크기를 줄이는 래퍼
// domAnimation: 브라우저 DOM 애니메이션에 필요한 기능 묶음
// m: 경량화된 motion 컴포넌트 (LazyMotion 안에서만 사용)
// AnimatePresence: 컴포넌트 퇴장(exit) 애니메이션을 활성화하는 래퍼
// useReducedMotion: 사용자가 "모션 줄이기" 설정을 켰는지 감지
import { LazyMotion, domAnimation, m, AnimatePresence, useReducedMotion } from "motion/react";

import { Calendar } from "@/components/ui/calendar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { EventDetail } from "@/lib/types/domain";
import type { Category } from "@/lib/constants/category";
import { CATEGORY_LABELS } from "@/lib/constants/category";
import {
  CATEGORY_DOT_COLOR,
  CATEGORY_BADGE_COLOR,
  CATEGORY_BAR_COLOR, // ← P5 pill 좌측 막대 색 (신규)
  FALLBACK_DOT_COLOR,
  FALLBACK_BADGE_COLOR,
  FALLBACK_BAR_COLOR, // ← P5 pill 폴백 막대 색 (신규)
} from "@/lib/constants/category-color";
import { calcDday, formatJst, JST } from "@/lib/format/jst";
import { formatInTimeZone } from "date-fns-tz";

// ─────────────────────────────────────────────
//  타입 정의
// ─────────────────────────────────────────────

interface CalendarMonthViewProps {
  /** 현재 표시 월 (서버에서 searchParams.month → 파싱해서 주입) */
  currentMonth: Date;
  /** 해당 월 이벤트 목록 (서버 fetch 후 주입) */
  events: EventDetail[];
}

// ─────────────────────────────────────────────
//  날짜 키 헬퍼 (JST 기준 "YYYY-MM-DD")
// ─────────────────────────────────────────────

function toDateKey(date: Date): string {
  return formatInTimeZone(date, JST, "yyyy-MM-dd");
}

function eventToDateKey(event: EventDetail): string {
  return formatJst(event.starts_at, "yyyy-MM-dd");
}

// ─────────────────────────────────────────────
//  메인 컴포넌트
// ─────────────────────────────────────────────

export function CalendarMonthView({ currentMonth, events }: CalendarMonthViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Sheet 에 표시할 날짜 상태 (null 이면 Sheet 닫힘)
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null);

  // ── P3: 월 전환 방향 추적 ──────────────────────
  // "yyyy-MM" 형식의 현재 월 키 — AnimatePresence key + direction 판단에 공통 사용
  // P2 의 dot key 에도 재사용해 key가 항상 월과 동기화됨
  const monthKey = formatInTimeZone(currentMonth, JST, "yyyy-MM");

  // 이전 월 키를 기억해두는 ref — 리렌더마다 초기화되지 않음
  const prevMonthKeyRef = React.useRef(monthKey);

  // 슬라이드 방향을 「렌더 중」 즉시 계산 (1 = 다음 달, -1 = 이전 달).
  //
  // ⚠️ 과거 버그: 방향을 useEffect 에서 갱신했더니, AnimatePresence 는 「렌더 시점」 의
  //    custom 값을 읽는데 useEffect 는 「렌더 커밋 後」 실행되어 방향이 한 박자 늦게 적용됨.
  //    → 직전 이동 방향을 따라가 「이전 달(7→6)로 가도 왼쪽으로 슬라이드」 되는 반대 현상 발생.
  //    렌더 바디에서 직접 비교해 즉시 방향을 산출하면 이 지연이 사라진다.
  const direction: 1 | -1 =
    monthKey > prevMonthKeyRef.current
      ? 1 // 다음 달 → 콘텐츠가 왼쪽으로 미끄러짐
      : monthKey < prevMonthKeyRef.current
        ? -1 // 이전 달 → 콘텐츠가 오른쪽으로 미끄러짐
        : 1; // 동일(초기 로드 등)

  // prevMonthKeyRef 갱신만 effect 에 남김 (렌더 중 mutate 는 StrictMode 이중 렌더에서 위험)
  React.useEffect(() => {
    prevMonthKeyRef.current = monthKey;
  }, [monthKey]);

  // 접근성: 사용자가 OS 에서 "모션 줄이기"를 설정한 경우
  const reducedMotion = useReducedMotion();

  /**
   * 날짜별 이벤트 맵 — O(1) 조회를 위해 미리 빌드
   * key: "YYYY-MM-DD" (JST), value: EventDetail[]
   */
  const eventsByDate = React.useMemo(() => {
    const map = new Map<string, EventDetail[]>();
    for (const event of events) {
      const key = eventToDateKey(event);
      const existing = map.get(key) ?? [];
      existing.push(event);
      map.set(key, existing);
    }
    return map;
  }, [events]);

  /** 선택된 날짜의 이벤트 목록 — useMemo 로 안정적인 참조 유지 */
  const selectedEvents = React.useMemo(
    () => (selectedDate ? (eventsByDate.get(toDateKey(selectedDate)) ?? []) : []),
    [selectedDate, eventsByDate]
  );

  /**
   * P6: 빈 날 클릭 시 표시할 추천 이벤트.
   * 선택된 날짜 이후의 미래 이벤트 중 starts_at 오름차순 상위 2개.
   * 선택된 날짜에 이벤트가 있으면 빈 배열 반환 (추천 미표시).
   *
   * 주의: events 는 현재 月 범위만 fetch 되므로 月末 클릭 시 추천 0건 가능.
   *      향후 「他の月も見る」 링크 옵션을 고려할 수 있음.
   */
  const nearbyRecommended = React.useMemo(() => {
    // 이미 이벤트가 있거나 날짜가 미선택이면 추천 불필요
    if (!selectedDate || selectedEvents.length > 0) return [];
    const selectedKey = toDateKey(selectedDate);
    // 선택 날짜보다 미래인 이벤트를 starts_at 순서로 최대 2개 반환
    return events.filter((e) => eventToDateKey(e) > selectedKey).slice(0, 2);
  }, [selectedDate, selectedEvents, events]);

  /**
   * 달 이동 핸들러 — react-day-picker onMonthChange 콜백
   * URL `?month=YYYY-MM` 을 교체해 서버 측 데이터 재조회 트리거
   */
  function handleMonthChange(month: Date) {
    const params = new URLSearchParams(searchParams.toString());
    // JST 기준 YYYY-MM 문자열
    const monthStr = formatInTimeZone(month, JST, "yyyy-MM");
    params.set("month", monthStr);
    // view 파라미터 유지
    params.set("view", "month");
    router.replace(`${pathname}?${params.toString()}`);
  }

  /**
   * 날짜 클릭 핸들러.
   * P6: 빈 날 클릭도 Sheet 오픈 — Sheet 안에서 「予定なし + 추천 2개」 표시.
   * outside 일자(전월/다음달 회색)도 동일 처리 (시드 데이터상 이벤트 거의 없으므로 일관성 우선).
   */
  function handleDayClick(date: Date) {
    setSelectedDate(date);
  }

  /**
   * react-day-picker 의 DayButton 커스텀 렌더러
   *
   * P1: 오늘 셀 — keio-navy 배경 원형 강조
   * P2: 이벤트 있는 셀 → m.button (hover ring) + 도트 → m.span (spring pop stagger)
   * P9: 오늘·선택 셀 — shared layoutId spring 강조 박스 (새로 추가)
   *
   * useCallback 의존성에 monthKey, selectedDate 추가 —
   *   - monthKey: 월 전환 시 dot key 리셋
   *   - selectedDate: 선택 해제 시 today/selected 우선순위 재평가
   */
  const CustomDayButton = React.useCallback(
    function CustomDayButtonInner({
      day,
      modifiers,
      className,
      type,
      disabled,
      "aria-label": ariaLabel,
      "aria-disabled": ariaDisabled,
      "aria-selected": ariaSelected,
      tabIndex,
      role,
    }: React.ComponentProps<typeof DayButtonProps>) {
      const key = toDateKey(day.date);
      const dayEvents = eventsByDate.get(key) ?? [];
      const hasEvents = dayEvents.length > 0;

      // 도트 최대 3개, 초과분은 숫자로
      const visibleDots = dayEvents.slice(0, 3);
      const overflow = dayEvents.length - 3;

      return (
        // ── P2: m.button — hover 시 테두리 ring 효과 ──────────────────────
        // boxShadow inset: transform/opacity 이외 속성이지만 단순 border 효과라
        // reflow 없이 GPU compositing 으로 처리됨 (border 보다 성능상 유리)
        // ❌ 금지: whileHover={{ scale: 1.05 }} 또는 whileHover={{ y: -2 }}
        //    → scale은 옆 셀과 겹치고 y 이동은 레이아웃 흔들림 유발
        // react-day-picker 가 전달하는 HTML drag 이벤트 핸들러(onDrag, onDragEnd 등)를
        // ...props 스프레드로 넘기면 motion onDrag 타입과 충돌 → 필요 props만 명시 전달
        <m.button
          type={type}
          disabled={disabled}
          aria-label={ariaLabel}
          aria-disabled={ariaDisabled}
          aria-selected={ariaSelected}
          tabIndex={tabIndex}
          role={role}
          whileHover={
            // 이벤트 있는 셀에만, reduced-motion 시 비활성
            hasEvents && !reducedMotion
              ? { boxShadow: "inset 0 0 0 1px hsl(var(--border))" }
              : undefined
          }
          transition={{
            duration: 0.18,
            ease: [0.32, 0.72, 0, 1] as [number, number, number, number],
          }}
          className={cn(
            // shadcn CalendarDayButton 과 동일한 기본 스타일 유지
            // 셀 자체엔 rounded-md 만 — 「오늘 원형」 강조는 내부 숫자 span 에만 부여한다.
            // justify-start + pt-1: 「숫자(위) → pill(아래)」 자연스러운 수직 배치.
            // justify-center 시 숫자가 가운데 고정 → pill 이 아래로 밀려 셀을 벗어남.
            // ── 셀 박스 (정사각형 해제, 세로 88px 로 가시성 강화) ──
            //   - aspect-square 제거: 정보량(pill+dot) 우선해 세로로 늘림
            //   - min-h-[88px]: 모바일 viewport 안에 6주 그리드 + 빈 공간 흡수
            //     6주 × 88 + 헤더 230 + 탭바 90 = 848 < viewport 852 (안전)
            //   - min-w-0: flex-1 균등 분배 보장
            //   - relative: P9 강조 박스의 위치 기준
            //   - overflow-hidden: P5 pill 의 truncate 가 셀 폭 안에서 동작하도록
            //   - text-base: 숫자 가독성 향상 (기존 text-sm 14px → 16px)
            "relative flex min-h-[88px] w-full min-w-0 flex-col items-center justify-start gap-1 overflow-hidden rounded-md p-0 pt-2 text-base font-normal transition-colors",
            // 선택 셀 강조는 layoutId 박스(P9)가 담당 → 이 줄 제거
            // modifiers.selected && "bg-primary text-primary-foreground",
            // 바깥 달 날짜 (전월/다음달)
            modifiers.outside && "text-muted-foreground opacity-40",
            // 비활성화된 날짜
            modifiers.disabled && "text-muted-foreground opacity-50",
            // 이벤트 있는 날짜 hover 스타일 (오늘·선택 제외)
            !modifiers.selected &&
              !modifiers.today &&
              hasEvents &&
              "hover:bg-accent cursor-pointer",
            // P6: 빈 날도 클릭 가능 — cursor-pointer 통일
            !hasEvents && "hover:bg-accent cursor-pointer",
            className
          )}
          onClick={() => handleDayClick(day.date)}
        >
          {/* ── P9: 선택 셀 강조 박스 (shared layoutId spring) ─────────────── */}
          {/*
            P9 박스는 「선택된 셀」 에만 표시한다.
            「오늘 셀」 은 P1 의 28px 파란 원형 (숫자 span 안) 만으로 충분히 강조됨 —
            P9 박스를 같이 그리면 셀 전체에 회색 박스가 깔려 「뭔가 깨진 듯한」
            인상을 줌. 「선택」 행위가 있어야 박스 등장 → 시각 노이즈 감소.

            layoutId 의 동작:
            같은 layoutId("calendar-active-cell")를 가진 m.span 들이
            Framer Motion 의 LayoutGroup 에 의해 「동일한 요소」로 인식되어
            셀에서 셀로 spring 으로 미끄러진다.
          */}
          {modifiers.selected && (
            <m.span
              layoutId="calendar-active-cell"
              className="bg-keio-navy/15 absolute inset-1 rounded-md"
              transition={
                reducedMotion
                  ? // 접근성: "모션 줄이기" 사용자는 즉시 표시
                    { duration: 0 }
                  : // spring stiffness 420 / damping 36 — 자연스러운 미끄러짐
                    { type: "spring", stiffness: 420, damping: 36 }
              }
              aria-hidden="true"
            />
          )}

          {/*
            날짜 숫자.
            ── P1: 오늘 셀 — iOS/Google Calendar 표준 28px 파란 원형 강조 ──
            셀 전체가 아닌 「숫자만」 작은 원으로 감싼다. 셀 전체에 rounded-full 을 걸면
            290px 짜리 거대한 원이 만들어지는 함정을 피한다 (iOS 표준은 약 28~32px).
            relative z-10: P9 강조 박스(z 기본값) 위에 숫자가 표시되도록
          */}
          <span
            className={cn(
              // relative z-10: 강조 박스(absolute)보다 위 레이어에 표시
              // flex size-8 items-center justify-center: 모든 날짜 숫자를 동일한 32px 박스
              //   중앙에 정렬 → 오늘(원형 배지)과 일반 숫자의 세로 baseline 통일.
              //   (기존엔 today 일 때만 박스를 줘서 3만 다른 숫자보다 아래로 보이던 문제 해결)
              "relative z-10 flex size-8 items-center justify-center leading-none",
              // 오늘만 네이비 원형 배지로 강조 (위치는 위 공통 박스가 잡고, 색/배경/굵기만 추가)
              modifiers.today && "bg-keio-navy text-keio-navy-foreground rounded-full font-semibold"
            )}
          >
            {day.date.getDate()}
          </span>

          {/* ── P5 + P2: 첫 이벤트 pill + 나머지 dot stagger ──────────────────── */}
          {/*
            구조:
            - visibleDots[0] → 좌측 컬러 막대 + 제목 truncate pill (P5, TimeTree/Google 표준)
            - visibleDots[1..] → 기존 P2 dot spring stagger 유지
            이유: 53px 셀폭(모바일 393px)에서 도트만으로는 어떤 이벤트인지 인식 불가.
            첫 이벤트 제목을 pill 로 노출하면 한눈에 내용 파악 가능.
          */}
          {hasEvents && (
            // relative z-10: P9 강조 박스 위에 pill·dot 이 표시되도록
            // min-w-0 + max-w-full + overflow-hidden: flex item 의 truncate 가
            //   동작하기 위한 「3중 안전망」.
            //   - min-w-0: 자식 텍스트가 부모를 늘리는 것 차단
            //   - max-w-full: 부모 너비 이상 확장 금지 (셀폭 경계 명시)
            //   - overflow-hidden: 어떤 이유로든 자식이 넘쳐도 시각 클리핑
            <div className="relative z-10 flex w-full max-w-full min-w-0 flex-col items-stretch gap-0.5 overflow-hidden px-1">
              {/* 첫 번째 이벤트 — 좌측 컬러 막대 pill (P5) */}
              {(() => {
                const firstEvent = visibleDots[0];
                const firstCat = firstEvent.category as Category | null;
                // 카테고리에 맞는 border-l-2 색상 결정
                const barColor = firstCat
                  ? (CATEGORY_BAR_COLOR[firstCat] ?? FALLBACK_BAR_COLOR)
                  : FALLBACK_BAR_COLOR;
                // ── JS 단계 글자 수 제한 (CSS truncate 의 「2중 안전망」) ──
                // 셀 폭이 56px → ~75px (모바일 393 기준) 로 커진 후 6글자도 안전.
                // 6글자 + "…" 기준 한자/カナ 약 60~70px — 셀(75px) 폭 안에 들어감.
                const MAX_TITLE_CHARS = 6;
                const displayTitle =
                  firstEvent.title.length > MAX_TITLE_CHARS
                    ? firstEvent.title.slice(0, MAX_TITLE_CHARS) + "…"
                    : firstEvent.title;
                return (
                  // m.div: pill 자체도 spring 진입 효과 적용 (P2 stagger 와 동일 토큰)
                  // 진입 전: 위에서 2px 내려오면서 페이드인 (scale 대신 y 이동 — pill 형태에 자연스러움)
                  <m.div
                    key={`${monthKey}-pill-${firstEvent.id}`}
                    // [P8: View Transitions morph 앵커]
                    // view-transition-name: `cal-event-{id}` 를 부여하면
                    // 月 뷰 → リスト 뷰 전환 시 브라우저가 이 pill 과
                    // list-event-card 의 카테고리 배지(같은 name)를 동일 요소로 인식해
                    // 위치·크기가 부드럽게 morph 됩니다.
                    // 주의: 같은 name 이 한 페이지에 2개 이상 존재하면 콘솔 에러 발생.
                    // 月 뷰와 リスト 뷰는 동시에 마운트되지 않으므로 중복 없음.
                    style={{ viewTransitionName: `cal-event-${firstEvent.id}` }}
                    initial={reducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: -2 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={
                      reducedMotion
                        ? { duration: 0 }
                        : // P2 와 동일한 spring 토큰 재사용
                          { type: "spring", stiffness: 480, damping: 26 }
                    }
                    className={cn(
                      // pill 기본 스타일:
                      //   - block + max-w-full: 부모 너비 안에서만 표시
                      //   - truncate: 제목이 길면 말줄임표(…)
                      //   - border-l-2: 카테고리 컬러 막대 (TINT 배경 불사용 — 다크모드 깜빡임 방지)
                      //   - pl-1: 막대와 텍스트 사이 간격
                      //   - text-[10px] / leading-[14px]: 큰 셀에서도 명확히 읽힘 (기존 8px → 10px)
                      "text-foreground/80 block w-full max-w-full truncate rounded-sm border-l-2 pl-1 text-[10px] leading-[14px] font-medium",
                      barColor
                    )}
                  >
                    {displayTitle}
                  </m.div>
                );
              })()}

              {/* 두 번째 이후 이벤트 — 기존 P2 dot stagger 유지 */}
              {visibleDots.length > 1 && (
                <div className="flex items-center gap-[2px]">
                  {visibleDots.slice(1).map((event, i) => {
                    const cat = event.category as Category | null;
                    const dotColor = cat
                      ? (CATEGORY_DOT_COLOR[cat] ?? FALLBACK_DOT_COLOR)
                      : FALLBACK_DOT_COLOR;
                    return (
                      // m.span: 각 도트를 motion 엘리먼트로 만들어 spring 진입 효과 적용
                      // key 에 monthKey 포함 → 월 전환 시 도트들이 새로 마운트되어 팝 애니메이션 재생
                      // delay: (i + 1) * 0.04 — pill(0번) 이후 1번부터 순차 팝
                      <m.span
                        key={`${monthKey}-dot-${event.id}-${i}`}
                        // 진입 전 초기 상태: 크기 0, 투명
                        initial={
                          reducedMotion ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }
                        }
                        // 목표 상태: 원래 크기, 불투명
                        animate={{ scale: 1, opacity: 1 }}
                        transition={
                          reducedMotion
                            ? { duration: 0 }
                            : // stagger: (i+1) * 0.04s — pill 다음 순서부터 팝
                              // spring 토큰: P2 와 동일 (stiffness 480, damping 26)
                              {
                                delay: (i + 1) * 0.04,
                                type: "spring",
                                stiffness: 480,
                                damping: 26,
                              }
                        }
                        className={cn("size-1.5 rounded-full", dotColor)}
                        aria-hidden="true"
                      />
                    );
                  })}
                  {overflow > 0 && (
                    <span className="text-muted-foreground text-[9px] leading-none">
                      +{overflow}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </m.button>
      );
    },
    // monthKey: 월 전환 시 dot key 리셋
    // selectedDate: 선택 해제 시 today 우선순위 재평가 (P9 박스 복귀 조건)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [eventsByDate, monthKey, reducedMotion, selectedDate]
  );

  // Sheet タイトル用の日付表示 (JST)
  const sheetTitle = selectedDate
    ? formatInTimeZone(selectedDate, JST, "M月d日(EEE)", { locale: ja })
    : "";

  return (
    // LazyMotion: 이 컴포넌트 내부의 모든 m.* 요소에 motion 기능 제공
    // self-contained 패턴 — 부모가 LazyMotion을 갖고 있다고 가정하지 않음
    // (circle-detail-template-fixed-trap 메모리 준수)
    <LazyMotion features={domAnimation}>
      <>
        {/* ── P3: 월 전환 동시 슬라이드 (iOS 캘린더식) ──────────────────── */}
        {/*
          relative overflow-hidden — 화면 밖(±100%)으로 빠져나간 패널을 클립.
          과거엔 「마지막 주 잘림」 회귀 때문에 overflow-hidden 을 뺐었지만,
          그 원인은 height 측정 타이밍이었다. translateX 는 height 에 영향을 주지 않고,
          popLayout 에서 「들어오는 패널」 이 레이아웃 height 를 결정하므로 잘림이 없다.
        */}
        <div className="relative overflow-hidden">
          {/*
           * AnimatePresence:
           * - mode="popLayout": 나가는 달을 레이아웃에서 빼 「두 달이 동시에」 미끄러지게 함
           *   (들어오는 달이 자리·height 를 잡아 겹침/점프 없이 iOS 캘린더처럼 함께 슬라이드)
           * - initial={false}: 첫 페이지 로드 시 슬라이드 발화 안 함
           * - custom: 렌더 중 산출한 방향값(direction)을 variants 함수에 전달
           */}
          <AnimatePresence mode="popLayout" initial={false} custom={direction}>
            <m.div
              key={monthKey}
              custom={direction}
              // popLayout 에서 나가는 패널이 폭을 잃지 않도록 w-full 명시
              className="w-full"
              variants={{
                // 진입 전: 방향에 따라 오른쪽(+100%) 또는 왼쪽(-100%) 화면 밖에서 시작
                // opacity 1 유지 → 페이드 없는 순수 슬라이드
                // reduced-motion: x 변위 없이 fade만
                enter: (dir: 1 | -1) =>
                  reducedMotion ? { opacity: 0 } : { x: `${dir * 100}%`, opacity: 1 },
                // 정착: 제자리
                center: { x: "0%", opacity: 1 },
                // 퇴장: 반대 방향 화면 밖으로 빠져나감 (진입 패널과 같은 방향으로 함께 이동)
                exit: (dir: 1 | -1) =>
                  reducedMotion ? { opacity: 0 } : { x: `${dir * -100}%`, opacity: 1 },
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={
                reducedMotion
                  ? { duration: 0 }
                  : {
                      // 320ms tween + iOS easing — 풀 슬라이드라 약간 길게
                      duration: 0.32,
                      ease: [0.32, 0.72, 0, 1] as [number, number, number, number],
                    }
              }
            >
              {/* ── フルワイド カレンダー ── */}
              <Calendar
                mode="single"
                // P9: 선택 셀에 modifiers.selected=true 를 활성화해 layoutId 박스 조건 충족
                selected={selectedDate ?? undefined}
                month={currentMonth}
                onMonthChange={handleMonthChange}
                locale={ja}
                // [--cell-size] 56px (--spacing(14)) — 셀 가로 폭 기준.
                // !p-0: shadcn Calendar 기본 p-3 (24px 패딩) 강제 제거 → 풀-블리드 그리드.
                //   풀-블리드 시 모바일 셀 폭 ~56px, 데스크탑 ~180px 까지 가용.
                // 세로는 min-h-20 로 별도 제어 (정사각형 해제).
                className="w-full !p-0 [--cell-size:--spacing(14)]"
                classNames={{
                  // ── 헤더(년월 + 좌우 화살표) 레이아웃 ──
                  // nav: 화살표 영역. 캡션과 동일 높이(h-11) + items-center 로 년월 텍스트와
                  //   세로 중앙 일치. z-10 으로 캡션 위 레이어.
                  nav: "absolute inset-x-0 top-0 z-10 flex h-11 w-full items-center justify-between px-1",
                  // 좌우 화살표 버튼 — size-9(36px)로 축소.
                  //   기존 size-(--cell-size)=56px 는 캡션 행을 넘어 요일(土)을 덮는 문제가 있었다.
                  //   36px 는 캡션 행(44px) 안에 들어가 요일을 가리지 않는다. hover 시 회색 원형 배경.
                  button_previous:
                    "inline-flex size-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-accent select-none aria-disabled:opacity-40 [&_svg]:size-5",
                  button_next:
                    "inline-flex size-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-accent select-none aria-disabled:opacity-40 [&_svg]:size-5",
                  // 년월 텍스트 — 크게(text-lg 18px) + 굵게. 캡션이 justify-center 라 화면 중앙 정렬.
                  caption_label: "text-lg font-bold select-none",
                  // 月 그리드 테이블 — w-full 필수.
                  //   react-day-picker v9 의 실제 키는 `month_grid`(shadcn 기본의 `table` 키와
                  //   이름이 달라 기본 w-full 이 적용되지 않음). w-full 이 없으면 table-layout:auto
                  //   table 이 콘텐츠 기준으로 부풀어(≈422px) 7칼럼이 화면을 넘쳐 土요일이 잘린다.
                  //   w-full 만으로는 부족: display:table + table-layout:auto 라 콘텐츠
                  //   min-content(≈422px)가 width:100% 보다 우선해 부모(375px)를 넘친다.
                  //   table-fixed(table-layout:fixed)를 더해 width 를 엄격히 지키게 하면
                  //   7칼럼이 균등 분배되어 土요일까지 화면에 들어온다.
                  month_grid: "w-full table-fixed border-collapse",
                  // 월 캡션 (년월 표시) — 화살표(nav)와 동일 높이(h-11) + 중앙 정렬.
                  //   px-[--cell-size] 제거: 화살표가 작아져 텍스트와 겹치지 않으므로 풀폭 중앙 정렬.
                  month_caption: "relative flex h-11 w-full items-center justify-center mb-1",
                  // 요일 헤더 — flex-1 로 균등 분배, 텍스트 살짝 키움
                  weekday:
                    "text-muted-foreground flex-1 text-center text-[13px] font-medium select-none",
                  // 주(week) — 적당한 gap 으로 행간 호흡
                  week: "mt-1 flex w-full",
                  // 날짜 셀 (td) — flex-1 + 정사각형 제약 없음.
                  // !bg-transparent: shadcn Calendar 기본 today 스타일 (bg-accent)
                  //   강제 제거. P1 28px 파란 원이 셀 안에서 자체 강조 수행.
                  // min-w-0 (중요!): td 가 자식 button 내부의 pill 텍스트 폭만큼
                  //   늘어나는 회귀 방지. 이게 없으면 pill 있는 셀이 옆 셀을 밀어내
                  //   요일 헤더와 컬럼 정렬이 어긋남.
                  day: "relative flex-1 min-w-0 p-0 select-none !bg-transparent",
                  // 바깥 날짜 투명도
                  outside: "opacity-40",
                }}
                components={{
                  DayButton: CustomDayButton,
                }}
                // showOutsideDays=true — 전월/다음달 날짜도 표시
                showOutsideDays
              />
            </m.div>
          </AnimatePresence>
        </div>

        {/* ── 날짜 클릭 → 이벤트 Sheet ──────────────────────────────────── */}
        {/* Sheet 는 AnimatePresence 밖에 배치 — 슬라이드와 독립적으로 동작 */}
        <Sheet open={selectedDate !== null} onOpenChange={(open) => !open && setSelectedDate(null)}>
          <SheetContent
            side="bottom"
            showCloseButton={false}
            className="pb-safe max-h-[70dvh] overflow-y-auto rounded-t-2xl"
          >
            <SheetHeader className="pb-2">
              <div className="flex items-center justify-between">
                <SheetTitle className="text-base">{sheetTitle} の予定</SheetTitle>
                <button
                  onClick={() => setSelectedDate(null)}
                  aria-label="閉じる"
                  className="text-muted-foreground hover:text-foreground rounded-full p-1 transition-colors"
                >
                  <X className="size-4" />
                </button>
              </div>
            </SheetHeader>

            {/* イベント一覧 또는 P6: 予定なし + 추천 */}
            {selectedEvents.length === 0 ? (
              <div className="px-4 py-4">
                {/* P6: 予定なし 안내 */}
                <p className="text-muted-foreground text-center text-sm">
                  この日は予定がありません
                </p>

                {/* P6: 근처 추천 이벤트 (있는 경우만) */}
                {nearbyRecommended.length > 0 && (
                  <>
                    <div className="mt-6 mb-2 flex items-center gap-1.5">
                      <Sparkles className="size-3.5 text-amber-500" aria-hidden="true" />
                      <p className="text-xs font-semibold">近くのイベント</p>
                    </div>
                    {/* 카드화로 divide-y 대신 space-y-2 간격 */}
                    <div className="flex flex-col space-y-2">
                      {nearbyRecommended.map((event) => (
                        <SheetEventRow
                          key={event.id}
                          event={event}
                          onClose={() => setSelectedDate(null)}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              /* 카드화로 divide-y 대신 space-y-2 간격 */
              <div className="flex flex-col space-y-2 px-4 pb-4">
                {selectedEvents.map((event) => (
                  <SheetEventRow
                    key={event.id}
                    event={event}
                    onClose={() => setSelectedDate(null)}
                  />
                ))}
              </div>
            )}
          </SheetContent>
        </Sheet>
      </>
    </LazyMotion>
  );
}

// ─────────────────────────────────────────────
//  Sheet 내부 이벤트 행
// ─────────────────────────────────────────────

interface SheetEventRowProps {
  event: EventDetail;
  onClose: () => void;
}

function SheetEventRow({ event, onClose }: SheetEventRowProps) {
  const cat = event.category as Category | null;
  const badgeColor = cat
    ? (CATEGORY_BADGE_COLOR[cat] ?? FALLBACK_BADGE_COLOR)
    : FALLBACK_BADGE_COLOR;
  const categoryLabel = cat ? (CATEGORY_LABELS[cat] ?? event.category) : null;

  // 취소 여부
  const isCancelled = Boolean(event.cancelled_at);

  // D-Day 계산 (JST 기준)
  const dday = calcDday(event.starts_at);

  // 시간 앵커 박스 색상 — 과거(dday<0) 또는 취소 이면 회색 톤
  const anchorDim = dday < 0 || isCancelled;

  // 시작 시각 표시 (JST)
  const startTimeLabel = event.is_all_day ? "終日" : formatJst(event.starts_at, "HH:mm");

  // 종료 시각 (같은 날, 종일 아닌 경우만 표시)
  let endTimeLabel = "";
  if (!event.is_all_day && event.ends_at) {
    const startDay = formatJst(event.starts_at, "yyyy-MM-dd");
    const endDay = formatJst(event.ends_at, "yyyy-MM-dd");
    if (startDay === endDay) {
      endTimeLabel = formatJst(event.ends_at, "HH:mm");
    }
  }

  // D-Day 칩 표시 조건 — 취소 이벤트 및 과거 이벤트는 미표시
  const showDday = !isCancelled && dday >= 0;

  return (
    // Link 가 카드 컨테이너 역할 겸 클릭 영역 — event-manage-card 동일 톤
    <Link
      href={`/events/${event.id}`}
      onClick={onClose}
      className={cn(
        "flex items-start gap-3 rounded-xl border p-3 transition-opacity hover:opacity-75",
        // 취소 이벤트만 전체 희미화 (과거는 캘린더 기록 뷰라 유지)
        isCancelled && "opacity-60"
      )}
    >
      {/* ── 좌측: 시간 앵커 박스 ── */}
      {/*
        스크린리더에는 우측 텍스트가 정보를 전달하므로 이 박스는 숨김.
        manage-card 의 날짜 박스와 동일한 치수(w-14)와 색 규칙 적용.
      */}
      <div
        aria-hidden="true"
        className={cn(
          "flex w-14 shrink-0 flex-col items-center justify-center gap-0.5 self-stretch rounded-lg py-2",
          anchorDim ? "bg-muted" : "bg-keio-navy/10"
        )}
      >
        {event.is_all_day ? (
          // 종일 이벤트 — 「終日」 한 줄 표시
          <span
            className={cn(
              "text-xs font-medium",
              anchorDim ? "text-muted-foreground" : "text-keio-navy"
            )}
          >
            終日
          </span>
        ) : (
          <>
            {/* 시작 시각 — 크게 표시 */}
            <span
              className={cn(
                "text-base leading-none font-bold",
                anchorDim ? "text-muted-foreground" : "text-keio-navy"
              )}
            >
              {startTimeLabel}
            </span>
            {/* 종료 시각 — 같은 날이면 「〜HH:mm」 작게 */}
            {endTimeLabel && (
              <span
                className={cn(
                  "text-[10px] leading-tight",
                  anchorDim ? "text-muted-foreground" : "text-keio-navy/80"
                )}
              >
                〜{endTimeLabel}
              </span>
            )}
          </>
        )}
      </div>

      {/* ── 우측: 이벤트 정보 ── */}
      <div className="min-w-0 flex-1 space-y-1.5">
        {/* 제목 줄 — 취소 이벤트는 취소선 + 「中止」 뱃지 */}
        <div className="flex items-start gap-1.5">
          <p
            className={cn(
              "line-clamp-2 min-w-0 flex-1 text-sm leading-snug font-semibold",
              isCancelled && "text-muted-foreground line-through"
            )}
          >
            {event.title}
          </p>
          {/* 취소 뱃지 */}
          {isCancelled && (
            <span className="bg-destructive/10 text-destructive inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-medium">
              中止
            </span>
          )}
        </div>

        {/* D-Day 칩 — 예정 이벤트에만 표시 */}
        {showDday && (
          <div>
            <DDayChip dday={dday} />
          </div>
        )}

        {/* 場所 */}
        {event.location && (
          <div className="text-muted-foreground flex items-center gap-1 text-xs">
            <MapPin className="size-3 shrink-0" aria-hidden="true" />
            <span className="truncate">{event.location}</span>
          </div>
        )}

        {/* 主催サークル */}
        <div className="text-muted-foreground flex items-center gap-1 text-xs">
          <CalendarDays className="size-3 shrink-0" aria-hidden="true" />
          <span className="truncate">{event.circle_name}</span>
        </div>

        {/* カテゴリバッジ */}
        {categoryLabel && (
          <span
            className={cn(
              "inline-flex w-fit rounded-full px-2 py-0.5 text-[10px] font-medium",
              badgeColor
            )}
          >
            {categoryLabel}
          </span>
        )}
      </div>
    </Link>
  );
}
