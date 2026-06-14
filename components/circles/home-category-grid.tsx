"use client";

import { useContext, type MouseEvent } from "react";
import Link from "next/link";

import { CirclesSlideOutContext } from "@/components/circles/circles-page-shell";
import { Emoji, type EmojiName } from "@/components/ui/emoji";
import { CATEGORIES, CATEGORY_LABELS, type Category } from "@/lib/constants/category";

/**
 * 카테고리 → Fluent 3D Emoji 매핑 (홈 그리드 8종).
 * search-categories.tsx 의 매핑과 동일하되 「すべて」(sparkles) 제외.
 * 추후 lib/constants/category.ts 로 통합 리팩토링 후보.
 */
const CATEGORY_EMOJIS: Record<Category, EmojiName> = {
  sports: "trophy",
  culture_art: "artist-palette",
  music: "musical-notes",
  academic: "books",
  international: "globe",
  event: "party-popper",
  volunteer: "handshake",
  media: "clapper-board",
};

/**
 * 홈 카테고리 그리드 — Discover 모드 헤더 직하 entry point.
 *
 * 8개 카테고리를 4열 × 2행 한 화면에 노출. 칩 클릭 → CirclesPageShell exit 트리거
 * → /circles?category={slug} 결과 모드로 router.push.
 * 트랜지션: 옛 홈은 왼쪽으로 슬라이드 아웃, 새 카테고리 결과 페이지는 페이드 인.
 *
 * Link 의 href 는 그대로 유지 — 우클릭 「새 탭에서 열기」, Cmd/Ctrl 클릭 등 modifier 동작은
 * onClick 의 early return 으로 기본 Link 동작 보존.
 */
export function HomeCategoryGrid() {
  const exit = useContext(CirclesSlideOutContext);

  function handleClick(category: Category) {
    return (e: MouseEvent<HTMLAnchorElement>) => {
      // modifier 키·중간 클릭은 브라우저 기본 동작 유지 (새 탭 등)
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button === 1) return;
      // 컨텍스트 없음(shell 밖) → 일반 Link 이동으로 폴백
      if (!exit) return;
      e.preventDefault();
      exit({ kind: "navigate", url: `/circles?category=${category}` });
    };
  }

  return (
    <section
      className="space-y-3"
      aria-label="カテゴリから探す"
      // 코치마크 엔진이 이 속성으로 요소를 찾아 말풍선을 표시함
      data-coachmark="category"
    >
      <h2 className="text-base font-semibold">カテゴリ</h2>
      <ul className="grid grid-cols-4 gap-2 sm:gap-3">
        {CATEGORIES.map((category) => (
          <li key={category} className="flex">
            <Link
              href={`/circles?category=${category}`}
              onClick={handleClick(category)}
              aria-label={`${CATEGORY_LABELS[category]}のサークルを見る`}
              className="group focus-visible:ring-ring flex min-h-[88px] w-full flex-col items-center justify-start gap-2 rounded-lg p-2 transition-colors focus-visible:ring-2 focus-visible:outline-none sm:min-h-[96px] sm:p-3"
            >
              {/* 이모지 원형 컨테이너 — 검색 페이지 SearchCategories 와 동일 톤 (active 상태는 홈에서 불필요) */}
              <div className="bg-muted group-hover:bg-muted/70 flex size-12 shrink-0 items-center justify-center rounded-full transition-all sm:size-14">
                <Emoji name={CATEGORY_EMOJIS[category]} size={28} />
              </div>
              {/* 긴 라벨(イベント・企画 등)이 2줄 줄바꿈될 수 있으므로 leading-tight 으로 줄간격 최소화 */}
              <span className="text-foreground w-full text-center text-xs leading-tight font-medium">
                {CATEGORY_LABELS[category]}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
