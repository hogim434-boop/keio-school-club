import Link from "next/link";

import { CircleListCard } from "@/components/circles/circle-list-card";
import type { CircleSummary } from "@/lib/types/domain";

interface HorizontalCircleStripProps {
  title: string;
  circles: CircleSummary[];
  /** 「もっと見る」 링크 — Phase 1.x sort 파라미터 도입 시 활성화 */
  seeMoreHref?: string;
}

/**
 * 인기/신착 단체 섹션 컴포넌트 (RSC).
 *
 * **레이아웃** — 카드 4개씩 column 으로 묶고, column 2개를 가로 배치.
 * - **모바일**: 가로 스크롤 캐러셀. 한 viewport 에 column 1개 (4 cards 세로 stack) 노출,
 *   가로로 스크롤하면 옆 column (나머지 4 cards) 등장. snap-x 로 column 단위 스냅.
 * - **sm(640px)+**: 가로 스크롤 없이 2-column grid 로 8 cards 동시 노출 (4행 × 2열).
 *
 * **카드 사이 구분선**: 각 column 안에서 `divide-y` 로 카드 사이 hairline border 처리.
 * 강한 카드 보더 없이 리스트 톤.
 *
 * 8개 초과 데이터가 들어와도 column 슬라이싱 (`slice(start, start+4)`) 으로 안전.
 */
export function HorizontalCircleStrip({ title, circles, seeMoreHref }: HorizontalCircleStripProps) {
  return (
    <section className="space-y-3">
      {/* 제목 + 「もっと見る」 링크 행 */}
      <header className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        {seeMoreHref && (
          <Link href={seeMoreHref} className="text-muted-foreground text-sm">
            もっと見る
          </Link>
        )}
      </header>

      {/* 모바일: 가로 스크롤 (snap-x, column 폭 88%) / sm+: 2-column grid */}
      <ul
        className={[
          // 모바일 풀-블리드 가로 스크롤 + column 단위 snap
          "-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4",
          "[scroll-padding-inline:1rem] [overscroll-behavior-x:contain]",
          // sm+: 가로 스크롤 해제 → 2열 grid
          "sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-x-6 sm:overflow-visible sm:px-0",
        ].join(" ")}
      >
        {[0, 1].map((columnIdx) => {
          const columnCircles = circles.slice(columnIdx * 4, columnIdx * 4 + 4);
          if (columnCircles.length === 0) return null;
          return (
            <li
              key={columnIdx}
              className="divide-border w-[88%] shrink-0 snap-start divide-y sm:w-auto"
            >
              {columnCircles.map((circle) => (
                <CircleListCard key={circle.id} circle={circle} />
              ))}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
