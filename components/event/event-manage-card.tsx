/**
 * EventManageCard — 運営者イベント管理一覧のカード1件 (B+D 結合リデザイン)
 *
 * B: 左側に日付アンカーボックス (日/曜日/月の3段表示)
 * D: D-Dayチップによる緊迫感 + アクション階層 + 承認待ちパルス点
 *
 * サーバーコンポーネント維持:
 * - D-Day計算・終了/取消判定はサーバーで処理済み
 * - パルス点はCSS `animate-pulse` のみ (JS/useState 不要)
 */

import Link from "next/link";
import { ArrowRight, CalendarDays, Pencil, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { calcDday, formatEventDateRange, formatJst } from "@/lib/format/jst";
import type { CircleEventRow } from "@/lib/supabase/queries/events-circle";
import { DDayChip } from "@/components/event/d-day-chip";

/** rsvp_mode 표시 라벨 */
const RSVP_MODE_LABEL: Record<CircleEventRow["rsvp_mode"], string> = {
  strict: "事前承認",
  light: "興味あり",
};

/**
 * JST 기준 요일 인덱스 → 일본어 한 글자.
 *
 * date-fns formatInTimeZone("E") 는 기본 로케일이 영어이므로 "Fri" 등을 반환한다.
 * 일본어 한 글자(金 등)를 얻기 위해 UTC+9 오프셋을 직접 계산하여 배열로 매핑한다.
 * 0=일요일 … 6=토요일
 */
const JST_DAY_JA = ["日", "月", "火", "水", "木", "金", "土"] as const;

function jstDayOfWeek(startsAt: string): string {
  // UTC 밀리초 + 9시간 오프셋 → JST Date 의 getUTCDay()
  const jstMs = new Date(startsAt).getTime() + 9 * 60 * 60 * 1000;
  return JST_DAY_JA[new Date(jstMs).getUTCDay()];
}

/**
 * 이벤트 진행 상태 뱃지.
 * 우선순위: 中止 > 終了 > 予定
 */
function EventStatusBadge({ event }: { event: CircleEventRow }) {
  if (event.cancelled_at) {
    return (
      <Badge variant="destructive" className="shrink-0">
        中止
      </Badge>
    );
  }
  if (calcDday(event.starts_at) < 0) {
    return (
      <Badge variant="secondary" className="shrink-0">
        終了
      </Badge>
    );
  }
  return <Badge className="bg-keio-navy text-keio-navy-foreground shrink-0">予定</Badge>;
}

/**
 * 신청 현황 요약 텍스트.
 * strict 모드의 승인 대기(pending)는 별도 펄스 UI로 표시するため、ここでは含めない。
 */
function rsvpSummary(event: CircleEventRow): string {
  if (event.rsvp_mode === "strict") {
    const cap = event.capacity != null ? `/${event.capacity}` : "";
    return `参加 ${event.going_count}${cap}名`;
  }
  // light 모드
  return `気になる ${event.interested_count}・行く ${event.going_count}`;
}

export function EventManageCard({ event, circleId }: { event: CircleEventRow; circleId: string }) {
  const dday = calcDday(event.starts_at);

  // 종료 또는 취소 상태 → 카드 희미화 + 버튼 강조 제거
  const isInactive = dday < 0 || !!event.cancelled_at;

  // 取消済みイベントには D-Day チップを非表示 (中止バッジが状態を伝える)
  const showDday = !event.cancelled_at;

  // strict 모드이고 승인 대기자가 있을 때만 펄스 점 표시
  const showPending = event.rsvp_mode === "strict" && event.pending_count > 0;

  // 날짜 앵커 박스용 표시값
  const dayNum = formatJst(event.starts_at, "d"); // 예: "7"
  const dayJa = jstDayOfWeek(event.starts_at); // 예: "金"
  const monthJa = formatJst(event.starts_at, "M月"); // 예: "6月"

  return (
    <div className={cn("space-y-3 rounded-xl border p-4", isInactive && "opacity-60")}>
      {/* ── 상단 2열: 날짜 앵커 | 이벤트 정보 ── */}
      <div className="flex gap-3">
        {/* 좌측: 날짜 앵커 박스 — 스크린리더에서는 하단 formatEventDateRange 로 날짜를 전달하므로 숨김 */}
        <div
          aria-hidden="true"
          className={cn(
            "flex w-14 shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg py-2",
            isInactive ? "bg-muted" : "bg-keio-navy/10"
          )}
        >
          {/* 일(日) — 크게 표시 */}
          <span
            className={cn(
              "text-2xl leading-none font-bold",
              isInactive ? "text-muted-foreground" : "text-keio-navy"
            )}
          >
            {dayNum}
          </span>
          {/* 요일 — 예: "金曜" */}
          <span
            className={cn(
              "text-[11px] font-medium",
              isInactive ? "text-muted-foreground" : "text-keio-navy/80"
            )}
          >
            {dayJa}曜
          </span>
          {/* 월(月) — 예: "6月" */}
          <span className="text-muted-foreground text-[10px]">{monthJa}</span>
        </div>

        {/* 우측: 제목·메타 정보 */}
        <div className="min-w-0 flex-1 space-y-1.5">
          {/* 제목 + 상태/비공개 뱃지 묶음 */}
          <div className="flex items-start gap-1.5">
            <h3 className="line-clamp-2 min-w-0 flex-1 text-sm leading-snug font-semibold">
              {event.title}
            </h3>
            <div className="flex shrink-0 items-center gap-1">
              {event.visibility === "members" && (
                <Badge variant="outline" className="shrink-0 text-[11px] font-normal">
                  非公開
                </Badge>
              )}
              <EventStatusBadge event={event} />
            </div>
          </div>

          {/* 일시 + D-Day 칩 (캘린더 아이콘 앞에 칩 배치) */}
          <p className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-xs">
            {showDday && <DDayChip dday={dday} />}
            <CalendarDays className="size-3.5 shrink-0" aria-hidden="true" />
            {formatEventDateRange(event.starts_at, event.ends_at, event.is_all_day)}
          </p>

          {/* 신청 현황 + 승인 대기 펄스 점 */}
          <p className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-xs">
            <Users className="size-3.5 shrink-0" aria-hidden="true" />
            <span>{RSVP_MODE_LABEL[event.rsvp_mode]}</span>
            <span aria-hidden="true">·</span>
            <span>{rsvpSummary(event)}</span>
            {showPending && (
              /* 承認待ちあり — amber パルス点 + 人数ラベル */
              <span className="inline-flex items-center gap-1 text-amber-600">
                <span
                  className="size-1.5 animate-pulse rounded-full bg-amber-500"
                  aria-hidden="true"
                />
                {event.pending_count}名待ち
              </span>
            )}
          </p>
        </div>
      </div>

      {/* ── 액션 버튼: 編集(보조) + 申込者管理(주요, grow) ── */}
      <div className="flex items-center gap-2">
        {/* 編集 — 보조 액션, 고정 너비 */}
        <Button asChild variant={isInactive ? "outline" : "ghost"} size="sm" className="shrink-0">
          <Link href={`/circles/${circleId}/events/${event.id}/edit`}>
            <Pencil className="size-4" aria-hidden="true" />
            編集
          </Link>
        </Button>

        {/* 申込者管理 — 주요 액션, 남은 공간 전부 차지 */}
        <Button asChild variant={isInactive ? "outline" : "default"} className="h-9 grow">
          <Link href={`/circles/${circleId}/events/${event.id}/manage`}>
            申込者管理
            <ArrowRight className="ml-1 size-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
