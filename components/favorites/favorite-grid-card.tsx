/**
 * FavoriteGridCard — 즐겨찾기 페이지 2열 그리드용 콤팩트 카드 (T-017)
 *
 * 서버 컴포넌트로 작성. 내부의 FavoriteToggleButton / CircleCardLink 는
 * "use client" 컴포넌트이지만 Next.js App Router에서 자동으로 처리된다.
 *
 * 구조:
 *   CircleCardLink(전체 링크) > Card(overflow-hidden)
 *     > 커버 영역(aspect-[4/3], 상대 위치)
 *       > next/image | Construction placeholder
 *       > 좌상단 모집 배지 (모집중일 때만)
 *       > 우상단 FavoriteToggleButton(variant="card")
 *     > 본문 영역(p-2.5 space-y-1)
 *       > Badge(카테고리) + h3(서클명)
 */

import Image from "next/image";
import { Construction } from "lucide-react";

import { AnimatedHeart } from "@/components/circles/animated-heart";
import { CircleCardLink } from "@/components/circles/circle-card-link";
import { FavoriteToggleButton } from "@/components/circles/favorite-toggle-button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CATEGORY_LABELS } from "@/lib/constants/category";
import { RECRUITMENT_STATUS_LABELS } from "@/lib/constants/recruitment-status";
import type { CircleSummary } from "@/lib/types/domain";
import { cn } from "@/lib/utils";

interface FavoriteGridCardProps {
  circle: CircleSummary;
  /**
   * 제공되면 우상단 하트가 즉시 즐겨찾기 토글 대신 이 콜백을 호출한다.
   * (즐겨찾기 페이지의 "인라인 제자리 Undo" — 4초 유예 후 실제 제거를 위해 사용)
   * 미제공 시 기존 FavoriteToggleButton(즉시 토글) 사용.
   */
  onUnsave?: (id: string) => void;
}

export function FavoriteGridCard({ circle, onUnsave }: FavoriteGridCardProps) {
  const { id, name, category, cover_image_url, recruitment_status } = circle;

  return (
    <CircleCardLink href={`/circles/${id}`} className="group block">
      <Card className="overflow-hidden transition-shadow hover:shadow-md">
        {/* ── 커버 이미지 영역 ── */}
        <div className="bg-muted relative aspect-[4/3]">
          {cover_image_url ? (
            <Image
              src={cover_image_url}
              alt={name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 25vw"
              className="object-cover"
            />
          ) : (
            /* 커버 이미지 없을 때: 회색 배경에 Construction 아이콘 */
            <div className="absolute inset-0 flex items-center justify-center">
              <Construction className="text-muted-foreground/40 size-8" />
            </div>
          )}

          {/* 좌상단 모집 배지 — recruitment_status 있을 때만 표시, pulse 없음 */}
          {recruitment_status && (
            <span
              className={cn(
                "absolute top-2 left-2",
                "rounded-full px-2 py-0.5 text-[10px] font-semibold shadow-sm",
                "text-white",
                // newcomer_only: 에메랄드 그린, year_round: 게이오 네이비
                recruitment_status === "newcomer_only" ? "bg-emerald-500" : "bg-keio-navy"
              )}
            >
              {RECRUITMENT_STATUS_LABELS[recruitment_status]}
            </span>
          )}

          {/* 우상단 즐겨찾기 하트.
              onUnsave 제공 시: 항상 채워진(빨강) 하트 — 탭하면 즉시 제거가 아니라
              onUnsave 콜백 호출(인라인 Undo 유예). 미제공 시 기존 토글 버튼. */}
          <div className="absolute top-1.5 right-1.5">
            {onUnsave ? (
              <button
                type="button"
                onClick={(e) => {
                  // 카드 Link 네비게이션 차단
                  e.preventDefault();
                  e.stopPropagation();
                  onUnsave(id);
                }}
                aria-label="お気に入りから削除"
                className={cn(
                  "inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors",
                  "bg-background/80 text-red-500 backdrop-blur hover:text-red-600",
                  "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                )}
              >
                {/* 즐겨찾기 페이지의 카드는 항상 즐겨찾기 상태 → active 고정(빨강 채움) */}
                <AnimatedHeart active className="size-5" colorClassName="text-red-500" />
              </button>
            ) : (
              <FavoriteToggleButton circleId={id} variant="card" />
            )}
          </div>
        </div>

        {/* ── 본문 영역 ── */}
        <div className="space-y-1 p-2.5">
          {/* 카테고리 배지 */}
          <Badge variant="secondary" className="text-xs">
            {CATEGORY_LABELS[category]}
          </Badge>

          {/* 서클명 — 1줄 이상이면 말줄임 */}
          <h3 className="line-clamp-1 text-sm leading-tight font-semibold">{name}</h3>
        </div>
      </Card>
    </CircleCardLink>
  );
}
