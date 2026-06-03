/**
 * components/dm/avg-response-time.tsx
 *
 * 동아리별 평균 응답 시간 표시 컴포넌트 — T-034.
 *
 * ── 표시 규칙 ──────────────────────────────────────────────────────────────
 * - 데이터 있음: 「平均的に○日以内に返信」(○ = 일 수)
 * - 데이터 없음: 「データ収集中」
 *
 * ── 카피 규칙 (CLAUDE.md) ───────────────────────────────────────────────────
 * - 강제·약속·위협 표현 금지: 「必ず」「○日以内に返信します」(약속형) 금지.
 * - 어디까지나 「平均的に」(평균적으로) 톤으로 표기한다.
 * - 금지어: 公認 / 公式LINEに参加 / 必ず
 */

import { Clock } from "lucide-react";

import { cn } from "@/lib/utils";
import type { AvgResponseTime } from "@/lib/supabase/queries/inquiries";

interface AvgResponseTimeBadgeProps {
  /** 평균 응답 일 수. null 이면 「データ収集中」표시. */
  value: AvgResponseTime;
  /** 추가 className (선택) */
  className?: string;
}

/**
 * 평균 응답 시간 배지 컴포넌트.
 *
 * Server Component 에서 getAvgResponseTime() 로 값을 조회해 props 로 전달한다.
 * 이 컴포넌트 자체는 순수 표시(presentational)이므로 "use client" 불필요.
 *
 * 사용 예:
 *   const avgTime = await getAvgResponseTime(circleId);
 *   <AvgResponseTimeBadge value={avgTime} />
 */
export function AvgResponseTimeBadge({ value, className }: AvgResponseTimeBadgeProps) {
  return (
    <div
      className={cn(
        // 배지 컨테이너: muted 배경 + 테두리로 정보 블록 구분
        "inline-flex items-center gap-1.5",
        "bg-muted/60 rounded-full border px-3 py-1",
        "text-muted-foreground text-xs",
        className
      )}
    >
      {/* 시계 아이콘 — 응답 시간 개념을 시각적으로 표현 */}
      <Clock className="size-3 shrink-0" aria-hidden />

      {value !== null ? (
        /* 데이터 있음 — 「平均的に○日以内に返信」 */
        /* 「必ず」「返信します」(약속형) 금지 — 「平均的に」(평균적으로) 톤 유지 */
        <span>
          平均的に <span className="text-foreground font-semibold">{value.days}日以内</span> に返信
        </span>
      ) : (
        /* 데이터 없음 — 「データ収集中」 */
        <span>データ収集中</span>
      )}
    </div>
  );
}
