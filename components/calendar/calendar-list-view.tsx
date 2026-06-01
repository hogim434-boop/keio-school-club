/**
 * components/calendar/calendar-list-view.tsx
 *
 * リスト 뷰 — 이벤트를 날짜별 그룹화 sticky 헤더 + 카드로 표시 (Server Component).
 *
 * 표시 구조:
 * ┌───────────────────────┐
 * │  6月3日(火)            │  ← sticky 날짜 헤더
 * ├───────────────────────┤
 * │  [이벤트 카드]          │
 * ├───────────────────────┤
 * │  6月7日(日)            │
 * ├───────────────────────┤
 * │  [이벤트 카드]          │
 * └───────────────────────┘
 *
 * 데이터:
 * - 서버에서 fetch 한 events 를 props 로 주입
 * - 날짜 그룹화는 이 컴포넌트 내에서 JST 기준으로 수행
 *
 * 이벤트 카드 클릭 → /events/{id}
 */

import Link from "next/link";
import Image from "next/image";
import { CalendarDays, MapPin, Clock } from "lucide-react";
import { ja } from "date-fns/locale";
import { formatInTimeZone } from "date-fns-tz";

import { cn } from "@/lib/utils";
import type { EventDetail } from "@/lib/types/domain";
import type { Category } from "@/lib/constants/category";
import { CATEGORY_LABELS } from "@/lib/constants/category";
import {
  CATEGORY_BADGE_COLOR,
  FALLBACK_BADGE_COLOR,
} from "@/lib/constants/category-color";
import { formatJst, JST } from "@/lib/format/jst";

// ─────────────────────────────────────────────
//  날짜 그룹화 헬퍼
// ─────────────────────────────────────────────

interface EventGroup {
  /** JST 기준 날짜 키 "YYYY-MM-DD" */
  dateKey: string;
  /** 表示用 날짜 라벨 (예: "6月7日(日)") */
  dateLabel: string;
  /** 해당 날짜 이벤트 목록 */
  events: EventDetail[];
}

function groupEventsByDate(events: EventDetail[]): EventGroup[] {
  const map = new Map<string, EventGroup>();

  for (const event of events) {
    const key = formatJst(event.starts_at, "yyyy-MM-dd");
    const existing = map.get(key);
    if (existing) {
      existing.events.push(event);
    } else {
      // 일본어 날짜 라벨 생성 (date-fns-tz + ja locale)
      const date = new Date(event.starts_at);
      const label = formatInTimeZone(date, JST, "M月d日(EEE)", { locale: ja });
      map.set(key, { dateKey: key, dateLabel: label, events: [event] });
    }
  }

  // Map 삽입 순서(= starts_at 오름차순)대로 반환
  return Array.from(map.values());
}

// ─────────────────────────────────────────────
//  메인 컴포넌트 (Server Component)
// ─────────────────────────────────────────────

interface CalendarListViewProps {
  events: EventDetail[];
}

export function CalendarListView({ events }: CalendarListViewProps) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
        <CalendarDays className="text-muted-foreground size-10" aria-hidden="true" />
        <p className="text-muted-foreground text-sm">この月の予定はありません</p>
      </div>
    );
  }

  const groups = groupEventsByDate(events);

  return (
    <div className="flex flex-col">
      {groups.map((group) => (
        <div key={group.dateKey}>
          {/* ── sticky 날짜 헤더 ── */}
          <div className="bg-background/90 border-b px-4 py-2 backdrop-blur-sm">
            <h2 className="text-sm font-semibold">{group.dateLabel}</h2>
          </div>

          {/* ── 이벤트 카드 리스트 ── */}
          <div className="flex flex-col divide-y px-4">
            {group.events.map((event) => (
              <ListEventCard key={event.id} event={event} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
//  이벤트 카드
// ─────────────────────────────────────────────

interface ListEventCardProps {
  event: EventDetail;
}

function ListEventCard({ event }: ListEventCardProps) {
  const cat = event.category as Category | null;
  const badgeColor = cat ? (CATEGORY_BADGE_COLOR[cat] ?? FALLBACK_BADGE_COLOR) : FALLBACK_BADGE_COLOR;
  const categoryLabel = cat ? (CATEGORY_LABELS[cat] ?? event.category) : null;

  // 취소 여부 — cancelled_at が入っていれば中止扱い
  const isCancelled = Boolean(event.cancelled_at);

  // 시간 표시
  const timeLabel = event.is_all_day
    ? "終日"
    : formatJst(event.starts_at, "HH:mm");

  // 종료 시각 (같은 날, 종일 아닌 경우)
  let endTimeLabel = "";
  if (!event.is_all_day && event.ends_at) {
    const startDay = formatJst(event.starts_at, "yyyy-MM-dd");
    const endDay = formatJst(event.ends_at, "yyyy-MM-dd");
    if (startDay === endDay) {
      endTimeLabel = formatJst(event.ends_at, "HH:mm");
    }
  }

  const timeDisplay = endTimeLabel ? `${timeLabel} 〜 ${endTimeLabel}` : timeLabel;

  return (
    <Link
      href={`/events/${event.id}`}
      className={cn(
        "group flex items-start gap-3 py-3 transition-opacity hover:opacity-75",
        // 취소된 이벤트는 전체를 회색 계열로 처리
        isCancelled && "opacity-50"
      )}
    >
      {/* サムネイル */}
      <div className="bg-muted relative size-16 shrink-0 overflow-hidden rounded-xl">
        {event.cover_image_url ? (
          <Image
            src={event.cover_image_url}
            alt={event.title}
            fill
            sizes="64px"
            className={cn(
              "object-cover",
              // 취소된 이벤트는 썸네일도 grayscale
              isCancelled && "grayscale"
            )}
          />
        ) : (
          <div className="text-muted-foreground flex h-full w-full items-center justify-center">
            <CalendarDays className="size-6" aria-hidden="true" />
          </div>
        )}
      </div>

      {/* テキスト */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {/* タイトル — 취소된 이벤트는 취소선 적용 */}
        <p
          className={cn(
            "line-clamp-2 text-sm font-semibold leading-snug",
            isCancelled && "line-through text-muted-foreground"
          )}
        >
          {event.title}
        </p>

        {/* 취소 배지 */}
        {isCancelled && (
          <span className="inline-flex w-fit rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">
            中止
          </span>
        )}

        {/* 時刻 */}
        <div className="text-muted-foreground flex items-center gap-1 text-xs">
          <Clock className="size-3 shrink-0" aria-hidden="true" />
          <span>{timeDisplay}</span>
        </div>

        {/* 場所 */}
        {event.location && (
          <div className="text-muted-foreground flex items-center gap-1 text-xs">
            <MapPin className="size-3 shrink-0" aria-hidden="true" />
            <span className="truncate">{event.location}</span>
          </div>
        )}

        {/* 主催サークル名 */}
        <p className="text-muted-foreground truncate text-xs">
          {event.circle_name}
        </p>

        {/* カテゴリバッジ — 취소된 이벤트는 카테고리 배지 미표시 */}
        {categoryLabel && !isCancelled && (
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
