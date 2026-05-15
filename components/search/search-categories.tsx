"use client";

import { useRef, useState, type Dispatch, type SetStateAction } from "react";
import {
  Trophy,
  Palette,
  Music,
  BookOpen,
  Globe,
  Calendar,
  HandHeart,
  Newspaper,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { CATEGORIES, CATEGORY_LABELS, type Category } from "@/lib/constants/category";
import type { CirclesSearchParams } from "@/lib/circles/search-params";
import { cn } from "@/lib/utils";

/**
 * 카테고리별 아이콘 매핑 — lucide-react 8종 + 「すべて」 (Sparkles).
 * 당근앱 패턴: 검색 페이지의 핵심 entry point. 한눈에 카테고리 식별 가능.
 */
const CATEGORY_ICONS: Record<Category | "all", LucideIcon> = {
  all: Sparkles,
  sports: Trophy,
  culture_art: Palette,
  music: Music,
  academic: BookOpen,
  international: Globe,
  event: Calendar,
  volunteer: HandHeart,
  media: Newspaper,
};

interface CategoryItem {
  /** 「すべて」 일 때 undefined, 그 외에는 Category enum */
  value?: Category;
  label: string;
  Icon: LucideIcon;
}

/** 페이지당 항목 수 — 3 col × 2 row = 6 (당근앱 패턴 응용) */
const ITEMS_PER_PAGE = 6;

/** 배열을 size 단위 청크로 분할 */
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

interface SearchCategoriesProps {
  /** 검색 페이지 draft state — 카테고리 active 표시 + toggle 대상 */
  draft: CirclesSearchParams;
  setDraft: Dispatch<SetStateAction<CirclesSearchParams>>;
}

/**
 * 검색 페이지의 카테고리 그리드 — 당근앱 패턴 + 다중 선택.
 *
 * 9개 항목 (「すべて」 + 8 카테고리) 을 3 col × 2 row 페이지 단위로 슬라이드.
 * - 칩 클릭은 즉시 navigate 안 함 — setDraft 로 local toggle 만. sticky 「適用」 가 한 번에 navigate.
 * - 카테고리는 다중 선택 (toggleMulti). active 시 아이콘 배경이 검은색 + 흰 아이콘 으로 강조.
 * - 「すべて」 클릭 시 category 배열 비움 → 카테고리 필터 해제 동작.
 */
export function SearchCategories({ draft, setDraft }: SearchCategoriesProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activePage, setActivePage] = useState(0);

  const items: CategoryItem[] = [
    { label: "すべて", Icon: CATEGORY_ICONS.all },
    ...CATEGORIES.map((category) => ({
      value: category,
      label: CATEGORY_LABELS[category],
      Icon: CATEGORY_ICONS[category],
    })),
  ];

  const pages = chunk(items, ITEMS_PER_PAGE);

  // 「すべて」 active = draft.all marker 가 명시 true 일 때만.
  // 검색 페이지 진입 시 default false → 「すべて」 inactive (사용자 미선택 상태 표시).
  const allActive = draft.all === true;

  function handleClick(item: CategoryItem) {
    if (item.value === undefined) {
      // 「すべて」 클릭 → category 빈 배열 + all marker true (적용 시 /circles?all=1 결과 모드 진입)
      setDraft((prev) => ({ ...prev, category: [], all: true }));
      return;
    }
    // 일반 카테고리 토글 — all marker 는 자동 해제 (개별 카테고리 선택 시 「すべて」 mutually exclusive)
    setDraft((prev) => ({
      ...prev,
      all: false,
      category: prev.category.includes(item.value!)
        ? prev.category.filter((c) => c !== item.value)
        : [...prev.category, item.value!],
    }));
  }

  function handleScroll() {
    const el = containerRef.current;
    if (!el) return;
    const pageWidth = el.clientWidth;
    if (pageWidth === 0) return;
    const idx = Math.round(el.scrollLeft / pageWidth);
    if (idx !== activePage) setActivePage(idx);
  }

  function scrollToPage(idx: number) {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTo({ left: el.clientWidth * idx, behavior: "smooth" });
  }

  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold">カテゴリ</h2>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="-mx-4 snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto [overscroll-behavior-x:contain] [&::-webkit-scrollbar]:hidden"
      >
        <div className="flex">
          {pages.map((pageItems, pageIdx) => (
            <div key={pageIdx} className="w-full shrink-0 snap-start px-4">
              <ul className="grid grid-cols-3 gap-3">
                {pageItems.map((item) => {
                  const active =
                    item.value === undefined ? allActive : draft.category.includes(item.value);
                  return (
                    <li key={item.label}>
                      <button
                        type="button"
                        onClick={() => handleClick(item)}
                        aria-pressed={active}
                        className="group focus-visible:ring-ring flex w-full flex-col items-center gap-2 rounded-lg p-3 transition-colors focus-visible:ring-2 focus-visible:outline-none"
                      >
                        <div
                          className={cn(
                            "flex size-14 items-center justify-center rounded-full transition-colors",
                            active
                              ? "bg-foreground text-background"
                              : "bg-muted text-foreground group-hover:bg-muted/70"
                          )}
                        >
                          <item.Icon className="size-6" aria-hidden="true" />
                        </div>
                        <span
                          className={cn(
                            "text-center text-xs font-medium",
                            active ? "text-foreground" : "text-foreground"
                          )}
                        >
                          {item.label}
                        </span>
                      </button>
                    </li>
                  );
                })}
                {Array.from({ length: ITEMS_PER_PAGE - pageItems.length }).map((_, i) => (
                  <li key={`empty-${pageIdx}-${i}`} aria-hidden className="invisible" />
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {pages.length > 1 && (
        <div className="flex justify-center gap-1.5" role="tablist" aria-label="カテゴリのページ">
          {pages.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => scrollToPage(i)}
              role="tab"
              aria-selected={activePage === i}
              aria-label={`カテゴリ ${i + 1} ページ目`}
              className={cn(
                "h-1.5 rounded-full transition-all",
                activePage === i ? "bg-foreground w-4" : "bg-muted-foreground/30 w-1.5"
              )}
            />
          ))}
        </div>
      )}
    </section>
  );
}
