"use client";

/**
 * components/calendar/list-event-card.tsx
 *
 * リスト 뷰의 이벤트 카드 — Client Component.
 * 원래 calendar-list-view.tsx 내부에 있었으나
 * viewport stagger reveal (P10) 적용을 위해 분리.
 *
 * 애니메이션 패턴:
 * - whileInView + viewport: once + margin → 스크롤 진입 시 1회만 발화
 * - 8px y 변위 + opacity fade (Material decel easing [0,0,0.2,1])
 * - reduced-motion 시 즉시 표시 (접근성 보장)
 *
 * 왜 Server Component가 아닌 Client Component인가:
 * - useReducedMotion() hook 은 브라우저 환경에서만 동작
 * - whileInView 는 IntersectionObserver 를 내부적으로 사용하므로 클라이언트 필요
 */

import Link from "next/link";
import Image from "next/image";
import { CalendarDays, MapPin, Clock } from "lucide-react";
import { LazyMotion, domAnimation, m, useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";
import type { EventDetail } from "@/lib/types/domain";
import type { Category } from "@/lib/constants/category";
import { CATEGORY_LABELS } from "@/lib/constants/category";
import { CATEGORY_BADGE_COLOR, FALLBACK_BADGE_COLOR } from "@/lib/constants/category-color";
import { formatJst } from "@/lib/format/jst";

interface ListEventCardProps {
  event: EventDetail;
}

export function ListEventCard({ event }: ListEventCardProps) {
  // 사용자 기기의 「애니메이션 줄이기」 설정 감지
  // true 이면 모든 위치 변환을 건너뛰고 즉시 표시
  const reducedMotion = useReducedMotion();

  const cat = event.category as Category | null;
  const badgeColor = cat
    ? (CATEGORY_BADGE_COLOR[cat] ?? FALLBACK_BADGE_COLOR)
    : FALLBACK_BADGE_COLOR;
  const categoryLabel = cat ? (CATEGORY_LABELS[cat] ?? event.category) : null;

  // cancelled_at 가 있으면 중지(中止) 처리
  const isCancelled = Boolean(event.cancelled_at);

  // 시간 표시 — 종일이면 "終日", 아니면 "HH:mm"
  const timeLabel = event.is_all_day ? "終日" : formatJst(event.starts_at, "HH:mm");

  // 종료 시각 — 같은 날, 종일 아닌 경우에만 표시
  let endTimeLabel = "";
  if (!event.is_all_day && event.ends_at) {
    const startDay = formatJst(event.starts_at, "yyyy-MM-dd");
    const endDay = formatJst(event.ends_at, "yyyy-MM-dd");
    if (startDay === endDay) {
      endTimeLabel = formatJst(event.ends_at, "HH:mm");
    }
  }

  const timeDisplay = endTimeLabel ? `${timeLabel} 〜 ${endTimeLabel}` : timeLabel;

  return (
    // LazyMotion: motion/react 의 전체 번들 대신 domAnimation 기능만 로드
    // → 번들 크기를 약 18kb → 6kb 수준으로 절감
    <LazyMotion features={domAnimation}>
      <m.div
        /**
         * P10 — Viewport Stagger Reveal
         *
         * initial: 카드가 뷰포트 밖에 있을 때 초기 상태
         *   - reducedMotion=true → 즉시 완성 상태(opacity:1, y:0)
         *   - reducedMotion=false → 8px 아래에서 투명하게 시작
         *
         * whileInView: 카드가 뷰포트 안으로 들어오면 이 상태로 전환
         *   → opacity:1, y:0 (원래 위치, 불투명)
         *
         * viewport.once: 처음 진입할 때만 발화, 다시 스크롤 올려도 반복 안 함
         * viewport.margin: 뷰포트 하단 10% 전에 미리 트리거
         *   → 카드가 완전히 보이기 직전에 애니메이션 시작해 자연스럽게 보임
         */
        initial={reducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-10% 0px" }}
        transition={
          reducedMotion
            ? { duration: 0 }
            : {
                duration: 0.36,
                // Material Design decel easing — 빠르게 출발해 부드럽게 멈춤
                // [0,0,0.2,1] = cubic-bezier(0, 0, 0.2, 1)
                ease: [0, 0, 0.2, 1] as [number, number, number, number],
              }
        }
      >
        <Link
          href={`/events/${event.id}`}
          className={cn(
            "group flex items-start gap-3 py-3 transition-opacity hover:opacity-75",
            // 취소된 이벤트는 전체를 반투명하게 처리
            isCancelled && "opacity-50"
          )}
        >
          {/* サムネイル — 64×64px 둥근 사각형 */}
          <div className="bg-muted relative size-16 shrink-0 overflow-hidden rounded-xl">
            {event.cover_image_url ? (
              <Image
                src={event.cover_image_url}
                alt={event.title}
                fill
                sizes="64px"
                className={cn(
                  "object-cover",
                  // 취소된 이벤트는 썸네일도 흑백으로 표시
                  isCancelled && "grayscale"
                )}
              />
            ) : (
              // 이미지 없으면 캘린더 아이콘으로 대체
              <div className="text-muted-foreground flex h-full w-full items-center justify-center">
                <CalendarDays className="size-6" aria-hidden="true" />
              </div>
            )}
          </div>

          {/* テキスト 영역 */}
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            {/* タイトル — 취소된 이벤트는 취소선 적용 */}
            <p
              className={cn(
                "line-clamp-2 text-sm leading-snug font-semibold",
                isCancelled && "text-muted-foreground line-through"
              )}
            >
              {event.title}
            </p>

            {/* 취소 배지 */}
            {isCancelled && (
              <span className="bg-destructive/10 text-destructive inline-flex w-fit rounded-full px-2 py-0.5 text-[10px] font-medium">
                中止
              </span>
            )}

            {/* 時刻 */}
            <div className="text-muted-foreground flex items-center gap-1 text-xs">
              <Clock className="size-3 shrink-0" aria-hidden="true" />
              <span>{timeDisplay}</span>
            </div>

            {/* 場所 */}
            {event.location && (
              <div className="text-muted-foreground flex items-center gap-1 text-xs">
                <MapPin className="size-3 shrink-0" aria-hidden="true" />
                <span className="truncate">{event.location}</span>
              </div>
            )}

            {/* 주최 サークル 이름 */}
            <p className="text-muted-foreground truncate text-xs">{event.circle_name}</p>

            {/* カテゴリバッジ — 취소된 이벤트는 미표시 */}
            {categoryLabel && !isCancelled && (
              <span
                // [P8: View Transitions morph 앵커]
                // 月 뷰의 첫 이벤트 pill 과 동일한 view-transition-name 을 부여.
                // 뷰 전환 시 브라우저가 두 요소를 같은 "개체"로 인식해
                // 셀 안의 작은 pill → 카드의 배지로 morph 합니다.
                // リスト 뷰에서 이 배지는 한 카드에 1개이므로 중복 name 위험 없음.
                style={{ viewTransitionName: `cal-event-${event.id}` }}
                className={cn(
                  "inline-flex w-fit rounded-full px-2 py-0.5 text-[10px] font-medium",
                  badgeColor
                )}
              >
                {categoryLabel}
              </span>
            )}
          </div>
        </Link>
      </m.div>
    </LazyMotion>
  );
}
