"use client";

/**
 * components/event/event-detail-hero.tsx
 *
 * 이벤트 상세 페이지 히어로 영역 (커버 16:9 + 제목 + 모드 배지).
 *
 * 구성:
 * - 커버 이미지 16:9 (null 이면 그라데이션 플레이스홀더)
 * - 상단 overlay: 뒤로가기(←) + 공유 버튼
 * - 커버 하단 그라디언트 위에 이벤트 제목 (텍스트 가독성 확보)
 * - 카테고리 배지 / RSVP 모드 배지 (Wave 1 — 자리만, Wave 2 에서 기능 연결)
 * - 취소된 이벤트: 「キャンセル」 overlay ribbon
 *
 * 주의사항:
 * - 이 컴포넌트는 'use client' — 뒤로가기·공유 버튼이 onClick 필요.
 * - events/[id] 의 template.tsx SlideOutContext 를 통해 슬라이드 아웃 트리거.
 *   → 「戻る」 버튼 클릭 시 직접 router.back() 을 호출하지 않고 SlideOutContext 경유.
 *   → 공유(handleShare) 는 탐색과 무관하므로 router 직접 사용 유지.
 * - [[circle-detail-template-fixed-trap]]: EventRsvpPill 은 createPortal(document.body) 이므로
 *   template 의 transform 컨테이닝 블록 영향 없음 ✅
 */

import { useContext } from "react";
import Image from "next/image";
import { ChevronLeft, Share2 } from "lucide-react";
import { toast } from "sonner";

import { SlideOutContext } from "@/app/events/[id]/template";

import { cn } from "@/lib/utils";
import type { EventDetail } from "@/lib/types/domain";
import { DdayBadge } from "@/components/event/d-day-badge";

// ─────────────────────────────────────────────────────────────────────────────
// 타입
// ─────────────────────────────────────────────────────────────────────────────

interface EventDetailHeroProps {
  event: Pick<
    EventDetail,
    "title" | "cover_image_url" | "category" | "rsvp_mode" | "cancelled_at" | "starts_at"
  >;
}

// ─────────────────────────────────────────────────────────────────────────────
// 상수
// ─────────────────────────────────────────────────────────────────────────────

/** RSVP 모드 → 표시 라벨 + 색상 클래스 */
const RSVP_MODE_CONFIG = {
  light: {
    label: "参加表明",
    className: "bg-keio-navy/80 text-white",
  },
  strict: {
    label: "事前申込",
    className: "bg-amber-600/80 text-white",
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// 컴포넌트
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 이벤트 상세 히어로 — 커버 이미지 16:9 + 뒤로가기·공유 오버레이 + 제목 그라디언트.
 *
 * Wave 2 placeholder:
 * - RSVP pill (하단 CTA) → T-018
 * - D-day 뱃지 (우측 상단) → T-018
 *
 * 현재 Phase 에서는 카테고리 배지 + RSVP 모드 배지만 표시.
 */
export function EventDetailHero({ event }: EventDetailHeroProps) {
  // SlideOutContext 에서 슬라이드 아웃 트리거 함수를 가져옴.
  // 「戻る」 버튼은 이 함수를 호출 → template.tsx 가 슬라이드 아웃 애니메이션을 실행 → router.back().
  const slideOut = useContext(SlideOutContext);

  // ── 공유 핸들러 (서클 상세와 동일 패턴) ──────────────────────────────────
  async function handleShare() {
    if (typeof window === "undefined") return;
    const url = window.location.href;
    const text = `${event.title} | K CLUB`;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: text, text, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("URLをコピーしました");
      }
    } catch {
      // share 시트 cancel 또는 clipboard 실패 — 사용자 의도된 취소이므로 무시
    }
  }

  // ── 공통 원형 아이콘 버튼 ─────────────────────────────────────────────────
  const iconButton = cn(
    "inline-flex h-10 w-10 items-center justify-center rounded-full",
    "bg-black/40 text-white backdrop-blur-sm",
    "transition-colors hover:bg-black/60",
    "focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-0 focus-visible:outline-none"
  );

  const rsvpConfig = RSVP_MODE_CONFIG[event.rsvp_mode];
  const isCancelled = Boolean(event.cancelled_at);

  return (
    <div className="relative">
      {/* ── 커버 이미지 영역 (16:9) ─────────────────────────────────────────── */}
      <div className="bg-muted relative aspect-[16/9] w-full overflow-hidden md:aspect-[21/9]">
        {event.cover_image_url ? (
          <Image
            src={event.cover_image_url}
            alt={event.title}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        ) : (
          /* 커버 없음: 그라데이션 플레이스홀더 */
          <div className="from-keio-navy/20 via-keio-navy/10 to-muted h-full w-full bg-gradient-to-br" />
        )}

        {/* ── 취소된 이벤트 ribbon ────────────────────────────────────────── */}
        {isCancelled && (
          <div
            aria-label="キャンセル済み"
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
          >
            <span className="bg-destructive/80 rotate-[-20deg] rounded-lg px-6 py-2 text-lg font-bold tracking-widest text-white backdrop-blur-sm">
              キャンセル
            </span>
          </div>
        )}

        {/* ── 하단 그라디언트 (텍스트 가독성용) ──────────────────────────── */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/60 to-transparent" />

        {/* ── 커버 위 제목 + 배지 ─────────────────────────────────────────── */}
        <div className="absolute inset-x-0 bottom-0 px-4 pb-4">
          {/* 배지 행 — 카테고리 + RSVP 모드 */}
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {event.category && (
              <span className="inline-flex items-center rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
                {event.category}
              </span>
            )}
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium backdrop-blur-sm",
                rsvpConfig.className
              )}
            >
              {rsvpConfig.label}
            </span>
            {/* D-day 배지 — T-018: 이벤트 시작일까지 남은 일수를 JST 기준으로 표시 */}
            {!isCancelled && (
              <DdayBadge startsAt={event.starts_at} className="text-xs backdrop-blur-sm" />
            )}
          </div>

          {/* 이벤트 제목 */}
          <h1 className="line-clamp-2 text-xl leading-tight font-bold text-white drop-shadow-sm md:text-2xl">
            {event.title}
          </h1>
        </div>

        {/* ── 상단 overlay: 뒤로가기·공유 ─────────────────────────────────── */}
        <div
          className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-4 pb-2"
          style={{ paddingTop: "max(env(safe-area-inset-top), 1rem)" }}
        >
          <button type="button" onClick={slideOut} aria-label="戻る" className={iconButton}>
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>
          <button type="button" onClick={handleShare} aria-label="共有" className={iconButton}>
            <Share2 className="size-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
