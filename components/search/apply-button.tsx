"use client";

import { useContext, useEffect, useState } from "react";

import { getFilterCount } from "@/app/search/actions";
import { SearchSlideOutContext } from "@/app/search/template";
import { Button } from "@/components/ui/button";
import { buildCirclesUrl, type CirclesSearchParams } from "@/lib/circles/search-params";

interface ApplyButtonProps {
  /** 현재 draft state — 매칭 카운트 fetch + 「適用」 클릭 시 결과 URL 조립 */
  draft: CirclesSearchParams;
}

/**
 * 검색 페이지 하단 sticky 「N件のサークルを見る」 버튼 — Airbnb / Mercari / Booking 공통 패턴.
 *
 * 구조:
 * - draft 변경 시 filterCircles 호출 → result.total 표시 (적용 전 카운트 미리보기, decision fatigue 감소)
 * - 클릭 시 SearchSlideOutContext 의 `navigate` exit 트리거 → template 이 iOS modal dismiss 애니메이션 (아래로 슬라이드) 실행 후 router.push
 *
 * 표시 변형:
 * - count > 0: 「{count}件のサークルを見る」
 * - count === 0: 「該当するサークルがありません」 (클릭 가능 — 결과 페이지의 EmptyState 가 「リセット」 안내)
 * - count === null (초기 로딩): 「適用」 (스켈레톤 회피로 단순 fallback)
 *
 * Phase 1.2 T-009: 더미 filterCircles → getFilterCount Server Action 으로 교체.
 */
export function ApplyButton({ draft }: ApplyButtonProps) {
  const exit = useContext(SearchSlideOutContext);
  const [count, setCount] = useState<number | null>(null);

  // draft 변경 시 매칭 카운트 fetch — Server Action 호출 (Supabase)
  useEffect(() => {
    let cancelled = false;
    getFilterCount({
      q: draft.q,
      category: draft.category,
      frequency: draft.frequency,
      officialType: draft.officialType,
      tags: draft.tags,
      activityDays: draft.activityDays,
      memberSize: draft.memberSize,
      recruitmentStatus: draft.recruitmentStatus,
      activityTimeBand: draft.activityTimeBand,
      sort: draft.sort,
    }).then((total) => {
      if (!cancelled) setCount(total);
    });
    return () => {
      cancelled = true;
    };
  }, [draft]);

  function handleApply() {
    const url = buildCirclesUrl({ ...draft, page: undefined });
    exit({ kind: "navigate", url });
  }

  const label = (() => {
    if (count === null) return "適用";
    if (count === 0) return "該当するサークルがありません";
    return `${count.toLocaleString("ja-JP")}件のサークルを見る`;
  })();

  return (
    <div className="bg-background/95 supports-[backdrop-filter]:bg-background/80 fixed inset-x-0 bottom-16 z-30 px-4 py-3 backdrop-blur md:bottom-0">
      <div className="container mx-auto max-w-6xl">
        <Button
          onClick={handleApply}
          className="bg-foreground text-background hover:bg-foreground/90 h-12 w-full rounded-full text-base font-semibold shadow-lg shadow-black/5"
        >
          {label}
        </Button>
      </div>
    </div>
  );
}
