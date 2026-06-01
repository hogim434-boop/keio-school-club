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
 * 설계 원칙:
 * - 이벤트 데이터는 서버에서 fetch 후 props 로 주입 (캘린더 자체는 클라이언트)
 * - react-day-picker 의 DayButton 커스텀으로 도트 렌더링
 * - Sheet 는 클라이언트 상태(selectedDate)로 open/close
 */

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CalendarDays, MapPin, X } from "lucide-react";
import { ja } from "date-fns/locale";
import type { DayButton as DayButtonProps } from "react-day-picker";

import { Calendar } from "@/components/ui/calendar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { EventDetail } from "@/lib/types/domain";
import type { Category } from "@/lib/constants/category";
import { CATEGORY_LABELS } from "@/lib/constants/category";
import {
  CATEGORY_DOT_COLOR,
  CATEGORY_BADGE_COLOR,
  FALLBACK_DOT_COLOR,
  FALLBACK_BADGE_COLOR,
} from "@/lib/constants/category-color";
import { formatJst, JST } from "@/lib/format/jst";
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

  /** 선택된 날짜의 이벤트 목록 */
  const selectedEvents = selectedDate ? (eventsByDate.get(toDateKey(selectedDate)) ?? []) : [];

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

  /** 날짜 클릭 핸들러 */
  function handleDayClick(date: Date) {
    const key = toDateKey(date);
    // 이벤트가 없는 날은 Sheet 열지 않음
    if (!eventsByDate.has(key)) return;
    setSelectedDate(date);
  }

  /**
   * react-day-picker 의 DayButton 커스텀 렌더러
   * — 도트를 날짜 숫자 아래에 표시
   */
  const CustomDayButton = React.useCallback(
    function CustomDayButtonInner({ day, modifiers, className, ...props }: React.ComponentProps<typeof DayButtonProps>) {
      const key = toDateKey(day.date);
      const dayEvents = eventsByDate.get(key) ?? [];
      const hasEvents = dayEvents.length > 0;

      // 도트 최대 3개, 초과분은 숫자로
      const visibleDots = dayEvents.slice(0, 3);
      const overflow = dayEvents.length - 3;

      return (
        <button
          {...props}
          className={cn(
            // shadcn CalendarDayButton 과 동일한 기본 스타일 유지
            "flex aspect-square w-full min-w-[--cell-size] flex-col items-center justify-center gap-0.5 rounded-md p-0 text-sm font-normal transition-colors",
            // 선택·범위·오늘 스타일 (react-day-picker modifiers)
            modifiers.today && "bg-accent text-accent-foreground",
            modifiers.selected && "bg-primary text-primary-foreground",
            modifiers.outside && "text-muted-foreground opacity-40",
            modifiers.disabled && "text-muted-foreground opacity-50",
            !modifiers.selected &&
              !modifiers.today &&
              hasEvents &&
              "hover:bg-accent cursor-pointer",
            !hasEvents && "cursor-default",
            className
          )}
          onClick={() => handleDayClick(day.date)}
        >
          {/* 날짜 숫자 */}
          <span className="leading-none">{day.date.getDate()}</span>

          {/* 카테고리 도트 */}
          {hasEvents && (
            <div className="flex items-center gap-[2px]">
              {visibleDots.map((event, i) => {
                const cat = event.category as Category | null;
                const dotColor = cat ? (CATEGORY_DOT_COLOR[cat] ?? FALLBACK_DOT_COLOR) : FALLBACK_DOT_COLOR;
                return (
                  <span
                    key={`${event.id}-${i}`}
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
        </button>
      );
    },
    // eventsByDate が変わった時だけ再生成 — handleDayClick は安定
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [eventsByDate]
  );

  // Sheet タイトル用の日付表示 (JST)
  const sheetTitle = selectedDate
    ? formatInTimeZone(selectedDate, JST, "M月d日(EEE)", { locale: ja })
    : "";

  return (
    <>
      {/* ── フルワイド カレンダー ── */}
      <Calendar
        mode="single"
        month={currentMonth}
        onMonthChange={handleMonthChange}
        locale={ja}
        // [--cell-size] 를 32px 으로 확장해 도트를 수용
        className="w-full [--cell-size:--spacing(10)]"
        classNames={{
          // 월 헤더 padding 조정
          month_caption: "flex h-[--cell-size] w-full items-center justify-center px-[--cell-size] mb-1",
          // 요일 헤더 텍스트 중앙
          weekday: "text-muted-foreground flex-1 text-center text-xs font-normal select-none",
          // 날짜 행 gap
          week: "mt-1 flex w-full",
          // 날짜 셀 — 도트를 넣기 위해 h-auto
          day: "relative flex-1 p-0 select-none",
          // 바깥 날짜 투명도
          outside: "opacity-40",
        }}
        components={{
          DayButton: CustomDayButton,
        }}
        // showOutsideDays=true — 전월/다음달 날짜도 표시
        showOutsideDays
      />

      {/* ── 날짜 클릭 → 이벤트 Sheet ── */}
      <Sheet open={selectedDate !== null} onOpenChange={(open) => !open && setSelectedDate(null)}>
        <SheetContent side="bottom" className="max-h-[70dvh] overflow-y-auto rounded-t-2xl pb-safe">
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

          {/* イベント一覧 */}
          <div className="flex flex-col divide-y px-4">
            {selectedEvents.length === 0 ? (
              // 이론상 도달하지 않지만 방어 코드
              <p className="text-muted-foreground py-6 text-center text-sm">
                この日の予定はありません
              </p>
            ) : (
              selectedEvents.map((event) => (
                <SheetEventRow key={event.id} event={event} onClose={() => setSelectedDate(null)} />
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
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
  const badgeColor = cat ? (CATEGORY_BADGE_COLOR[cat] ?? FALLBACK_BADGE_COLOR) : FALLBACK_BADGE_COLOR;
  const categoryLabel = cat ? (CATEGORY_LABELS[cat] ?? event.category) : null;

  // 시작 시각 표시 (JST)
  const timeLabel = event.is_all_day
    ? "終日"
    : formatJst(event.starts_at, "HH:mm");

  // 종료 시각 (같은 날, 종일 아닌 경우만 표시)
  let endTimeLabel = "";
  if (!event.is_all_day && event.ends_at) {
    const startDay = formatJst(event.starts_at, "yyyy-MM-dd");
    const endDay = formatJst(event.ends_at, "yyyy-MM-dd");
    if (startDay === endDay) {
      endTimeLabel = formatJst(event.ends_at, "HH:mm");
    }
  }

  return (
    <Link
      href={`/events/${event.id}`}
      onClick={onClose}
      className="group flex items-start gap-3 py-3 transition-opacity hover:opacity-70"
    >
      {/* 時刻帯 */}
      <div className="text-muted-foreground w-[52px] shrink-0 pt-0.5 text-right text-xs leading-snug">
        <span>{timeLabel}</span>
        {endTimeLabel && (
          <>
            <br />
            <span>〜{endTimeLabel}</span>
          </>
        )}
      </div>

      {/* イベント情報 */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="line-clamp-2 text-sm font-semibold leading-snug">{event.title}</p>

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
