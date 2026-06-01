/**
 * components/event/d-day-badge.tsx
 *
 * D-day 배지 — 이벤트 시작일까지 남은 일수를 JST 기준으로 표시하는 Server Component.
 *
 * 표시 분기 (JST 날짜 차이):
 * - 0일  → 「本日」         (red 강조 — 오늘 개최)
 * - 1~7일 → 「あと N日」   (amber 배지 — 임박)
 * - 8일+ → 「M月D日」      (gray — 날짜만 표시)
 * - 음수  → 「終了」        (gray, 취소선 톤 — 이미 종료)
 *
 * 사용처:
 * - event-detail-hero.tsx (커버 이미지 위 배지 행)
 * - event-meta-grid.tsx (메타 정보 그리드 하단)
 *
 * 의존:
 * - lib/format/jst.ts 의 calcDday() — JST 기준 날짜 차이 계산
 * - lib/format/jst.ts 의 formatJst() — "M月D日" 포맷 변환
 * - components/ui/badge.tsx — shadcn Badge 컴포넌트
 */

import { Badge } from "@/components/ui/badge";
import { calcDday, formatJst } from "@/lib/format/jst";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// 타입
// ─────────────────────────────────────────────────────────────────────────────

interface DdayBadgeProps {
  /** UTC timestamptz 문자열 (DB의 starts_at 컬럼) */
  startsAt: string;
  /** 추가 클래스 (배지 위치 조절 등 외부 사용자 지정) */
  className?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 분기 계산 헬퍼
// ─────────────────────────────────────────────────────────────────────────────

/**
 * D-day 숫자 → 표시 텍스트 + Tailwind 색상 클래스를 결정.
 *
 * 반환값:
 * - label: 배지에 표시할 일본어 문자열
 * - colorClass: Badge의 className에 넣을 색상 클래스
 * - isFinished: true면 취소선 스타일 적용
 */
function resolveBadgeConfig(dday: number, startsAt: string): {
  label: string;
  colorClass: string;
  isFinished: boolean;
} {
  if (dday === 0) {
    // ── 당일: 빨간 강조 ──────────────────────────────────────────────────────
    return {
      label: "本日",
      colorClass: "bg-red-500 text-white border-transparent",
      isFinished: false,
    };
  }

  if (dday > 0 && dday <= 7) {
    // ── 1~7일 이내: amber 배지 ───────────────────────────────────────────────
    return {
      label: `あと${dday}日`,
      colorClass: "bg-amber-500 text-white border-transparent",
      isFinished: false,
    };
  }

  if (dday > 7) {
    // ── 8일 이상: 날짜 표시 (gray) ───────────────────────────────────────────
    // "M月D日" 포맷 — 예: "6月15日"
    const dateLabel = formatJst(startsAt, "M月d日");
    return {
      label: dateLabel,
      colorClass: "bg-muted text-muted-foreground border-transparent",
      isFinished: false,
    };
  }

  // ── 음수 (종료된 이벤트): gray + 취소선 톤 ──────────────────────────────
  return {
    label: "終了",
    colorClass: "bg-muted text-muted-foreground border-transparent",
    isFinished: true,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 컴포넌트
// ─────────────────────────────────────────────────────────────────────────────

/**
 * D-day 배지 (Server Component).
 *
 * 서버에서 JST 기준으로 계산하기 때문에 hydration 불일치가 없음.
 *
 * @example
 *   // 이벤트 상세 페이지에서 사용
 *   <DdayBadge startsAt={event.starts_at} />
 */
export function DdayBadge({ startsAt, className }: DdayBadgeProps) {
  // JST 기준으로 오늘 ~ 이벤트 시작일 간 날짜 차이 계산
  const dday = calcDday(startsAt);

  // 분기에 따른 표시 텍스트 + 색상 결정
  const { label, colorClass, isFinished } = resolveBadgeConfig(dday, startsAt);

  return (
    <Badge
      className={cn(
        // 취소선 톤: 종료된 이벤트는 opacity 낮춰서 흐릿하게 표시
        isFinished && "line-through opacity-60",
        colorClass,
        className
      )}
    >
      {label}
    </Badge>
  );
}
