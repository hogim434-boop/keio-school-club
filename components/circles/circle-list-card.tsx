import Image from "next/image";
import { Construction } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { CircleCardLink } from "@/components/circles/circle-card-link";
import { FavoriteToggleButton } from "@/components/circles/favorite-toggle-button";
import { ACTIVITY_FREQUENCY_LABELS } from "@/lib/constants/activity-frequency";
import { CATEGORY_LABELS } from "@/lib/constants/category";
import { getOfficialTypeDisplayLabel } from "@/lib/constants/official-type";
import type { CircleSummary } from "@/lib/types/domain";

interface CircleListCardProps {
  circle: CircleSummary;
}

/**
 * 가로형 리스트 카드 (RSC) — 디스커버 모드 「人気 / 新着」 섹션 전용.
 * 한국 당근마켓 모임 UI 패턴 차용: 정사각형 썸네일(왼쪽) + 텍스트 영역(오른쪽).
 *
 * 정보 구성:
 * - 썸네일 좌측 상단: FavoriteToggleButton (variant="card")
 * - 1행: official_type 배지 + 서클명 (inline, truncate)
 * - 2행: 태그 한 줄 (없으면 행 생략)
 * - 3행: 카테고리 · 활동빈도 메타
 *
 * truncate 동작 — flex item 기본 `min-width: auto` 가 자식 truncate 를 깨므로
 * 텍스트 영역 div 와 1행 inner div 둘 다 `min-w-0` 필수.
 */
export function CircleListCard({ circle }: CircleListCardProps) {
  const { id, name, category, official_type, activity_frequency, cover_image_url, tags } = circle;
  // athletics / intercollegiate 만 라벨 표시. 그 외 (公認/非公認/その他) 는 배지 자체 비표시.
  const officialLabel = getOfficialTypeDisplayLabel(official_type);

  return (
    <CircleCardLink
      href={`/circles/${id}`}
      className="group focus-visible:ring-ring block rounded-lg focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
    >
      <div className="flex items-start gap-3 px-1 py-3">
        {/* 왼쪽: 정사각형 썸네일 + 좌측 상단 favorite 토글 */}
        <div
          className="bg-muted relative size-[88px] shrink-0 overflow-hidden rounded-lg"
          role={cover_image_url ? undefined : "img"}
          aria-label={cover_image_url ? undefined : name}
        >
          {cover_image_url ? (
            <Image src={cover_image_url} alt={name} fill sizes="88px" className="object-cover" />
          ) : (
            <div className="text-muted-foreground flex h-full w-full items-center justify-center">
              <Construction className="size-6" aria-hidden="true" />
            </div>
          )}
          {/* 참고 이미지 (당근마켓 모임 화면) 와 동일한 좌측 상단 배치 */}
          <div className="absolute top-1.5 left-1.5">
            <FavoriteToggleButton circleId={id} variant="card" />
          </div>
        </div>

        {/* 오른쪽: 텍스트 영역 — min-w-0 필수 (truncate 동작 보장) */}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {/* 1행: (体育会/インカレ 인 경우만) 배지 + 서클명 (inline) */}
          <div className="flex min-w-0 items-center gap-1.5">
            {officialLabel && (
              <Badge variant="secondary" className="shrink-0 px-1.5 py-0 text-[10px]">
                {officialLabel}
              </Badge>
            )}
            <span className="truncate text-sm font-semibold">{name}</span>
          </div>

          {/* 2행: 태그 한 줄 — 0 개일 땐 행 자체 생략 */}
          {tags.length > 0 && (
            <p className="text-muted-foreground truncate text-xs">{tags.slice(0, 4).join(" · ")}</p>
          )}

          {/* 3행: 카테고리 · 활동빈도 메타 */}
          <p className="text-muted-foreground text-xs">
            {CATEGORY_LABELS[category]} · {ACTIVITY_FREQUENCY_LABELS[activity_frequency]}
          </p>
        </div>
      </div>
    </CircleCardLink>
  );
}
