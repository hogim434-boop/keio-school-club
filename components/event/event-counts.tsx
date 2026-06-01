/**
 * components/event/event-counts.tsx
 *
 * T-016 산출물 — 이벤트 모드별 카운트 표시 Server Component.
 *
 * rsvp_mode 에 따라 두 가지 UI 분기:
 *
 * ── light 모드 ─────────────────────────────────────────────────────────────
 *   「気になる N人 · 行く予定 N人」 참고 표시
 *   - 비교적 가벼운 참가 의사 표명이므로 참고용 인원 숫자만 표시
 *
 * ── strict 모드 ────────────────────────────────────────────────────────────
 *   「定員 N名 · 残り N名 · キャンセル待ち N番目」 정확 표시
 *   - capacity null → 「制限なし」
 *   - 본인이 waiting → 「あなたは キャンセル待ち N番目」 amber 배지로 강조
 *   - rsvp_deadline 지난 경우 → 「申し込みは終了しました」 안내
 *
 * 공통:
 * - Server Component (no 'use client')
 * - 캐시 없음 — 실시간 정원/대기 카운트 반영
 * - 취소된 이벤트(cancelled_at IS NOT NULL)는 카운트 섹션 미표시
 */

import { Users } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  getLightInterestCounts,
  getStrictRsvpCounts,
} from "@/lib/supabase/queries/event-counts";
import type { EventDetail } from "@/lib/types/domain";

// ─────────────────────────────────────────────────────────────────────────────
// Props 타입
// ─────────────────────────────────────────────────────────────────────────────

interface EventCountsProps {
  /** 이벤트 상세 (rsvp_mode · capacity · rsvp_deadline · cancelled_at) */
  event: Pick<
    EventDetail,
    "id" | "rsvp_mode" | "capacity" | "rsvp_deadline" | "cancelled_at"
  >;
  /** 현재 로그인 사용자 UUID (null=미로그인 → myWaitingPosition 미조회) */
  currentUserId: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 메인 컴포넌트 (async Server Component)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * EventCounts — 이벤트 참가 현황 카운트 표시 컴포넌트.
 *
 * - 취소된 이벤트는 null 반환 (렌더 없음)
 * - light / strict 모드에 따라 각각 서브 컴포넌트로 분기
 */
export async function EventCounts({ event, currentUserId }: EventCountsProps) {
  // 취소된 이벤트는 카운트 표시 불필요
  if (event.cancelled_at) return null;

  // rsvp_deadline 초과 여부 판단 (UTC 비교)
  const now = new Date();
  const isDeadlinePassed =
    event.rsvp_deadline != null && new Date(event.rsvp_deadline) < now;

  if (event.rsvp_mode === "light") {
    // ── light 모드 ─────────────────────────────────────────────────────────
    const counts = await getLightInterestCounts(event.id);
    return (
      <LightCounts
        interested={counts.interested}
        going={counts.going}
        isDeadlinePassed={isDeadlinePassed}
      />
    );
  }

  // ── strict 모드 ────────────────────────────────────────────────────────────
  const counts = await getStrictRsvpCounts(event.id, currentUserId);
  return (
    <StrictCounts
      going={counts.going}
      capacity={counts.capacity}
      remaining={counts.remaining}
      waiting={counts.waiting}
      myWaitingPosition={counts.myWaitingPosition}
      isDeadlinePassed={isDeadlinePassed}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 서브 컴포넌트: LightCounts
// ─────────────────────────────────────────────────────────────────────────────

interface LightCountsProps {
  interested: number;
  going: number;
  isDeadlinePassed: boolean;
}

/**
 * 気軽に参加モードのカウント表示.
 *
 * 「気になる N人 · 行く予定 N人」 を横並びで表示.
 * 参考表示 (非公式 / 強制力なし) のため、ラベルは小さめのニュートラルトーン.
 */
function LightCounts({ interested, going, isDeadlinePassed }: LightCountsProps) {
  return (
    <div className="space-y-2">
      {/* 締切済みバナー */}
      {isDeadlinePassed && <DeadlinePassedBanner />}

      {/* カウント行 */}
      <div className="flex items-center gap-1.5">
        {/* アイコン */}
        <Users className="text-muted-foreground size-4 shrink-0" aria-hidden />

        {/* 気になる */}
        <CountChip
          label="気になる"
          count={interested}
          unit="人"
          tone="neutral"
        />

        {/* 区切り */}
        <span className="text-muted-foreground text-xs">·</span>

        {/* 行く予定 */}
        <CountChip
          label="行く予定"
          count={going}
          unit="人"
          tone="blue"
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 서브 컴포넌트: StrictCounts
// ─────────────────────────────────────────────────────────────────────────────

interface StrictCountsProps {
  going: number;
  capacity: number | null;
  remaining: number | null;
  waiting: number;
  myWaitingPosition: number | null;
  isDeadlinePassed: boolean;
}

/**
 * 定員制モードのカウント表示.
 *
 * 定員 · 残り · キャンセル待ち を段階的に表示:
 * 1. capacity が null → 「制限なし」
 * 2. remaining が 0 かつ waiting > 0 → 待機列あり
 * 3. 本인 waiting → 「あなたは キャンセル待ち N番目」 amber badge
 */
function StrictCounts({
  going,
  capacity,
  remaining,
  waiting,
  myWaitingPosition,
  isDeadlinePassed,
}: StrictCountsProps) {
  // 정원 표시 문자열
  const capacityLabel = capacity != null ? `${capacity}名` : "制限なし";

  // 잔여석 표시 문자열 (capacity null 이면 숨김)
  const remainingLabel = remaining != null ? `残り ${remaining}名` : null;

  return (
    <div className="space-y-2">
      {/* 締切済みバナー */}
      {isDeadlinePassed && <DeadlinePassedBanner />}

      {/* ── 정원 정보 행 ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        {/* 아이콘 */}
        <Users className="text-muted-foreground size-4 shrink-0" aria-hidden />

        {/* 定員 */}
        <div className="flex items-baseline gap-0.5">
          <span className="text-muted-foreground text-xs">定員</span>
          <span className="text-sm font-semibold">{capacityLabel}</span>
        </div>

        {/* 잔여석 — capacity 가 있을 때만 */}
        {remainingLabel != null && (
          <>
            <span className="text-muted-foreground text-xs">·</span>
            <div
              className={cn(
                "flex items-baseline gap-0.5",
                // 잔여 0석 → destructive 색으로 강조
                remaining === 0 && "text-destructive"
              )}
            >
              <span
                className={cn(
                  "text-xs",
                  remaining === 0 ? "text-destructive" : "text-muted-foreground"
                )}
              >
                残り
              </span>
              <span className="text-sm font-semibold">{remaining}名</span>
            </div>
          </>
        )}

        {/* 대기 인원 — waiting > 0 일 때만 */}
        {waiting > 0 && (
          <>
            <span className="text-muted-foreground text-xs">·</span>
            <div className="flex items-baseline gap-0.5 text-amber-600 dark:text-amber-400">
              <span className="text-xs">キャンセル待ち</span>
              <span className="text-sm font-semibold">{waiting}人</span>
            </div>
          </>
        )}

        {/* 현재 참석 확정 인원 */}
        <span className="text-muted-foreground text-xs">
          （参加確定 {going}人）
        </span>
      </div>

      {/* ── 본인 waiting 순번 배지 (amber 강조) ────────────────────────────── */}
      {myWaitingPosition != null && (
        <MyWaitingBadge position={myWaitingPosition} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 공용 서브 컴포넌트
// ─────────────────────────────────────────────────────────────────────────────

/**
 * CountChip — 「ラベル N単位」 표시 칩.
 *
 * tone:
 * - neutral: muted 배경 (light 気になる)
 * - blue: keio-navy/10 배경 (light 行く予定)
 */
interface CountChipProps {
  label: string;
  count: number;
  unit: string;
  tone: "neutral" | "blue";
}

function CountChip({ label, count, unit, tone }: CountChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-baseline gap-1 rounded-full px-2.5 py-0.5 text-xs",
        tone === "blue"
          ? "bg-keio-navy/10 text-keio-navy dark:bg-keio-navy/20"
          : "bg-muted text-muted-foreground"
      )}
    >
      {label}
      <strong className="text-sm font-bold">{count}</strong>
      {unit}
    </span>
  );
}

/**
 * MyWaitingBadge — 본인 キャンセル待ち 순번 강조 배지.
 *
 * amber 톤으로 「あなたは キャンセル待ち N番目」 표시.
 * 본인이 waiting 상태일 때만 렌더됨 (부모가 조건 분기).
 */
function MyWaitingBadge({ position }: { position: number }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-xl",
        "bg-amber-50 px-3 py-2 dark:bg-amber-900/20",
        "border border-amber-200 dark:border-amber-800"
      )}
    >
      {/* amber 점 아이콘 */}
      <span
        className="size-2 shrink-0 rounded-full bg-amber-500"
        aria-hidden
      />
      <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
        あなたは
        <span className="mx-1 font-bold">キャンセル待ち {position}番目</span>
        です
      </p>
    </div>
  );
}

/**
 * DeadlinePassedBanner — RSVP 마감 안내 배너.
 *
 * rsvp_deadline 가 현재 시각보다 과거일 때 표시.
 * 중립적인 muted 톤으로 「申し込みは終了しました」 표시.
 */
function DeadlinePassedBanner() {
  return (
    <p
      className={cn(
        "rounded-lg px-3 py-1.5 text-xs font-medium",
        "bg-muted text-muted-foreground"
      )}
      role="status"
    >
      申し込みは終了しました
    </p>
  );
}
