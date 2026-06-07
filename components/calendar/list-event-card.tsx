"use client";

/**
 * components/calendar/list-event-card.tsx
 *
 * リスト 뷰의 이벤트 카드 — Client Component.
 * 원래 calendar-list-view.tsx 내부에 있었으나
 * viewport stagger reveal (P10) 적용을 위해 분리.
 *
 * 디자인:
 * - event-manage-card.tsx 와 동일한 시각 언어 (카드화 + 좌측 시간 앵커 박스 + D-Day 칩)
 * - 썸네일 제거 → 시간 앵커 박스(w-14)로 대체
 * - 좌측 시간 박스: 예정=navy 틴트, 과거/취소=회색
 * - D-Day 칩: 예정 이벤트에만 표시 (DDayChip 공용 컴포넌트)
 * - 취소: opacity-60 + 제목 line-through + 「中止」 뱃지
 * - 과거(dday<0, 미취소): 시간박스 회색 + D-Day 칩 없음 (캘린더는 기록 뷰라 흐림 과도 적용 X)
 *
 * 애니메이션 패턴 (P10 유지):
 * - whileInView + viewport: once + margin → 스크롤 진입 시 1회만 발화
 * - 8px y 변위 + opacity fade (Material decel easing [0,0,0.2,1])
 * - reduced-motion 시 즉시 표시 (접근성 보장)
 *
 * View Transitions (P8 유지):
 * - 카테고리 배지에 viewTransitionName `cal-event-{id}` 부여
 * - 月 뷰 pill → 리스트 카드 배지로 morph 전환
 *
 * 왜 Server Component가 아닌 Client Component인가:
 * - useReducedMotion() hook 은 브라우저 환경에서만 동작
 * - whileInView 는 IntersectionObserver 를 내부적으로 사용하므로 클라이언트 필요
 */

import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import { LazyMotion, domAnimation, m, useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";
import type { EventDetail } from "@/lib/types/domain";
import type { Category } from "@/lib/constants/category";
import { CATEGORY_LABELS } from "@/lib/constants/category";
import { CATEGORY_BADGE_COLOR, FALLBACK_BADGE_COLOR } from "@/lib/constants/category-color";
import { calcDday, formatJst } from "@/lib/format/jst";
import { DDayChip } from "@/components/event/d-day-chip";

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

  // D-Day 계산 (JST 기준)
  const dday = calcDday(event.starts_at);

  // 카드 비활성 여부 — 취소 이벤트만 opacity-60 (과거는 캘린더 기록 뷰라 유지)
  const isInactive = isCancelled;

  // 시간 앵커 박스 색상 — 과거 또는 취소 이면 회색 톤
  const isPast = dday < 0;
  const anchorDim = isPast || isCancelled;

  // 시간 박스 표시값 계산 (JST 기준)
  const startTimeLabel = event.is_all_day ? "終日" : formatJst(event.starts_at, "HH:mm");

  // 종료 시각 — 같은 날, 종일 아닌 경우에만 표시
  let endTimeLabel = "";
  if (!event.is_all_day && event.ends_at) {
    const startDay = formatJst(event.starts_at, "yyyy-MM-dd");
    const endDay = formatJst(event.ends_at, "yyyy-MM-dd");
    if (startDay === endDay) {
      endTimeLabel = formatJst(event.ends_at, "HH:mm");
    }
  }

  // D-Day 칩 표시 조건 — 취소 이벤트 및 과거 이벤트는 미표시
  const showDday = !isCancelled && dday >= 0;

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
                ease: [0, 0, 0.2, 1] as [number, number, number, number],
              }
        }
      >
        {/* ── 카드 컨테이너 (event-manage-card 와 동일 톤) ── */}
        <Link
          href={`/events/${event.id}`}
          className={cn(
            "flex items-start gap-3 rounded-xl border p-3 transition-opacity hover:opacity-75",
            // 취소된 이벤트만 전체 희미화 (과거는 기록 뷰라 유지)
            isInactive && "opacity-60"
          )}
        >
          {/* ── 좌측: 시간 앵커 박스 ── */}
          {/*
            스크린리더에는 우측 텍스트 영역이 정보를 전달하므로 이 박스는 숨김.
            manage-card 의 날짜 박스와 동일한 치수(w-14)와 색 규칙 적용.
          */}
          <div
            aria-hidden="true"
            className={cn(
              "flex w-14 shrink-0 flex-col items-center justify-center gap-0.5 self-stretch rounded-lg py-2",
              anchorDim ? "bg-muted" : "bg-keio-navy/10"
            )}
          >
            {event.is_all_day ? (
              // 종일 이벤트 — 「終日」 한 줄 표시
              <span
                className={cn(
                  "text-xs font-medium",
                  anchorDim ? "text-muted-foreground" : "text-keio-navy"
                )}
              >
                終日
              </span>
            ) : (
              <>
                {/* 시작 시각 — 크게 표시 */}
                <span
                  className={cn(
                    "text-base leading-none font-bold",
                    anchorDim ? "text-muted-foreground" : "text-keio-navy"
                  )}
                >
                  {startTimeLabel}
                </span>
                {/* 종료 시각 — 같은 날이면 「〜HH:mm」 작게 */}
                {endTimeLabel && (
                  <span
                    className={cn(
                      "text-[10px] leading-tight",
                      anchorDim ? "text-muted-foreground" : "text-keio-navy/80"
                    )}
                  >
                    〜{endTimeLabel}
                  </span>
                )}
              </>
            )}
          </div>

          {/* ── 우측: 이벤트 정보 ── */}
          <div className="min-w-0 flex-1 space-y-1.5">
            {/* 제목 줄 — 취소 이벤트는 취소선 + 「中止」 뱃지 */}
            <div className="flex items-start gap-1.5">
              <p
                className={cn(
                  "line-clamp-2 min-w-0 flex-1 text-sm leading-snug font-semibold",
                  isCancelled && "text-muted-foreground line-through"
                )}
              >
                {event.title}
              </p>
              {/* 취소 뱃지 */}
              {isCancelled && (
                <span className="bg-destructive/10 text-destructive inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-medium">
                  中止
                </span>
              )}
            </div>

            {/* D-Day 칩 + 공통 메타 줄 */}
            <div className="flex flex-wrap items-center gap-1.5">
              {/* D-Day 칩 — 예정 이벤트에만 표시 */}
              {showDday && <DDayChip dday={dday} />}
            </div>

            {/* 장소 */}
            {event.location && (
              <div className="text-muted-foreground flex items-center gap-1 text-xs">
                <MapPin className="size-3 shrink-0" aria-hidden="true" />
                <span className="truncate">{event.location}</span>
              </div>
            )}

            {/* 주최 サークル 이름 */}
            <div className="text-muted-foreground flex items-center gap-1 text-xs">
              <CalendarDays className="size-3 shrink-0" aria-hidden="true" />
              <span className="truncate">{event.circle_name}</span>
            </div>

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
