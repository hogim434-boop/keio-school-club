import Image from "next/image";
import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";

import type { UpcomingEvent } from "@/lib/supabase/queries/home-curation";

interface UpcomingEventCardProps {
  event: UpcomingEvent;
}

/**
 * 直近のイベントカード (RSC) — ホーム「今後のイベント」セクション専用.
 *
 * 表示情報:
 * - カバー画像 (なければプレースホルダー)
 * - イベントタイトル
 * - 開催日時 (日本語フォーマット)
 * - 場所
 * - 主催サークル名
 *
 * タップ → /circles/{circle_id} へ遷移 (イベント詳細ページは Phase 2 予定).
 */
export function UpcomingEventCard({ event }: UpcomingEventCardProps) {
  const {
    title,
    starts_at,
    ends_at,
    location,
    cover_image_url,
    is_all_day,
    circle_name,
    circle_id,
    circle_slug,
  } = event;

  // 日付・時刻フォーマット (日本語ロケール)
  const startDate = new Date(starts_at);
  const dateLabel = startDate.toLocaleDateString("ja-JP", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });
  const timeLabel = is_all_day
    ? "終日"
    : startDate.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });

  // 終了時刻 (同日の場合のみ表示)
  let endTimeLabel = "";
  if (!is_all_day && ends_at) {
    const endDate = new Date(ends_at);
    const sameDay = startDate.toDateString() === endDate.toDateString();
    if (sameDay) {
      endTimeLabel = endDate.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
    }
  }

  return (
    <Link
      href={`/circles/${circle_slug ?? circle_id}`}
      className="focus-visible:ring-ring group flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-neutral-50 focus-visible:ring-2 focus-visible:outline-none dark:hover:bg-neutral-900"
    >
      {/* サムネイル */}
      <div className="bg-muted relative size-16 shrink-0 overflow-hidden rounded-lg">
        {cover_image_url ? (
          <Image src={cover_image_url} alt={title} fill sizes="64px" className="object-cover" />
        ) : (
          /* プレースホルダー — カレンダーアイコン中央配置 */
          <div className="text-muted-foreground flex h-full w-full items-center justify-center">
            <CalendarDays className="size-6" aria-hidden="true" />
          </div>
        )}
      </div>

      {/* テキスト領域 */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {/* タイトル */}
        <p className="line-clamp-2 text-sm leading-snug font-semibold">{title}</p>

        {/* 日時 */}
        <div className="text-muted-foreground flex items-center gap-1 text-xs">
          <CalendarDays className="size-3 shrink-0" aria-hidden="true" />
          <span>
            {dateLabel} {timeLabel}
            {endTimeLabel && ` 〜 ${endTimeLabel}`}
          </span>
        </div>

        {/* 場所 */}
        {location && (
          <div className="text-muted-foreground flex items-center gap-1 text-xs">
            <MapPin className="size-3 shrink-0" aria-hidden="true" />
            <span className="truncate">{location}</span>
          </div>
        )}

        {/* 主催サークル */}
        <p className="text-muted-foreground mt-0.5 truncate text-xs">主催: {circle_name}</p>
      </div>
    </Link>
  );
}
