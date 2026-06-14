"use client";

import { useContext } from "react";

import { SearchSlideOutContext, SearchQueryContext } from "@/app/(tabs)/search/template";
import { Button } from "@/components/ui/button";
import { buildCirclesUrl, type CirclesSearchParams } from "@/lib/circles/search-params";

interface ApplyButtonProps {
  /** 현재 draft state — 「適用」 클릭 시 결과 URL 조립 */
  draft: CirclesSearchParams;
}

/**
 * 검색 페이지 하단 sticky 「サークルを見る」 버튼.
 *
 * 실시간 매칭 카운트(미리보기)는 제거했다 — 필터 토글마다 서버 왕복 + 버튼 깜빡임이
 * 거슬리고, 이 규모(수십 건)에선 미리보기 이득이 작다. 카운트는 적용 후
 * 결과 페이지 상단(「N件のサークル」, app/circles/page.tsx)에서 확인한다.
 *
 * 클릭 시 SearchSlideOutContext 의 navigate exit 트리거 → template 이 iOS modal dismiss
 * 애니메이션(아래로 슬라이드) 실행 후 router.push.
 */
export function ApplyButton({ draft }: ApplyButtonProps) {
  const exit = useContext(SearchSlideOutContext);
  // 입력창에 친 키워드 — 버튼으로도 함께 검색되도록 draft.q 를 이 값으로 덮어쓴다.
  const { query } = useContext(SearchQueryContext);

  function handleApply() {
    const q = query.trim();
    // 키워드가 있으면 q 로 검색 + 선택한 필터 동시 적용. 없으면 q 생략.
    const url = buildCirclesUrl({ ...draft, q: q || undefined, page: undefined });
    exit({ kind: "navigate", url });
  }

  return (
    <div className="bg-background/95 supports-[backdrop-filter]:bg-background/80 fixed inset-x-0 bottom-16 z-30 px-4 py-3 backdrop-blur md:bottom-0">
      <div className="container mx-auto max-w-6xl">
        <Button
          onClick={handleApply}
          className="bg-foreground text-background hover:bg-foreground/90 h-12 w-full rounded-full text-base font-semibold shadow-lg shadow-black/5"
        >
          サークルを見る
        </Button>
      </div>
    </div>
  );
}
