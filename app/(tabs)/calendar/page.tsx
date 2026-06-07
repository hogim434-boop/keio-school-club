/**
 * app/(tabs)/calendar/page.tsx
 *
 * カレンダー ページ (Server Component, T-019).
 *
 * URL searchParams:
 * - view=month|list  — 表示切り替え (デフォルト: month)
 * - month=YYYY-MM    — 表示月 (デフォルト: 今月, JST)
 *
 * データフロー:
 * 1. searchParams から view・month を読기
 * 2. 月の開始/終了を UTC 에 변환
 * 3. getUpcomingEventsByRange で events fetch (unstable_cache 60s)
 * 4. CalendarMonthView / CalendarListView 로 분기 렌더링
 *
 * 비로그인 허용 — proxy.ts 에서 /calendar 는 공개 경로로 설정됨.
 */

import { Suspense } from "react";
import { redirect } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";

import { CalendarMonthView } from "@/components/calendar/calendar-month-view";
import { CalendarListView } from "@/components/calendar/calendar-list-view";
import { CalendarViewToggle } from "@/components/calendar/calendar-view-toggle";
import type { CalendarView } from "@/components/calendar/calendar-view-toggle";
import { getUpcomingEventsByRange } from "@/lib/supabase/queries/events-public";
import { JST } from "@/lib/format/jst";
import { PUBLIC_EVENTS_ENABLED } from "@/lib/constants/features";

// ─────────────────────────────────────────────
//  월 범위 계산 헬퍼
//  - 月 최初の日 00:00 JST → UTC
//  - 月 最後の日 23:59:59 JST → UTC
// ─────────────────────────────────────────────

function getMonthRange(year: number, month: number): { from: string; to: string } {
  // JST 기준 첫째 날 00:00:00
  const firstDay = new Date(year, month - 1, 1, 0, 0, 0);
  // JST 기준 마지막 날 23:59:59 — 다음달 1일 - 1초
  const lastDay = new Date(year, month, 0, 23, 59, 59);

  // toISOString() 은 항상 UTC 기준 — JST 00:00 = UTC 전날 15:00
  // 단, DB 의 starts_at 도 UTC 저장이므로 UTC 범위로 비교해야 정확하다.
  // JST 月初 00:00 → UTC -9h: 전달 마지막날 15:00
  // JST 月末 23:59:59 → UTC 당일 14:59:59
  // ※ getTimezoneOffset 을 사용하지 않고 고정 -9h 계산 → 단순·안전
  const jstOffsetMs = 9 * 60 * 60 * 1000; // +09:00

  const fromUtc = new Date(firstDay.getTime() - jstOffsetMs);
  const toUtc = new Date(lastDay.getTime() - jstOffsetMs);

  return {
    from: fromUtc.toISOString(),
    to: toUtc.toISOString(),
  };
}

// ─────────────────────────────────────────────
//  searchParams 파싱
// ─────────────────────────────────────────────

function parseView(raw: string | string[] | undefined): CalendarView {
  const val = Array.isArray(raw) ? raw[0] : raw;
  return val === "list" ? "list" : "month";
}

/**
 * searchParams.month (YYYY-MM) → { year, month } (JST)
 * 잘못된 값은 오늘 달로 폴백.
 */
function parseMonth(raw: string | string[] | undefined): { year: number; month: number } {
  const val = Array.isArray(raw) ? raw[0] : raw;
  if (val && /^\d{4}-\d{2}$/.test(val)) {
    const [y, m] = val.split("-").map(Number);
    if (y >= 2020 && y <= 2030 && m >= 1 && m <= 12) {
      return { year: y, month: m };
    }
  }
  // 今日の JST 年月
  const todayStr = formatInTimeZone(new Date(), JST, "yyyy-MM");
  const [y, m] = todayStr.split("-").map(Number);
  return { year: y, month: m };
}

// ─────────────────────────────────────────────
//  페이지 컴포넌트
// ─────────────────────────────────────────────

interface CalendarPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function CalendarPage({ searchParams }: CalendarPageProps) {
  // 디렉터리 우선 단계: 빈 캘린더 노출 방지 — 홈으로 리다이렉트
  // PUBLIC_EVENTS_ENABLED=true 로 바꾸면 기존 캘린더가 즉시 복구된다
  if (!PUBLIC_EVENTS_ENABLED) {
    redirect("/");
  }

  // Next.js 15 — searchParams 는 Promise
  const params = await searchParams;

  const view = parseView(params.view);
  const { year, month } = parseMonth(params.month);

  // 月範囲を UTC 문자열로 변환
  const { from, to } = getMonthRange(year, month);

  // イベント fetch (캐시: 60s, tags:["events:public"])
  const events = await getUpcomingEventsByRange(from, to);

  // react-day-picker に渡す「表示月」Date (JST 기준 첫째 날, ローカル Date で OK)
  // — CalendarMonthView 내부에서 react-day-picker に month prop 으로 주입
  const currentMonth = new Date(year, month - 1, 1);

  return (
    <main className="flex flex-col">
      {/* ── ヘッダー: タイトル + 표示切替 ── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <h1 className="text-lg font-bold">カレンダー</h1>
        {/* CalendarViewToggle 은 useSearchParams 를 사용하므로 Suspense 필요 */}
        <Suspense
          fallback={
            <div className="h-7 w-28 animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-800" />
          }
        >
          <CalendarViewToggle currentView={view} />
        </Suspense>
      </div>

      {/* ── 本体: 月表示 or リスト ── */}
      {view === "month" ? (
        // CalendarMonthView 은 useSearchParams/useRouter 사용 → Suspense 필요
        <Suspense
          fallback={
            <div className="mx-4 mt-2 h-72 animate-pulse rounded-2xl bg-neutral-100 dark:bg-neutral-900" />
          }
        >
          {/*
            풀-블리드: 그리드를 좌우 화면 끝까지 펼침.
            기존 px-2 제거 — 셀폭 ~38px 의 좁은 그리드 회귀를 해소.
            CalendarMonthView 내부에서 shadcn Calendar 의 p-3 도 같이 제거됨.
          */}
          <CalendarMonthView currentMonth={currentMonth} events={events} />
        </Suspense>
      ) : (
        // CalendarListView 은 Server Component — Suspense 불필요하지만 통일
        <CalendarListView events={events} />
      )}
    </main>
  );
}
