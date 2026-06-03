/**
 * components/dm/date-divider.tsx
 *
 * DM 스레드 날짜 구분선 컴포넌트.
 *
 * ── 표시 규칙 ──────────────────────────────────────────────────────────────
 * - 오늘: 「今日」
 * - 어제: 「昨日」
 * - 그 외: 「M月d日(E)」 (예: 「6月1日(日)」)
 *
 * date-fns ja locale 기반으로 포맷.
 * LINE · iMessage 스타일 — 가운데 pill 형태, 회색 배경.
 */

import { format, isToday, isYesterday } from "date-fns";
import { ja } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface DateDividerProps {
  /** 구분선에 표시할 날짜 */
  date: Date;
  /** 추가 className (선택) */
  className?: string;
}

/**
 * 날짜를 일본어 형식으로 포맷하는 헬퍼.
 * - 오늘: 「今日」
 * - 어제: 「昨日」
 * - 그 외: 「M月d日(E)」(예: 「6月1日(日)」)
 */
function formatDateLabel(date: Date): string {
  if (isToday(date)) return "今日";
  if (isYesterday(date)) return "昨日";
  // 요일 포함: E = 단축 요일 (月, 火, ...)
  return format(date, "M月d日(E)", { locale: ja });
}

/**
 * DM 스레드 날짜 구분선.
 *
 * 메시지 그룹 사이에 날짜가 바뀌는 시점에 삽입된다.
 * LINE · iMessage 스타일로 가운데 pill 형태로 표시한다.
 */
export function DateDivider({ date, className }: DateDividerProps) {
  return (
    <div
      className={cn(
        // 가운데 정렬 + 좌우로 선을 흘리는 라인 효과
        "relative flex items-center justify-center py-2",
        className
      )}
      role="separator"
      aria-label={`${formatDateLabel(date)}のメッセージ`}
    >
      {/* 좌우 구분선 */}
      <div className="bg-border/50 absolute inset-x-0 top-1/2 h-px" aria-hidden />

      {/* 날짜 pill — 구분선 위에 위치해 선을 가림 */}
      <span
        className={cn(
          "relative z-10 rounded-full px-3 py-1",
          "bg-muted/80 text-muted-foreground text-[10px] font-medium",
          // backdrop blur로 아래 내용이 비쳐 보이는 LINE 스타일
          "backdrop-blur-sm"
        )}
      >
        {formatDateLabel(date)}
      </span>
    </div>
  );
}
