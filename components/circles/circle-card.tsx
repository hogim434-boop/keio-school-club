import Image from "next/image";
import { Construction } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CircleCardLink } from "@/components/circles/circle-card-link";
import { FavoriteToggleButton } from "@/components/circles/favorite-toggle-button";
import { ACTIVITY_FREQUENCY_LABELS } from "@/lib/constants/activity-frequency";
import { CATEGORY_LABELS } from "@/lib/constants/category";
import { OFFICIAL_TYPE_LABELS } from "@/lib/constants/official-type";
import type { CircleSummary } from "@/lib/types/domain";

interface CircleCardProps {
  circle: CircleSummary;
}

// 서클 카드 컴포넌트 (RSC) — F002, F001 검색 결과, F008 비교 송출 등에서 재사용.
// props 는 CircleSummary 만 받아 DB·더미 데이터 모두 호환.
// FavoriteToggleButton (Client) 을 우상단에 배치 — T-013b 에서 placeholder span 교체 완료.
// 카드 전체를 Link 로 감싸 카드 어디를 눌러도 상세 페이지로 이동.
export function CircleCard({ circle }: CircleCardProps) {
  const { id, name, category, official_type, activity_frequency, cover_image_url, tags } = circle;

  return (
    <CircleCardLink
      href={`/circles/${id}`}
      className="group focus-visible:ring-ring block rounded-lg focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
    >
      <Card className="overflow-hidden transition-shadow group-hover:shadow-md">
        {/* 커버 이미지 영역 — 16:9 비율 고정, next/image fill */}
        <div className="bg-muted relative aspect-[16/9]">
          {cover_image_url ? (
            <Image
              src={cover_image_url}
              alt={name}
              fill
              sizes="(min-width: 768px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover"
            />
          ) : (
            <div className="text-muted-foreground flex h-full w-full items-center justify-center">
              <Construction className="h-8 w-8" />
            </div>
          )}

          {/* 즐겨찾기 버튼 — FavoriteToggleButton (Client) 으로 교체 완료 (T-013b) */}
          <div className="absolute top-2 right-2">
            <FavoriteToggleButton circleId={id} variant="card" />
          </div>
        </div>

        <CardContent className="space-y-2 p-3">
          {/* 카테고리 + official_type 뱃지 */}
          <div className="flex flex-wrap gap-1">
            <Badge variant="secondary" className="text-xs">
              {CATEGORY_LABELS[category]}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {OFFICIAL_TYPE_LABELS[official_type]}
            </Badge>
          </div>

          {/* 서클명 — 1줄 자름 */}
          <h3 className="line-clamp-1 text-sm font-semibold">{name}</h3>

          {/* 태그 칩 최대 5개 */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.slice(0, 5).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs font-normal">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* 활동빈도 — 카드 하단 부가 정보 */}
          <p className="text-muted-foreground text-xs">
            {ACTIVITY_FREQUENCY_LABELS[activity_frequency]}
          </p>
        </CardContent>
      </Card>
    </CircleCardLink>
  );
}
