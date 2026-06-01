/**
 * components/event/event-meta-grid.tsx
 *
 * 이벤트 메타 정보 그리드 — 일시 (JST) · 장소 · 정원 · RSVP 마감 · D-day 자리.
 *
 * 서클 상세의 SummaryGrid(circles/[id]/page.tsx) 와 동일한 디자인 언어:
 * - divide-y 세로 행 리스트 (앱 네이티브 설정 화면 느낌)
 * - 아이콘 w-6 고정 너비 + 라벨 + 값 세로 스택
 * - 취소된 이벤트(cancelled_at)는 상단에 cancellation_reason 행 추가
 *
 * 이 컴포넌트는 Server Component (no 'use client').
 * JST 변환은 lib/format/jst.ts 의 formatJst / formatEventDateRange 사용.
 *
 * Wave 2 placeholder:
 * - RSVP 신청 현황(going_count / capacity) → T-018
 * - D-day 카운트다운 → T-018
 */

import { Calendar, MapPin, Users, Clock, AlertCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatEventDateRange, formatJst } from "@/lib/format/jst";
import type { EventDetail } from "@/lib/types/domain";
import { DdayBadge } from "@/components/event/d-day-badge";

// ─────────────────────────────────────────────────────────────────────────────
// 타입
// ─────────────────────────────────────────────────────────────────────────────

interface EventMetaGridProps {
  event: Pick<
    EventDetail,
    | "starts_at"
    | "ends_at"
    | "is_all_day"
    | "location"
    | "capacity"
    | "rsvp_deadline"
    | "cancelled_at"
    | "cancellation_reason"
    // starts_at 은 이미 포함 — DdayBadge 에도 전달
  >;
}

/** 메타 행 1건 */
interface MetaRow {
  label: string;
  value: string;
  icon: LucideIcon;
  /** true 면 값을 keio-navy 강조색으로 표시 */
  emphasis?: boolean;
  /** true 면 값을 destructive 색으로 표시 (취소 상태) */
  danger?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// 컴포넌트
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 이벤트 메타 정보 그리드 (Server Component).
 *
 * 표시 항목:
 * | 순번 | 라벨         | 아이콘     | 소스                                       |
 * |------|--------------|-----------|-------------------------------------------|
 * | 1    | 日時         | Calendar  | starts_at / ends_at / is_all_day (JST)    |
 * | 2    | 場所         | MapPin    | location (null 이면 「未定」)               |
 * | 3    | 定員         | Users     | capacity (null 이면 「制限なし」)           |
 * | 4    | 申込締切     | Clock     | rsvp_deadline (null 이면 「当日まで」)     |
 *
 * Wave 2 placeholder: D-day 배지 (T-018 에서 연결)
 */
export function EventMetaGrid({ event }: EventMetaGridProps) {
  const isCancelled = Boolean(event.cancelled_at);

  // ── 각 항목 값 계산 ──────────────────────────────────────────────────────
  const dateRangeLabel = formatEventDateRange(
    event.starts_at,
    event.ends_at,
    event.is_all_day
  );

  const locationLabel = event.location ?? "未定";

  // 정원 — null 이면 「制限なし」, 숫자면 「n名」
  const capacityLabel = event.capacity != null ? `${event.capacity}名` : "制限なし";

  // RSVP 마감 — null 이면 「当日まで」
  const deadlineLabel =
    event.rsvp_deadline != null
      ? formatJst(event.rsvp_deadline, "yyyy/MM/dd HH:mm")
      : "当日まで";

  // ── 행 데이터 배열 ────────────────────────────────────────────────────────
  const rows: MetaRow[] = [
    {
      label: "日時",
      value: dateRangeLabel,
      icon: Calendar,
      emphasis: true,
    },
    {
      label: "場所",
      value: locationLabel,
      icon: MapPin,
    },
    {
      label: "定員",
      value: capacityLabel,
      icon: Users,
    },
    {
      label: "申込締切",
      value: deadlineLabel,
      icon: Clock,
    },
  ];

  return (
    <section className="space-y-3">
      {/* 취소 배너 — cancelled_at が入っている場合のみ表示 */}
      {isCancelled && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 space-y-1"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="text-destructive size-4 shrink-0" aria-hidden />
            <p className="text-destructive text-sm font-bold">中止されました</p>
          </div>
          {/* 취소 사유 — cancellation_reason が入っているときのみ表示 */}
          {event.cancellation_reason && (
            <p className="text-destructive/80 text-xs pl-6 leading-relaxed">
              理由: {event.cancellation_reason}
            </p>
          )}
        </div>
      )}

      {/*
       * メタ行リスト — divide-y で各行に区切り線
       * SummaryGrid(circles/[id]/page.tsx) と同じ設定リスト UI スタイル
       */}
      <dl className="divide-border divide-y">
        {rows.map(({ label, value, icon: Icon, emphasis, danger }) => (
          <div key={label} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
            {/* 아이콘 — 고정폭 w-6, muted 색 */}
            <Icon className="text-muted-foreground size-5 w-6 shrink-0" aria-hidden />
            {/* 라벨 + 값 세로 스택 */}
            <div className="flex min-w-0 flex-1 flex-col">
              <dt className="text-muted-foreground text-xs">{label}</dt>
              <dd
                className={cn(
                  "text-sm font-semibold",
                  danger
                    ? "text-destructive"
                    : emphasis
                      ? "text-keio-navy"
                      : "text-foreground"
                )}
              >
                {value}
              </dd>
            </div>
          </div>
        ))}
      </dl>

      {/* D-day 배지 — T-018: 메타 그리드 하단에 남은 일수 요약 표시 */}
      {!isCancelled && (
        <div className="flex items-center gap-2 pt-1">
          {/* 짧은 설명 라벨 */}
          <span className="text-muted-foreground text-xs">開催まで</span>
          <DdayBadge startsAt={event.starts_at} />
        </div>
      )}
    </section>
  );
}
