import Link from "next/link";

import { RecruitingPosterCard } from "@/components/circles/recruiting-poster-card";
import type { CircleSummary } from "@/lib/types/domain";

interface RecruitingStripProps {
  /** 모집중 단체 목록 (getRecruitingCircles 결과) */
  circles: CircleSummary[];
}

/**
 * 「現在募集中のサークル」 가로 스크롤 섹션 (RSC).
 *
 * 세로형 포스터 카드(RecruitingPosterCard)를 모바일/데스크탑 공통 가로 스크롤로 노출.
 * 원형 아바타 스트립과 구별되는 「추천 포스터」 톤으로, 모집중 동아리를 강조한다.
 *
 * 「もっと見る」 → /search 의 모집 필터(recruit=open,newcomer_only,year_round) 결과로 이동.
 */
export function RecruitingStrip({ circles }: RecruitingStripProps) {
  if (circles.length === 0) return null;

  return (
    <section className="space-y-3">
      {/* 제목 + 「もっと見る」 */}
      <header className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">現在募集中のサークル</h2>
        <Link
          href="/search?recruit=open,newcomer_only,year_round"
          className="text-muted-foreground text-sm"
        >
          もっと見る
        </Link>
      </header>

      {/* 가로 스크롤 — 모바일 풀-블리드, 카드 단위 snap. 데스크탑도 동일하게 가로 스크롤 유지. */}
      <ul className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto overscroll-x-contain px-4">
        {circles.map((circle) => (
          <li key={circle.id} className="snap-start">
            <RecruitingPosterCard circle={circle} />
          </li>
        ))}
      </ul>
    </section>
  );
}
