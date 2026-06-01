"use client";

/**
 * components/calendar/calendar-view-toggle.tsx
 *
 * 月表示 / リスト 의 뷰 전환 토글 (Client Component).
 *
 * - URL searchParams `?view=month|list` 와 동기화.
 *   → 뒤로가기·공유·리로드 시에도 같은 뷰가 유지된다.
 * - router.push 대신 router.replace 사용 — 히스토리 스택에 쌓지 않음.
 * - 일본어 캐피 사용: 月表示 / リスト
 */

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { CalendarDays, List } from "lucide-react";
import { cn } from "@/lib/utils";

export type CalendarView = "month" | "list";

interface CalendarViewToggleProps {
  /** 현재 활성 뷰 (서버에서 searchParams 로 결정하여 주입) */
  currentView: CalendarView;
}

export function CalendarViewToggle({ currentView }: CalendarViewToggleProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  /**
   * 뷰 전환 핸들러
   * - 현재 searchParams 를 복사해 view 만 교체 → month 파라미터 등 다른 값 유지
   */
  function switchView(view: CalendarView) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", view);
    // 히스토리 스택에 쌓지 않기 위해 replace 사용
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    // 앱 스타일 pill 토글 — shadcn Tabs 대신 커스텀 구현 (더 compact)
    <div
      role="tablist"
      aria-label="表示切り替え"
      className="bg-muted flex items-center gap-0.5 rounded-lg p-0.5"
    >
      <ToggleButton
        label="月表示"
        icon={<CalendarDays className="size-3.5" aria-hidden="true" />}
        isActive={currentView === "month"}
        onClick={() => switchView("month")}
        ariaSelected={currentView === "month"}
      />
      <ToggleButton
        label="リスト"
        icon={<List className="size-3.5" aria-hidden="true" />}
        isActive={currentView === "list"}
        onClick={() => switchView("list")}
        ariaSelected={currentView === "list"}
      />
    </div>
  );
}

// ─────────────────────────────────────────────
//  내부 버튼 컴포넌트
// ─────────────────────────────────────────────

interface ToggleButtonProps {
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
  ariaSelected: boolean;
}

function ToggleButton({ label, icon, isActive, onClick, ariaSelected }: ToggleButtonProps) {
  return (
    <button
      role="tab"
      aria-selected={ariaSelected}
      onClick={onClick}
      className={cn(
        // 기본 스타일
        "flex items-center gap-1 rounded-md px-3 py-1 text-xs font-medium transition-colors",
        // 활성 상태
        isActive
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
