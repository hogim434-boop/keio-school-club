"use client";

/**
 * components/event/calendar-add-button.tsx
 *
 * 「カレンダーに追加」 버튼 — T-017 산출물 (F035).
 *
 * 클라이언트 컴포넌트인 이유:
 * - Popover 의 열기/닫기 상태 관리 (shadcn Popover = 'use client' 컴포넌트).
 * - Apple ICS 다운로드는 data: URI 를 클릭하는 브라우저 동작이 필요.
 * - Google Calendar 새 탭 열기 (window.open).
 *
 * 두 가지 분기:
 * 1. Google Calendar — `buildGoogleCalendarUrl()` 로 URL 생성 → 새 탭.
 * 2. Apple Calendar (.ics) — `buildIcsString()` 로 ICS 생성 → data URI 다운로드.
 *    <a download="event.ics"> 로 파일명 지정 (브라우저가 캘린더 앱으로 열도록 유도).
 *
 * 주의: 이 컴포넌트는 이미 클라이언트에 내려온 `event` prop 을 그대로 사용.
 * Server Component(page.tsx) → Client Component(CalendarAddButton) 로 직렬화 가능한
 * 단순 객체를 넘겨야 한다 (EventDetail 은 전부 직렬화 가능 타입).
 */

import { CalendarPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { buildIcsString, buildGoogleCalendarUrl } from "@/lib/ics";
import type { EventDetail } from "@/lib/types/domain";

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface CalendarAddButtonProps {
  /** 캘린더에 추가할 이벤트 — Server Component 에서 직렬화해 전달 */
  event: EventDetail;
  /** 버튼 추가 클래스 (레이아웃 조정용) */
  className?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 컴포넌트
// ─────────────────────────────────────────────────────────────────────────────

/**
 * カレンダーに追加 버튼 (Popover).
 *
 * 클릭 시 Popover 가 열리고 두 가지 선택지를 제공:
 * - Googleカレンダー: 새 탭에서 Google Calendar 새 이벤트 페이지 열기.
 * - Appleカレンダー: .ics 파일 다운로드 → 캘린더 앱이 자동으로 열림.
 */
export function CalendarAddButton({ event, className }: CalendarAddButtonProps) {
  // ── Google Calendar URL (memoize 없이 렌더 시 생성 — 호출 비용 미미) ────
  const googleUrl = buildGoogleCalendarUrl(event);

  // ── Apple ICS data URI ────────────────────────────────────────────────────
  // encodeURIComponent: data URI 에서 특수문자(콜론, 개행 등) 안전 인코딩
  const icsContent = buildIcsString(event);
  const icsDataUri = `data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`;

  // 다운로드 파일명: 이벤트 제목 기반 (특수문자 제거), 폴백은 event.ics
  const icsFileName = event.title
    ? `${event.title.replace(/[^\w　-鿿゠-ヿ぀-ゟ]/g, "_").slice(0, 50)}.ics`
    : "event.ics";

  return (
    <Popover>
      {/* ── 트리거 버튼 ───────────────────────────────────────────────────── */}
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("gap-1.5", className)}
          aria-label="カレンダーに追加"
        >
          <CalendarPlus className="size-4" aria-hidden />
          <span>カレンダーに追加</span>
        </Button>
      </PopoverTrigger>

      {/* ── Popover 콘텐츠 ─────────────────────────────────────────────────── */}
      <PopoverContent
        className="w-52 p-2"
        align="end"
        sideOffset={6}
      >
        {/* 섹션 제목 */}
        <p className="text-muted-foreground mb-1.5 px-2 text-xs font-medium">
          追加先を選択
        </p>

        {/* ── Google Calendar 버튼 ──────────────────────────────────────── */}
        <a
          href={googleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            // Popover 내부에서 버튼처럼 보이도록 스타일링 (ghost 유사)
            "flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-sm",
            "hover:bg-accent hover:text-accent-foreground transition-colors",
            "focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-1"
          )}
          aria-label="Googleカレンダーで開く（新しいタブ）"
        >
          {/* Google 로고 — SVG 인라인 (외부 이미지 요청 없이 렌더) */}
          <GoogleIcon className="size-4 shrink-0" />
          <span>Googleカレンダー</span>
        </a>

        {/* ── Apple Calendar (.ics) 다운로드 버튼 ──────────────────────── */}
        <a
          href={icsDataUri}
          download={icsFileName}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-sm",
            "hover:bg-accent hover:text-accent-foreground transition-colors",
            "focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-1"
          )}
          aria-label="iCalendar(.ics)ファイルをダウンロード"
        >
          {/* Apple Calendar 아이콘 — 캘린더 달력 모양 */}
          <AppleCalendarIcon className="size-4 shrink-0" />
          <span>Appleカレンダー</span>
        </a>
      </PopoverContent>
    </Popover>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 아이콘 서브 컴포넌트 (lucide-react 에 없는 브랜드 아이콘)
// ─────────────────────────────────────────────────────────────────────────────

/** Google 'G' 로고 SVG — 색상 지정 없이 currentColor 기반 단순화 버전 */
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      aria-hidden
      focusable="false"
    >
      {/* Google 브랜드 컬러 (공식 4색) */}
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

/** Apple Calendar 아이콘 — 달력 + 사과 모양 단순 표현 */
function AppleCalendarIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      focusable="false"
    >
      {/* 달력 외형 */}
      <rect x="2" y="4" width="20" height="18" rx="3" ry="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
      {/* 달력 상단 날짜 줄 */}
      <rect x="2" y="4" width="20" height="5" rx="3" ry="3" />
      {/* 날짜 링 2개 */}
      <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      {/* 달력 숫자 점 */}
      <circle cx="8" cy="14" r="1" />
      <circle cx="12" cy="14" r="1" />
      <circle cx="16" cy="14" r="1" />
      <circle cx="8" cy="18" r="1" />
      <circle cx="12" cy="18" r="1" />
    </svg>
  );
}
