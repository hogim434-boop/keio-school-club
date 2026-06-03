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

import { CalendarDays } from "lucide-react";
import { ja } from "date-fns/locale";
import { formatInTimeZone } from "date-fns-tz";

import type { EventDetail } from "@/lib/types/domain";
import { formatJst, JST } from "@/lib/format/jst";

import { ListEventCard } from "./list-event-card";

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
          {/* cal-list-date-header: globals.css 의 scroll-driven animation 타겟 클래스 */}
          {/* sticky top-0 z-10: 스크롤 시 상단에 고정 (z-index 로 카드 위에 올라옴) */}
          <div className="cal-list-date-header bg-background/90 sticky top-0 z-10 border-b px-4 py-2 backdrop-blur-sm">
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

// ListEventCard 는 list-event-card.tsx 로 분리 (P10 viewport stagger reveal 적용)
