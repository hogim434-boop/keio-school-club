import Image from "next/image";
import { Construction } from "lucide-react";

import { CircleCardLink } from "@/components/circles/circle-card-link";
import { FavoriteToggleButton } from "@/components/circles/favorite-toggle-button";
import { CATEGORY_LABELS } from "@/lib/constants/category";
import {
  RECRUITMENT_STATUS_LABELS,
  type RecruitmentStatus,
} from "@/lib/constants/recruitment-status";
import type { CircleSummary } from "@/lib/types/domain";
import { cn } from "@/lib/utils";

interface RecruitingPosterCardProps {
  circle: CircleSummary;
}

/**
 * 모집 상태별 뱃지 스타일 — 사진 위에 얹히므로 가독성을 위해 솔리드 배경 + 흰 텍스트.
 * 둘 다 「지금 가입 가능」 이므로 NEW 뱃지처럼 pulse 모션으로 살아있는 느낌을 준다.
 * - newcomer_only(新歓シーズン): 4월 한정·시급 → emerald + pulse
 * - year_round(通年募集): 언제든 가입 OK → 브랜드 네이비 + pulse
 */
const RECRUITMENT_BADGE_CLS: Record<RecruitmentStatus, string> = {
  newcomer_only: "bg-emerald-500 motion-safe:animate-pulse",
  year_round: "bg-keio-navy motion-safe:animate-pulse",
};

/**
 * 세로형 포스터 카드 (RSC) — 「現在募集中のサークル」 가로 스크롤 섹션 전용.
 * Netflix/Spotify 「추천」 풍: 세로 3:4 커버 + 좌상단 모집 뱃지 + 우상단 즐겨찾기 + 하단 이름/카테고리.
 *
 * 원형 아바타 스트립(HourlyCategoryStrip)과 시각적으로 명확히 구별되는 형태로,
 * 모집중 동아리의 「지금 들어와」 톤을 강조한다.
 */
export function RecruitingPosterCard({ circle }: RecruitingPosterCardProps) {
  const { id, name, category, cover_image_url, recruitment_status } = circle;

  return (
    <CircleCardLink
      href={`/circles/${id}`}
      className="group focus-visible:ring-ring block w-32 shrink-0 rounded-xl focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
    >
      {/* 세로 3:4 커버 — 포스터 비율 */}
      <div className="bg-muted relative aspect-[3/4] overflow-hidden rounded-xl">
        {cover_image_url ? (
          <Image
            src={cover_image_url}
            alt={name}
            fill
            sizes="128px"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="text-muted-foreground flex h-full w-full items-center justify-center">
            <Construction className="size-7" aria-hidden="true" />
          </div>
        )}

        {/* 이미지 가독성용 상단 그라데이션 (뱃지 대비 확보) */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-black/35 to-transparent" />

        {/* 좌상단: 모집 상태 뱃지 */}
        {recruitment_status && (
          <span
            className={cn(
              "absolute top-2 left-2 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm",
              RECRUITMENT_BADGE_CLS[recruitment_status]
            )}
          >
            {RECRUITMENT_STATUS_LABELS[recruitment_status]}
          </span>
        )}

        {/* 우상단: 즐겨찾기 토글 */}
        <div className="absolute top-1.5 right-1.5">
          <FavoriteToggleButton circleId={id} variant="card" />
        </div>
      </div>

      {/* 이미지 아래: 이름 + 카테고리 */}
      <div className="mt-2 space-y-0.5">
        <h3 className="line-clamp-2 text-sm leading-tight font-semibold">{name}</h3>
        <p className="text-muted-foreground text-xs">{CATEGORY_LABELS[category]}</p>
      </div>
    </CircleCardLink>
  );
}
