import Link from "next/link";

import { CircleListCard } from "@/components/circles/circle-list-card";
import type { CircleSummary } from "@/lib/types/domain";

interface HorizontalCircleStripProps {
  title: string;
  circles: CircleSummary[];
  /** 「もっと見る」 링크 — Phase 1.x sort 파라미터 도입 시 활성화 */
  seeMoreHref?: string;
  /**
   * 본문 레이아웃 분기.
   * - `"carousel"` (기본): 4 cards × 2 columns 가로 스크롤 캐러셀 — 인기 strip 등 「추천」 톤
   * - `"stack"`: 1열 세로 stack (모든 카드 아래로 펼침) — 신착 strip 등 「전체 목록」 톤
   */
  layout?: "carousel" | "stack";
  /** true 면 각 자식 `CircleListCard` 에 `isNew` 를 전파 — 신착 strip 전용 */
  markNew?: boolean;
}

/**
 * 인기/신착 단체 섹션 컴포넌트 (RSC).
 *
 * **레이아웃 분기** (`layout` prop):
 *
 * 1) `carousel` (default) — 카드 4개씩 column 으로 묶고 column 2개를 가로 배치.
 *    - 모바일: 가로 스크롤 캐러셀 (한 viewport 에 column 1개 = 4 cards). snap-x 로 column 단위 스냅.
 *    - sm(640px)+: 2-column grid 로 8 cards 동시 노출 (4행 × 2열).
 *
 * 2) `stack` — 모든 카드를 1열 세로 stack. 카드 사이 `divide-y` hairline border. 「전체 목록」 톤.
 *
 * 8개 초과 데이터 들어와도 `slice(0, 8)` 로 안전.
 */
export function HorizontalCircleStrip({
  title,
  circles,
  seeMoreHref,
  layout = "carousel",
  markNew = false,
}: HorizontalCircleStripProps) {
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

      {layout === "stack" ? (
        /* Stack 레이아웃 — 모든 카드 1열 세로 stack, 카드 사이 hairline divide */
        <ul className="divide-border divide-y">
          {circles.slice(0, 10).map((circle) => (
            <li key={circle.id}>
              <CircleListCard circle={circle} isNew={markNew} />
            </li>
          ))}
        </ul>
      ) : (
        /* Carousel 레이아웃 — 모바일 가로 스크롤 / sm+ 2-column grid */
        <ul
          className={[
            // 모바일 풀-블리드 가로 스크롤 + column 단위 snap
            "-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4",
            "scroll-px-4 overscroll-x-contain",
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
      )}
    </section>
  );
}
