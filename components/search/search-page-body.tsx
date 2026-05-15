"use client";

import { useState } from "react";

import { ApplyButton } from "@/components/search/apply-button";
import { QuickFilters } from "@/components/search/quick-filters";
import { RecentSearches } from "@/components/search/recent-searches";
import { SearchCategories } from "@/components/search/search-categories";
import { SelectedFilters } from "@/components/search/selected-filters";
import type { CirclesSearchParams } from "@/lib/circles/search-params";

interface SearchPageBodyProps {
  /** /search?... 진입 시점의 URL 파라미터 — draft 의 초기값 */
  initial: CirclesSearchParams;
}

/**
 * 검색 페이지 본문 — Client wrapper.
 *
 * draft state 를 보유하고 자식 (QuickFilters / SearchCategories) 에 props 로 전달.
 * 칩 클릭은 모두 draft 토글만 → 사용자가 여러 조건을 모은 후 sticky 「適用」 한 번에 navigate.
 *
 * 「もっと絞り込む」 sheet 안 FilterPanel 의 「適用」 는 QuickFilters 내부에서 처리되어
 * 검색 페이지 draft 에 merge 됨 (sheet 만 닫히고 페이지에 머뭄).
 *
 * key={JSON.stringify(initial)} 패턴은 부모 (app/search/page.tsx) 에서 적용 — URL 변경 시 본 컴포넌트
 * 리마운트되어 draft 가 새 initial 로 동기화.
 */
export function SearchPageBody({ initial }: SearchPageBodyProps) {
  // 진입 시 카테고리 0개면 「すべて」 marker(all=true) 자동 부여.
  // 이유: 「適用」 클릭 시 buildCirclesUrl 이 ?all=1 을 붙여야 /circles 가 결과 모드(N件 표시)로 진입함.
  // 마커 없으면 isDiscoverMode === true 가 되어 「人気·新着」 strip(홈 화면)으로 fallback.
  const [draft, setDraft] = useState<CirclesSearchParams>(() => ({
    ...initial,
    all: initial.category.length === 0 ? true : initial.all,
  }));

  return (
    <>
      <div className="container mx-auto max-w-6xl space-y-6 px-4 py-5 pb-24">
        <RecentSearches />
        <QuickFilters draft={draft} setDraft={setDraft} />
        <SelectedFilters draft={draft} setDraft={setDraft} />
        <SearchCategories draft={draft} setDraft={setDraft} />
      </div>
      <ApplyButton draft={draft} />
    </>
  );
}
