"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";

import { FilterPanel } from "@/components/circles/filter-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { countAppliedFilters, type CirclesSearchParams } from "@/lib/circles/search-params";

interface FilterTriggerProps {
  /** 현재 URL 의 필터 상태 — Sheet 열면 FilterPanel 의 initial 로 전달 */
  initial: CirclesSearchParams;
}

// 모바일 전용 필터 트리거 (Sheet bottom)
// 데스크탑(lg) 이상에서는 사이드바가 노출되므로 본 컴포넌트는 lg:hidden
export function FilterTrigger({ initial }: FilterTriggerProps) {
  const [open, setOpen] = useState(false);
  const appliedCount = countAppliedFilters(initial);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 lg:hidden">
          <SlidersHorizontal className="size-4" />
          フィルター
          {appliedCount > 0 && (
            <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px]">
              {appliedCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[85vh] overflow-hidden">
        {/* a11y 전용 타이틀 — FilterPanel 내부 헤더가 시각 헤더 역할을 담당 */}
        <SheetHeader>
          <SheetTitle className="sr-only">フィルター</SheetTitle>
        </SheetHeader>
        <div className="h-full overflow-hidden px-1">
          {/* key 로 리마운트하여 외부 URL 변경 시 draft state 동기화 */}
          <FilterPanel
            key={JSON.stringify(initial)}
            initial={initial}
            mode="sheet"
            onApply={() => setOpen(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
