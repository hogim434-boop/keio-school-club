/**
 * components/event/d-day-chip.tsx
 *
 * D-Day 칩 — 이벤트 카드 및 캘린더 리스트/시트에서 공용으로 사용하는 인라인 칩.
 * event-manage-card.tsx 의 내부 DDayChip 을 추출하여 독립 컴포넌트화.
 *
 * 긴박도별 색상 규칙:
 *   dday === 0      → amber-500  "D-DAY" (당일)
 *   1 ≤ dday ≤ 3   → red-500    "D-N"   (긴박)
 *   dday ≥ 4       → keio-navy  "D-N"   (일반 예정)
 *   dday < 0        → null 반환  (종료 이벤트 — 상위에서 처리)
 *
 * 사용처:
 *   - components/event/event-manage-card.tsx (운영자 관리 카드)
 *   - components/calendar/list-event-card.tsx (방문자 리스트 뷰 카드)
 *   - components/calendar/calendar-month-view.tsx (월뷰 시트 이벤트 행)
 *
 * Server Component 호환:
 *   훅 없음 + 순수 JSX → "use client" 불필요.
 */

import { cn } from "@/lib/utils";

interface DDayChipProps {
  /**
   * 이벤트 시작까지 남은 일수 (calcDday 의 반환값).
   * 음수면 null 을 반환해 렌더링하지 않음.
   */
  dday: number;
}

/**
 * D-Day 인라인 칩 컴포넌트.
 *
 * @example
 *   const dday = calcDday(event.starts_at);
 *   // 예정 이벤트에만 표시 (취소 이벤트는 상위에서 조건부 렌더링)
 *   {!isCancelled && <DDayChip dday={dday} />}
 */
export function DDayChip({ dday }: DDayChipProps) {
  // 종료 이벤트 — 칩을 표시하지 않음 (終了/中止 뱃지가 상태를 전달)
  if (dday < 0) return null;

  // 긴박도별 색상 결정
  const chipClass =
    dday === 0
      ? "bg-amber-500 text-white" // 당일 — amber
      : dday <= 3
        ? "bg-red-500 text-white" // 1~3일 — red (긴박)
        : "bg-keio-navy text-keio-navy-foreground"; // 4일+ — navy (일반)

  // 표시 라벨 — 당일이면 "D-DAY", 그 외 "D-N"
  const label = dday === 0 ? "D-DAY" : `D-${dday}`;

  return (
    <span
      className={cn(
        // 인라인 칩 기본 스타일: 작고 굵게, tabular-nums 로 숫자 폭 통일
        "inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
        chipClass
      )}
    >
      {label}
    </span>
  );
}
