"use client";

// motion/react 에서 필요한 훅과 컴포넌트만 임포트
// m.div = motion.div 의 경량 버전 (LazyMotion + domAnimation 조합 시 번들 최소화)
import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { useReducedMotion, useMotionValue, useTransform, animate, m } from "motion/react";

import { EASE_IOS } from "@/lib/motion/tokens";
import Image from "next/image";
import Link from "next/link";
import { Construction } from "lucide-react";

import type { CircleSummary } from "@/lib/types/domain";
import type { Category } from "@/lib/constants/category";
import { CATEGORY_LABELS } from "@/lib/constants/category";
import { getOfficialTypeDisplayLabel } from "@/lib/constants/official-type";
import { ACTIVITY_FREQUENCY_LABELS } from "@/lib/constants/activity-frequency";
import { TAG_LABELS } from "@/lib/circles/filter-labels";
import { circleHref } from "@/lib/circles/slug";
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
  // 태그는 라벨 정의된(현행) 것만, 최대 3개 노출 — 정리로 제거된 태그는 숨김
  const visibleTags = circle.tags.filter((tag) => TAG_LABELS[tag]).slice(0, 3);

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

  // jolt: 스탬프 접촉 순간 카드(=종이)가 짧게 반동(세로 흔들림)하는 임팩트용 motion value.
  // fly-out 은 x 로만 이동하므로 y(jolt)와 무간섭. 평소 0 유지.
  const jolt = useMotionValue(0);

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

  // 좋아요 확정 순간 「気になる」 스탬프를 펀치로 '쾅' 찍는 슬램 연출 트리거.
  // true 가 되면 stamp 가 drag-opacity 추종을 멈추고 scale 오버슈트 키프레임으로 전환.
  const [slamLike, setSlamLike] = useState(false);

  // holdStamp: 좋아요 슬램 스탬프를 카드가 날아가기 전에 잠깐 보여줄지 여부.
  // - 버튼/키보드 좋아요(카드가 정지 상태) → true: 슬램을 먼저 보여주고 카드를 내보냄.
  // - 드래그 좋아요(이미 손으로 카드를 밀어낸 상태) → false: 즉시 날아감(자연스러움).
  function flyOut(dir: "left" | "right", holdStamp = false) {
    if (isAnimatingRef.current) return;
    isAnimatingRef.current = true;
    const isLike = dir === "right";
    // 오른쪽(=좋아요) 확정 시 스탬프 프레스 발동 (reducedMotion 시 카드가 즉시 사라져 생략)
    if (isLike && !reducedMotion) {
      setSlamLike(true);
      // 카드 반동: 스탬프 접촉 시점(프레스 0.32s 의 약 70% ≈ 0.22s)에 맞춰 지연 후
      // 짧고 감쇠하는 세로 흔들림(≤5px). 도장이 종이를 누르는 물리적 압력감.
      animate(jolt, [0, 5, -3, 1.5, 0], { delay: 0.2, duration: 0.22, ease: "easeOut" });
    }
    const targetX = isLike ? window.innerWidth : -window.innerWidth;
    // reducedMotion 시 즉시 전환(0초) — WCAG SC 2.3.3
    const duration = reducedMotion ? 0 : 0.3;
    // 버튼/키보드 좋아요는 프레스(0.32s)가 착지하고 잠깐 머문 뒤(0.5s) 날아가도록 지연.
    // → 스탬프가 또렷이 '찍힌 상태' 를 보여준 다음, 그 상태 그대로 카드가 함께 날아감.
    const flyDelay = isLike && holdStamp && !reducedMotion ? 0.5 : 0;
    // iOS easing [0.32, 0.72, 0, 1] — 프로젝트 전체 톤 통일
    animate(x, targetX, { duration, delay: flyDelay, ease: EASE_IOS }).then(() => {
      onSwipe?.(dir);
      // 카드는 보통 unmount 되지만, 재마운트 시 가드 해제 보호용
      isAnimatingRef.current = false;
    });
  }

  // 부모(SwipeDeck) 가 좌우 버튼·키보드로 fly-out 을 트리거할 때 — 정지 카드이므로 슬램을 먼저 노출
  useImperativeHandle(ref, () => ({ swipe: (dir) => flyOut(dir, true) }));

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
      // drag 중 x·rotate, 스탬프 접촉 시 y(jolt) 반동을 style 로 바인딩
      style={{ x, y: jolt, rotate }}
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
      {/* ── 「気になる」 스탬프 ───────────────────────────────
          - drag 중: x 이동에 따라 opacity 추종 (실시간 미리보기, Tinder 패턴)
          - 좋아요 확정(slamLike): 실제 잉크/고무 도장이 종이에 '툭' 찍히는 프레스 모션.
            · scale  1.22 → 0.97 → 1   : 약간 큰 상태로 하강 → 접촉 압축(고무 눌림) → 정착 (오버슈트 없음)
            · y      -8 → 1 → 0        : 위에서 내려와 살짝 눌림 → 정착 (양 바운스 금지)
            · opacity 0 → 1 → 1        : 하강 중 거의 안 보이다 접촉 순간 잉크 스냅
            · filter  blur3 → 0 → 0    : 하강 모션 블러 → 접촉 또렷
            rotate 는 animate 에서 다루지 않음 → className 의 rotate-12(Tailwind v4 = 독립 rotate
            CSS 속성)로 12° 고정 유지. motion 의 transform(scale/y)와 별도 속성이라 충돌 없음(각도 흔들림 제거).
            착지 후 scale 1·opacity 1 유지 → 카드가 날아갈 때도 스탬프가 찍힌 채 함께 이동. */}
      <m.div
        style={slamLike ? undefined : { opacity: likeOpacity }}
        animate={
          slamLike
            ? {
                scale: [1.22, 0.97, 1],
                y: [-8, 1, 0],
                opacity: [0, 1, 1],
                filter: ["blur(3px)", "blur(0px)", "blur(0px)"],
              }
            : undefined
        }
        transition={
          slamLike
            ? // 빠르게 들어와 단호히 멈추는 하드 스톱(스프링 X). times: 70% 하강 + 30% 정착.
              { duration: 0.32, times: [0, 0.7, 1], ease: [0.5, 0, 0.15, 1] }
            : undefined
        }
        className="pointer-events-none absolute top-8 right-8 z-10 rotate-12 rounded-lg border-2 border-green-500 bg-green-500/10 px-4 py-2 text-lg font-bold text-green-500 shadow-sm"
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

          {/* 体育会 / インカレ 인 경우만 배지 표시 (그 외는 비표시) */}
          {(() => {
            const officialLabel = getOfficialTypeDisplayLabel(circle.official_type);
            if (!officialLabel) return null;
            return (
              <span className="bg-background/80 text-muted-foreground rounded-full px-2.5 py-1 text-xs backdrop-blur-sm">
                {officialLabel}
              </span>
            );
          })()}
        </div>
      </div>

      {/* ── 정보 패널 (약 40%) ──────────────────────────────── */}
      <div className="flex flex-[2] flex-col justify-between p-5">
        <div className="space-y-2">
          {/* 단체명 */}
          <h2 className="text-2xl leading-tight font-bold">{circle.name}</h2>

          {/* 활동 빈도 */}
          <p className="text-muted-foreground text-sm">
            {ACTIVITY_FREQUENCY_LABELS[circle.activity_frequency]}
          </p>

          {/* 소개글 미리보기 — 2줄로 자름. 전체는 「もっと詳しく」 로 상세 페이지에서 확인 */}
          {circle.description && (
            <p className="text-muted-foreground/90 line-clamp-2 text-sm leading-relaxed">
              {circle.description}
            </p>
          )}

          {/* 태그 칩 — 최대 3개 */}
          {visibleTags.length > 0 && (
            <div className={cn("flex flex-wrap gap-1.5")}>
              {visibleTags.map((tag) => (
                <span
                  key={tag}
                  className="bg-muted text-foreground inline-flex h-6 items-center rounded-full px-2.5 text-xs"
                >
                  #{TAG_LABELS[tag]}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* もっと詳しく リンク — drag 중 motion 이 click 자동 차단 */}
        <Link
          href={circleHref(circle)}
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
