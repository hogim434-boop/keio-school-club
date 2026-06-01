import { UpcomingEventCard } from "@/components/home/upcoming-event-card";
import type { UpcomingEvent } from "@/lib/supabase/queries/home-curation";

interface UpcomingEventsStripProps {
  events: UpcomingEvent[];
}

/**
 * 「今後のイベント」セクション (RSC).
 *
 * getUpcomingEvents から受け取ったイベントリストを縦積みで表示する.
 * イベントが 0 件の場合はセクション自体を非表示 (null return).
 *
 * 各カードは UpcomingEventCard に委譲.
 * 現在はサークル詳細ページへのリンクで代替 (イベント詳細は Phase 2 予定).
 */
export function UpcomingEventsStrip({ events }: UpcomingEventsStripProps) {
  if (events.length === 0) return null;

  return (
    <section className="space-y-1" aria-label="今後のイベント">
      {/* セクションヘッダー */}
      <header className="flex items-center justify-between px-1">
        <h2 className="text-lg font-semibold">今後のイベント</h2>
      </header>

      {/* イベントカードリスト — divide-y でセパレーター */}
      <ul className="divide-border divide-y rounded-xl border">
        {events.map((event) => (
          <li key={event.id}>
            <UpcomingEventCard event={event} />
          </li>
        ))}
      </ul>
    </section>
  );
}
