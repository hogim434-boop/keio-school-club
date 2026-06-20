import { Construction } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { CircleCardLink } from "@/components/circles/circle-card-link";
import { FadeInImage } from "@/components/circles/fade-in-image";
import { FavoriteToggleButton } from "@/components/circles/favorite-toggle-button";
import { TAG_LABELS } from "@/lib/circles/filter-labels";
import { ACTIVITY_FREQUENCY_LABELS } from "@/lib/constants/activity-frequency";
import { CATEGORY_LABELS } from "@/lib/constants/category";
import { getOfficialTypeDisplayLabel } from "@/lib/constants/official-type";
import { circleHref } from "@/lib/circles/slug";
import type { CircleSummary } from "@/lib/types/domain";

interface CircleListCardProps {
  circle: CircleSummary;
  /** 신착 섹션 내 카드 여부 — true 면 1행 우측 끝에 NEW outline 배지 표시 */
  isNew?: boolean;
  /** 모집중 섹션 내 카드 여부 — true 면 1행 우측 끝에 募集中 outline 배지 표시 */
  isRecruiting?: boolean;
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
export function CircleListCard({
  circle,
  isNew = false,
  isRecruiting = false,
}: CircleListCardProps) {
  const {
    id,
    name,
    category,
    official_type,
    activity_frequency,
    cover_image_url,
    tags,
    description,
  } = circle;
  // athletics / intercollegiate 만 라벨 표시. 그 외 (公認/非公認/その他) 는 배지 자체 비표시.
  const officialLabel = getOfficialTypeDisplayLabel(official_type);

  return (
    <CircleCardLink
      href={circleHref(circle)}
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
            // FadeInImage: 로드 완료 시 opacity 0→1 페이드인 (500ms).
            // hover 줌 클래스(group-hover:scale-[1.04])는 className으로 그대로 유지.
            <FadeInImage
              src={cover_image_url}
              alt={name}
              fill
              sizes="88px"
              className="object-cover transition-transform duration-[450ms] ease-out group-hover:scale-[1.04] motion-reduce:transform-none"
            />
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
          {/* 1행: (体育会/インカレ 인 경우만) 배지 + 서클명 + (isNew 면) NEW outline 우측 끝 */}
          <div className="flex min-w-0 items-center gap-1.5">
            {officialLabel && (
              <Badge variant="secondary" className="shrink-0 px-1.5 py-0 text-[10px]">
                {officialLabel}
              </Badge>
            )}
            <span className="truncate text-sm font-semibold">{name}</span>
            {isNew && (
              <span
                className="ml-auto shrink-0 rounded border border-rose-400 px-1.5 py-0.5 text-[9px] leading-none font-medium text-rose-500 motion-safe:animate-pulse"
                aria-label="新着のサークル"
              >
                NEW
              </span>
            )}
            {isRecruiting && (
              <span
                className="ml-auto shrink-0 rounded border border-emerald-400 px-1.5 py-0.5 text-[9px] leading-none font-medium text-emerald-600 motion-safe:animate-pulse"
                aria-label="現在募集中"
              >
                募集中
              </span>
            )}
          </div>

          {/* 2행: 태그 칩 — 라벨 정의된(현행) 태그만. 정리로 제거된 태그는 숨김.
              0 개일 땐 행 자체 생략. flex-nowrap + overflow-hidden 으로 1행 고정 */}
          {tags.some((tag) => TAG_LABELS[tag]) && (
            <div className="flex flex-nowrap items-center gap-1 overflow-hidden">
              {tags
                .filter((tag) => TAG_LABELS[tag])
                .slice(0, 3)
                .map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="shrink-0 px-1.5 py-0 text-[10px] leading-4 font-normal"
                  >
                    {TAG_LABELS[tag]}
                  </Badge>
                ))}
            </div>
          )}

          {/* 3행: 소개글 미리보기 — 1줄로 자름 (내용 없으면 행 생략) */}
          {description && (
            <p className="text-muted-foreground line-clamp-1 text-xs">{description}</p>
          )}

          {/* 4행: 카테고리 · 활동빈도 메타 */}
          <p className="text-muted-foreground text-xs">
            {CATEGORY_LABELS[category]} · {ACTIVITY_FREQUENCY_LABELS[activity_frequency]}
          </p>
        </div>
      </div>
    </CircleCardLink>
  );
}
