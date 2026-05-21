import Link from "next/link";

import { RecruitingPosterCard } from "@/components/circles/recruiting-poster-card";
import { getCurrentRecruitingStatuses } from "@/lib/constants/recruitment-status";
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
 * 「もっと見る」 → /circles(결과 리스트)에 현재 시기의 모집 필터를 적용해 바로 이동.
 *   섹션과 동일한 시기 로직(getCurrentRecruitingStatuses)을 써서, 지금(5월)이면 通年募集만 필터링된 목록으로 간다.
 */
export function RecruitingStrip({ circles }: RecruitingStripProps) {
  if (circles.length === 0) return null;

  // 섹션 노출 기준과 동일한 시기별 모집 상태로 결과 페이지 필터를 구성
  const seeMoreHref = `/circles?recruit=${getCurrentRecruitingStatuses().join(",")}`;

  return (
    <section className="space-y-3">
      {/* 제목 + 「もっと見る」 */}
      <header className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">現在募集中のサークル</h2>
        <Link href={seeMoreHref} className="text-muted-foreground text-sm">
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
