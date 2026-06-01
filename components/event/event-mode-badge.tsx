/**
 * components/event/event-mode-badge.tsx
 *
 * 이벤트 RSVP 모드 배지 컴포넌트 (T-015).
 *
 * - light (気軽に参加): 회색 배지 — 부담 없이 참가 의사 표명 가능함을 시각화
 * - strict (定員制):  앰버 배지 — 정원 관리 + 사전 신청 필요함을 경고
 *
 * Server Component (순수 표시, 상태 없음).
 */

import { cn } from "@/lib/utils";
import type { RsvpMode } from "@/lib/types/domain";

interface EventModeBadgeProps {
  mode: RsvpMode;
  className?: string;
}

/** RSVP 모드별 표시 라벨·색상 설정 */
const MODE_CONFIG: Record<
  RsvpMode,
  { label: string; className: string; description: string }
> = {
  light: {
    label: "気軽に参加",
    // 회색 계열 — 부담 없는 인상
    className: "bg-secondary text-secondary-foreground",
    description: "参加意思を気軽に表明できます",
  },
  strict: {
    label: "定員制",
    // 앰버 계열 — 주의/정원 한정 인상
    className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    description: "定員に達した場合はキャンセル待ちになります",
  },
};

/**
 * EventModeBadge — RSVP 모드를 한눈에 알리는 라벨 배지.
 *
 * 이중 모드 혼란 방지 (PRD 위험 항목): 배지를 RSVP pill 상단에 함께 표시해
 * 사용자가 「気になる」와 「行く」의 강도 차이를 직관적으로 이해하도록 돕는다.
 */
export function EventModeBadge({ mode, className }: EventModeBadgeProps) {
  const config = MODE_CONFIG[mode];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        config.className,
        className
      )}
      title={config.description}
    >
      {config.label}
    </span>
  );
}
