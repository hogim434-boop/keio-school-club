import Link from "next/link";

import { CATEGORIES, CATEGORY_LABELS, type Category } from "@/lib/constants/category";
import { buildCirclesUrl, type CirclesSearchParams } from "@/lib/circles/search-params";
import { cn } from "@/lib/utils";

interface CategoryTabsProps {
  /** 현재 활성 카테고리. undefined 면 「すべて」 가 active */
  activeCategory?: Category;
  /**
   * 목록 페이지에서 호출 시 현재 필터 상태를 전달 — category 만 갱신하고 q/tags 등은 보존.
   * 홈 페이지에서 호출 시 undefined → 단순 `/circles?category=...` 로 이동.
   */
  baseSearchParams?: CirclesSearchParams;
  className?: string;
}

// 홈/목록 페이지 공통 카테고리 탭 (RSC)
// 「すべて」 + 8 카테고리 = 총 9개 Link. 가로 스크롤 + snap-x.
// 활성 탭은 keio-navy 배경 + foreground 글자색으로 강조.
export function CategoryTabs({ activeCategory, baseSearchParams, className }: CategoryTabsProps) {
  function href(category?: Category): string {
    if (baseSearchParams) {
      return buildCirclesUrl({
        ...baseSearchParams,
        category,
        page: undefined,
      });
    }
    return category ? `/circles?category=${category}` : "/circles";
  }

  return (
    <nav
      aria-label="カテゴリ"
      className={cn(
        "-mx-4 flex snap-x snap-mandatory [scroll-padding-inline:1.25rem] gap-3 overflow-x-auto [overscroll-behavior-x:contain] px-5 pb-1",
        className
      )}
    >
      <Link
        href={href(undefined)}
        aria-current={activeCategory === undefined ? "page" : undefined}
        className={cn(
          "hover:bg-accent snap-start rounded-full border px-3 py-1.5 text-sm whitespace-nowrap",
          activeCategory === undefined
            ? "bg-keio-navy text-keio-navy-foreground border-transparent"
            : "bg-background"
        )}
      >
        すべて
      </Link>
      {CATEGORIES.map((category) => {
        const isActive = activeCategory === category;
        return (
          <Link
            key={category}
            href={href(category)}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "hover:bg-accent snap-start rounded-full border px-3 py-1.5 text-sm whitespace-nowrap",
              isActive
                ? "bg-keio-navy text-keio-navy-foreground border-transparent"
                : "bg-background"
            )}
          >
            {CATEGORY_LABELS[category]}
          </Link>
        );
      })}
    </nav>
  );
}
