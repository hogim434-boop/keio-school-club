import Link from "next/link";

import { CircleCard } from "@/components/circles/circle-card";
import type { CircleSummary } from "@/lib/types/domain";

interface NewCirclesStripProps {
  title: string;
  circles: CircleSummary[];
  /** 「もっと見る」 링크 — 신착 정렬된 전체 목록으로 이동 */
  seeMoreHref?: string;
}

/**
 * 신착 단체 섹션 컴포넌트 (RSC) — 「新着のサークル・部活動」.
 *
 * 기존 HorizontalCircleStrip(작은 리스트 카드)과 달리, **큰 16:9 커버 카드**(CircleCard)를
 * 가로 스크롤 레일로 노출하는 이미지 중심 섹션. Netflix·소모임 추천행 톤.
 *
 * 레이아웃:
 * - 모바일(≤640px): 풀-블리드 가로 스크롤 + 카드 단위 snap. 카드 폭 72%.
 * - sm(640px)+: 가로 스크롤 해제 → 3열 그리드.
 *
 * 8개 초과 데이터가 들어와도 slice(0, 8) 로 안전.
 */
export function NewCirclesStrip({ title, circles, seeMoreHref }: NewCirclesStripProps) {
  return (
    <section className="space-y-3">
      {/* 제목 + 「もっと見る」 링크 행 — horizontal-circle-strip 과 동일 패턴 */}
      <header className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        {seeMoreHref && (
          <Link
            href={seeMoreHref}
            className="text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            もっと見る
          </Link>
        )}
      </header>

      {/* 가로 snap 레일 — 모바일 스크롤 / sm+ 3열 grid */}
      <ul
        className={[
          "-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4",
          "scroll-px-4 overscroll-x-contain",
          // 양끝 페이드 마스크 (globals.css .scroll-rail-fade 참조)
          "scroll-rail-fade",
          "sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-6 sm:overflow-visible sm:px-0",
        ].join(" ")}
      >
        {circles.slice(0, 8).map((circle) => (
          <li key={circle.id} className="w-[72%] shrink-0 snap-start sm:w-auto">
            <CircleCard circle={circle} isNew />
          </li>
        ))}
      </ul>
    </section>
  );
}
