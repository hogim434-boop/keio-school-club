"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { Plus } from "lucide-react";

import { FilterPanel } from "@/components/circles/filter-panel";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { countAppliedFilters, type CirclesSearchParams } from "@/lib/circles/search-params";
import { cn } from "@/lib/utils";

interface QuickFiltersProps {
  /** 검색 페이지 draft state — quick 칩의 active 표시 + setDraft 로 toggle */
  draft: CirclesSearchParams;
  setDraft: Dispatch<SetStateAction<CirclesSearchParams>>;
}

/**
 * quick filter 정의 — 옵션 A (Airbnb/Uber Eats 패턴) 의 「자주 쓰는 4개」.
 * - isActive: 현재 draft 상태에서 본 필터가 적용 중인지 판정
 * - toggle: 현재 draft 상태를 받아 본 필터가 토글된 partial 을 반환
 */
interface QuickFilter {
  label: string;
  isActive: (p: CirclesSearchParams) => boolean;
  toggle: (p: CirclesSearchParams) => Partial<CirclesSearchParams>;
}

// 자주 쓰는 칩 3개만 노출 — 「もっと絞り込む」 가 첫 화면에서 보이도록 개수를 줄임.
// 모집 상태(新歓シーズン/通年募集) 등 나머지 필터는 「もっと絞り込む」 시트에서 제공.
const QUICK_FILTERS: QuickFilter[] = [
  {
    label: "初心者歓迎",
    isActive: (p) => p.tags.includes("beginner_ok"),
    toggle: (p) => ({
      tags: p.tags.includes("beginner_ok")
        ? p.tags.filter((t) => t !== "beginner_ok")
        : [...p.tags, "beginner_ok"],
    }),
  },
  {
    label: "ゆるい",
    isActive: (p) => p.tags.includes("yurui"),
    toggle: (p) => ({
      tags: p.tags.includes("yurui") ? p.tags.filter((t) => t !== "yurui") : [...p.tags, "yurui"],
    }),
  },
  {
    label: "ガチ",
    isActive: (p) => p.tags.includes("gachi"),
    toggle: (p) => ({
      tags: p.tags.includes("gachi") ? p.tags.filter((t) => t !== "gachi") : [...p.tags, "gachi"],
    }),
  },
];

/**
 * 검색 페이지의 「絞り込み」 섹션 — Airbnb / Uber Eats 패턴 (Quick Filter + More).
 *
 * - 4개 인기 quick filter 칩 + 우측 끝 「もっと絞り込む」 buton.
 * - 칩 클릭은 setDraft 로 local toggle (즉시 navigate 안 함). 하단 sticky 「適用」 가 한 번에 navigate.
 * - 「もっと絞り込む」 클릭 시 bottom sheet 가 올라오고 FilterPanel 9 섹션 전체 노출.
 *   sheet 안의 「適用」 클릭 시 sheet 닫고 검색 페이지 draft 에 merge (계속 검색 페이지에 머뭄).
 */
export function QuickFilters({ draft, setDraft }: QuickFiltersProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  // 「もっと絞り込む」 버튼의 카운트 뱃지 — 현재 draft 의 모든 적용 필터 수 (Airbnb 패턴)
  const moreCount = countAppliedFilters(draft);

  function handleToggle(filter: QuickFilter) {
    setDraft((prev) => ({ ...prev, ...filter.toggle(prev) }));
  }

  // sheet 안 FilterPanel 의 「適用」 → 검색 페이지 draft 에 흡수 + sheet 닫기
  function handleSheetApply(panelDraft: CirclesSearchParams) {
    setDraft(panelDraft);
    setMoreOpen(false);
  }

  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold">絞り込み</h2>

      <div className="-mx-4 flex snap-x snap-mandatory [scroll-padding-inline:1rem] gap-2 overflow-x-auto [overscroll-behavior-x:contain] px-4 pb-1">
        {QUICK_FILTERS.map((filter) => {
          const active = filter.isActive(draft);
          return (
            <button
              key={filter.label}
              type="button"
              onClick={() => handleToggle(filter)}
              aria-pressed={active}
              className={cn(
                "focus-visible:ring-ring h-9 shrink-0 snap-start rounded-full border px-4 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none",
                active
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background text-foreground hover:bg-muted"
              )}
            >
              {filter.label}
            </button>
          );
        })}

        {/* もっと絞り込む — bottom Sheet 트리거. sheet 안의 「適用」 → 검색 페이지 draft 흡수 */}
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className="border-border bg-background hover:bg-muted focus-visible:ring-ring inline-flex h-9 shrink-0 snap-start items-center gap-1 rounded-full border px-4 text-sm focus-visible:ring-2 focus-visible:outline-none"
            >
              <Plus className="size-3.5" aria-hidden="true" />
              もっと絞り込む
              {moreCount > 0 && (
                <span className="bg-foreground text-background ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold">
                  {moreCount}
                </span>
              )}
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[85vh] overflow-hidden">
            <SheetHeader>
              <SheetTitle className="sr-only">フィルター</SheetTitle>
            </SheetHeader>
            <div className="h-full overflow-hidden px-1">
              {/* key 로 sheet 열릴 때마다 현재 draft 로 FilterPanel 초기화 */}
              <FilterPanel
                key={JSON.stringify(draft)}
                initial={draft}
                mode="sheet"
                onApply={handleSheetApply}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </section>
  );
}
