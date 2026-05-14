import Link from "next/link";

import { CircleCard } from "@/components/circles/circle-card";
import type { CircleSummary } from "@/lib/types/domain";

interface HorizontalCircleStripProps {
  title: string;
  circles: CircleSummary[];
  /** 「もっと見る」 링크 — Phase 1.x sort 파라미터 도입 시 활성화 */
  seeMoreHref?: string;
}

/**
 * 인기/신착 단체를 가로 스크롤 스트립으로 표시하는 RSC 컴포넌트.
 * - 모바일: snap-x 가로 스크롤, 카드 폭 78% (다음 카드 22% 노출 → 「더 있다」 어포던스)
 * - sm(640px)+: 2열 그리드로 전환
 * - md(768px)+: 3열 그리드로 전환
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

      {/* 카드 리스트 — 모바일 가로 스크롤 / sm+ 그리드 */}
      <ul
        className={[
          /* 모바일: 풀-블리드 가로 스크롤 — px-5/gap-4 + scroll-padding 로 호흡 확보 */
          "-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5",
          "[scroll-padding-inline:1.25rem] [overscroll-behavior-x:contain]",
          /* sm+: 일반 그리드로 전환 */
          "sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0",
          /* md+: 3열 */
          "md:grid-cols-3",
        ].join(" ")}
      >
        {circles.map((circle) => (
          <li key={circle.id} className="w-[78%] shrink-0 snap-start sm:w-auto">
            <CircleCard circle={circle} />
          </li>
        ))}
      </ul>
    </section>
  );
}
