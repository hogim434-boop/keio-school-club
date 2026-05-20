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
  // pending: 조회 진행 중 표시. 디바운스 대기 + 서버 응답 대기 동안 true.
  const [pending, setPending] = useState(false);

  // draft 변경 시 매칭 카운트 fetch — Server Action 호출 (Supabase).
  //
  // 디바운스(300ms): 칩을 빠르게 여러 개 토글해도 마지막 1번만 서버 요청한다.
  // 디바운스 없이 매 토글마다 호출하면 Vercel 에서는 (서버리스 cold start + 원거리 DB 왕복 +
  // count:exact 무거운 쿼리) 때문에 요청이 줄줄이 쌓여 숫자가 손가락을 못 따라온다.
  useEffect(() => {
    let cancelled = false;
    setPending(true);

    const timer = setTimeout(() => {
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
        // cancelled: draft 가 또 바뀌어 이 요청이 한물간 경우 — 결과를 버려 race condition 차단
        if (!cancelled) {
          setCount(total);
          setPending(false);
        }
      });
    }, 300);

    // draft 가 바뀌면 이전 타이머 취소 → 마지막 변경 후 300ms 가 지나야 실제 요청
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [draft]);

  function handleApply() {
    const url = buildCirclesUrl({ ...draft, page: undefined });
    exit({ kind: "navigate", url });
  }

  const label = (() => {
    // 첫 로딩 중에는 「適用」, 이후 갱신 중에는 직전 숫자를 유지한 채 깜빡임만 방지
    if (count === null) return pending ? "件数を計算中…" : "適用";
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
