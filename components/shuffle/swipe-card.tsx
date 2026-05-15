"use client";

// motion/react 에서 필요한 훅과 컴포넌트만 임포트
// m.div = motion.div 의 경량 버전 (LazyMotion + domAnimation 조합 시 번들 최소화)
import { forwardRef, useImperativeHandle, useRef } from "react";
import { useReducedMotion, useMotionValue, useTransform, animate, m } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { Construction } from "lucide-react";

import type { CircleSummary } from "@/lib/types/domain";
import type { Category } from "@/lib/constants/category";
import { CATEGORY_LABELS } from "@/lib/constants/category";
import { OFFICIAL_TYPE_LABELS } from "@/lib/constants/official-type";
import { ACTIVITY_FREQUENCY_LABELS } from "@/lib/constants/activity-frequency";
import { Emoji, type EmojiName } from "@/components/ui/emoji";
import { cn } from "@/lib/utils";

/**
 * 카테고리 → Fluent 3D Emoji 매핑.
 * search-categories.tsx 와 동일한 패턴 — 단일 사용처이므로 export 없음.
 */
const CATEGORY_EMOJI: Record<Category, EmojiName> = {
  sports: "trophy",
  culture_art: "artist-palette",
  music: "musical-notes",
  academic: "books",
  international: "globe",
  event: "party-popper",
  volunteer: "handshake",
  media: "clapper-board",
};

interface SwipeCardProps {
  circle: CircleSummary;
  /** 0=top(앞), 1=second, 2=third(맨 뒤) */
  stackPosition: number;
  /** fly-out 완료 후 부모에게 방향 전달 */
  onSwipe?: (dir: "left" | "right") => void;
}

/**
 * 부모(SwipeDeck) 가 좌우 버튼·키보드로 카드 fly-out 을 명령형으로 트리거할 때 사용.
 * drag 와 동일한 애니메이션 경로를 공유해 시각 피드백을 통일.
 */
export interface SwipeCardHandle {
  swipe: (dir: "left" | "right") => void;
}

/**
 * Tinder/Hinge 스타일 swipe deck 의 단일 카드 컴포넌트.
 *
 * - isTop(stackPosition===0) 일 때만 drag 활성화
 * - drag 거리 >100px 또는 속도 >500px/s 이면 fly-out 후 onSwipe 콜백
 * - reducedMotion=true 이면 drag 완전 비활성 (접근성) + fly-out duration 0
 * - 부모는 ref.swipe(dir) 로 외부에서 fly-out 트리거 가능
 * - LazyMotion 래핑은 부모(SwipeDeck)에서 처리 — 여기선 m.div 만 사용
 */
export const SwipeCard = forwardRef<SwipeCardHandle, SwipeCardProps>(function SwipeCard(
  { circle, stackPosition, onSwipe },
  ref
) {
  // 태그는 최대 3개만 노출
  const visibleTags = circle.tags.slice(0, 3);

  // 접근성: 사용자가 OS 에서 "줄인 모션" 설정 시 drag 비활성
  const reducedMotion = useReducedMotion();

  // 가장 위 카드인지 여부 — drag 는 top 카드에만 허용
  const isTop = stackPosition === 0;

  // ── Motion Value 정의 ─────────────────────────────────────────
  // x: 카드의 좌우 이동 거리 (픽셀). drag 중 실시간 갱신됨.
  const x = useMotionValue(0);

  // rotate: x 이동량에 비례해 카드를 기울임 (-15° ~ +15°)
  // 왼쪽으로 당기면 반시계, 오른쪽으로 당기면 시계 방향
  const rotate = useTransform(x, [-200, 0, 200], [-15, 0, 15]);

  // likeOpacity: 오른쪽으로 50px 이상 이동 시 「気になる」 오버레이 점진 등장
  const likeOpacity = useTransform(x, [50, 150], [0, 1]);

  // skipOpacity: 왼쪽으로 50px 이상 이동 시 「次へ」 오버레이 점진 등장
  // 주의: x 는 음수이므로 범위를 [-150, -50] 으로 지정
  const skipOpacity = useTransform(x, [-150, -50], [1, 0]);

  // ── stackPosition 별 scale·opacity ────────────────────────────
  // m.div 의 initial 속성으로 지정해 motion 이 보간을 처리하게 함
  // 카드가 위로 올라올 때 (position 1→0) scale-up 이 자동으로 부드럽게 됨
  const initialScale = stackPosition === 0 ? 1 : stackPosition === 1 ? 0.95 : 0.9;
  const initialOpacity = stackPosition === 0 ? 1 : stackPosition === 1 ? 0.5 : 0.2;

  // ── fly-out 공통 경로 ─────────────────────────────────────────
  // race-guard: fly-out 진행 중 중복 트리거(빠른 연속 클릭·키 입력) 차단
  const isAnimatingRef = useRef(false);

  function flyOut(dir: "left" | "right") {
    if (isAnimatingRef.current) return;
    isAnimatingRef.current = true;
    const targetX = dir === "right" ? window.innerWidth : -window.innerWidth;
    // reducedMotion 시 즉시 전환(0초) — WCAG SC 2.3.3
    const duration = reducedMotion ? 0 : 0.3;
    // iOS easing [0.32, 0.72, 0, 1] — 프로젝트 전체 톤 통일
    animate(x, targetX, { duration, ease: [0.32, 0.72, 0, 1] }).then(() => {
      onSwipe?.(dir);
      // 카드는 보통 unmount 되지만, 재마운트 시 가드 해제 보호용
      isAnimatingRef.current = false;
    });
  }

  // 부모(SwipeDeck) 가 좌우 버튼·키보드로 fly-out 을 트리거할 수 있도록 노출
  useImperativeHandle(ref, () => ({ swipe: flyOut }));

  // ── drag end 핸들러 ───────────────────────────────────────────
  function handleDragEnd(
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: { offset: { x: number }; velocity: { x: number } }
  ) {
    const distance = Math.abs(info.offset.x);
    const velocity = Math.abs(info.velocity.x);

    // 임계(거리 100px 또는 속도 500px/s) 초과 시 fly-out — drag/버튼 동일 경로 공유
    if (distance > 100 || velocity > 500) {
      const dir: "left" | "right" = info.offset.x > 0 ? "right" : "left";
      flyOut(dir);
    }
    // 임계 미만이면 dragSnapToOrigin 이 자동으로 spring-back 처리
  }

  return (
    <m.div
      // ── layout & 스타일 ────────────────────────────────────────
      className={cn(
        "bg-card absolute inset-0 flex flex-col overflow-hidden rounded-3xl shadow-2xl"
      )}
      // stackPosition 에 따른 깊이감 — motion 이 보간하므로 transition 클래스 불필요
      initial={{ scale: initialScale, opacity: initialOpacity }}
      animate={{ scale: initialScale, opacity: initialOpacity }}
      // drag 중 x·rotate 를 style 로 바인딩
      style={{ x, rotate }}
      aria-hidden={stackPosition > 0}
      // ── drag 설정 ─────────────────────────────────────────────
      // isTop 이고 reducedMotion 이 아닌 경우에만 좌우 drag 활성
      drag={isTop && !reducedMotion ? "x" : false}
      // 임계 미만 시 원래 위치로 spring-back
      dragSnapToOrigin
      // drag 영역을 카드 자체로 제한 (화면 밖 과도한 이동 방지)
      dragConstraints={{ left: 0, right: 0 }}
      // spring-back 탄성 조정 — 너무 튕기지 않도록
      dragElastic={0.7}
      onDragEnd={handleDragEnd}
    >
      {/* ── 「気になる」 오버레이 (우측 드래그 시 등장) ─────── */}
      <m.div
        style={{ opacity: likeOpacity }}
        className="pointer-events-none absolute top-8 right-8 z-10 rotate-12 rounded-lg border-2 border-green-500 bg-green-500/10 px-4 py-2 text-lg font-bold text-green-500"
        aria-hidden="true"
      >
        気になる
      </m.div>

      {/* ── 「次へ」 오버레이 (좌측 드래그 시 등장) ─────────── */}
      <m.div
        style={{ opacity: skipOpacity }}
        className="pointer-events-none absolute top-8 left-8 z-10 -rotate-12 rounded-lg border-2 border-red-500 bg-red-500/10 px-4 py-2 text-lg font-bold text-red-500"
        aria-hidden="true"
      >
        次へ
      </m.div>

      {/* ── 커버 이미지 영역 (약 60%) ───────────────────────── */}
      <div className="relative flex-[3]">
        {circle.cover_image_url ? (
          <Image
            src={circle.cover_image_url}
            alt={circle.name}
            fill
            priority={stackPosition === 0}
            sizes="(max-width: 768px) 100vw, 500px"
            className="object-cover"
          />
        ) : (
          /* 이미지 없을 때 플레이스홀더 */
          <div className="bg-muted flex h-full w-full items-center justify-center">
            <Construction className="text-muted-foreground/40 size-16" aria-hidden="true" />
          </div>
        )}

        {/* 이미지 위 그라데이션 — 배지 가독성 확보 */}
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/30 to-transparent" />

        {/* ── 카테고리 배지 + 공인유형 배지 ─────────────────── */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          {/* 카테고리 배지 */}
          <span
            className="bg-background/90 flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium backdrop-blur-sm"
            aria-label={`カテゴリ: ${CATEGORY_LABELS[circle.category]}`}
          >
            <Emoji name={CATEGORY_EMOJI[circle.category]} size={14} />
            {CATEGORY_LABELS[circle.category]}
          </span>

          {/* 공인유형 배지 */}
          <span className="bg-background/80 text-muted-foreground rounded-full px-2.5 py-1 text-xs backdrop-blur-sm">
            {OFFICIAL_TYPE_LABELS[circle.official_type]}
          </span>
        </div>
      </div>

      {/* ── 정보 패널 (약 40%) ──────────────────────────────── */}
      <div className="flex flex-[2] flex-col justify-between p-5">
        <div className="space-y-2">
          {/* 단체명 */}
          <h2 className="text-2xl leading-tight font-bold">{circle.name}</h2>

          {/* 활동 빈도 + 年会費 */}
          <p className="text-muted-foreground text-sm">
            {ACTIVITY_FREQUENCY_LABELS[circle.activity_frequency]}
            {" · "}
            年会費 ¥{circle.annual_fee_yen.toLocaleString()}
          </p>

          {/* 태그 칩 — 최대 3개 */}
          {visibleTags.length > 0 && (
            <div className={cn("flex flex-wrap gap-1.5")}>
              {visibleTags.map((tag) => (
                <span
                  key={tag}
                  className="bg-muted text-foreground inline-flex h-6 items-center rounded-full px-2.5 text-xs"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* もっと詳しく リンク — drag 중 motion 이 click 자동 차단 */}
        <Link
          href={`/circles/${circle.id}`}
          className="mt-3 self-start text-sm font-medium underline-offset-4 hover:underline"
          tabIndex={stackPosition === 0 ? 0 : -1}
        >
          もっと詳しく →
        </Link>
      </div>
    </m.div>
  );
});

SwipeCard.displayName = "SwipeCard";
