"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, LazyMotion, domAnimation, m, type PanInfo } from "motion/react";
import { ChevronRight } from "lucide-react";

import { Emoji, type EmojiName } from "@/components/ui/emoji";
import { cn } from "@/lib/utils";

/**
 * Promotional 타일 데이터 shape.
 * 4 번째 이상 추가는 PROMO_TILES 배열에 항목만 push → dots/interval 자동 대응.
 */
type PromoTile = {
  id: string;
  href: string;
  emoji: EmojiName;
  title: string;
  subtitle: string;
  /** 톤별 색상 클래스 (bg / text / hover) */
  tileClassName: string;
};

const PROMO_TILES: PromoTile[] = [
  {
    id: "shuffle",
    href: "/shuffle",
    emoji: "party-popper",
    title: "シャッフルで探す",
    subtitle: "気軽にサークルを発見",
    tileClassName: "bg-keio-navy text-keio-navy-foreground hover:bg-keio-navy/90",
  },
  {
    id: "favorites",
    href: "/favorites",
    emoji: "red-heart",
    title: "お気に入りでチェック",
    subtitle: "気になるサークルをハートで保存",
    tileClassName: "bg-rose-500 text-white hover:bg-rose-500/90",
  },
  {
    id: "search",
    href: "/search",
    emoji: "sparkles",
    title: "カテゴリ・タグで探す",
    subtitle: "8つのカテゴリと多彩なタグで絞り込み",
    tileClassName: "bg-amber-500 text-white hover:bg-amber-500/90",
  },
];

const INTERVAL_MS = 4000;
const SWIPE_THRESHOLD_PX = 40;

type SlideDirection = "left" | "right";

/**
 * Promotional 타일 자동 회전 캐러셀 (client component).
 *
 * 동작:
 * - 7 초마다 좌→우 슬라이드로 다음 타일 노출. 마지막 → 첫 번째 loop.
 * - hover / focus / drag / 명시 ⏸ 토글 / prefers-reduced-motion 중 하나라도 활성이면 자동 회전 정지.
 * - 손가락 드래그 또는 dots 클릭으로 수동 점프.
 * - reduced motion 사용자: x 변위 제거 + opacity 만 트랜지션.
 *
 * 본 컴포넌트는 self-contained — `<LazyMotion features={domAnimation}>` 를 직접 마운트해
 * 부모(CirclesPageShell / ホーム page) 에 motion 컨텍스트 의존성을 두지 않는다.
 * LazyMotion 중첩은 motion 라이브러리가 idempotent 처리하므로 안전.
 *
 * 배경: T-009 에서 ホーム(`app/(tabs)/page.tsx`)가 CirclesPageShell 의존을 끊은 뒤
 * `m.div` 가 features 없이 렌더되어 `initial="enter"`(opacity 0) 상태로 멈춰 타일이
 * 보이지 않는 회귀가 발생. 본 wrapper 가 그 회귀를 해소한다.
 */
export function PromoTileCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState<SlideDirection>("left");
  const [isHovering, setIsHovering] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  // prefers-reduced-motion 체크 (mount 시 1 회) — circles-page-shell.tsx 와 동일 컨벤션
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) setReducedMotion(true);
  }, []);

  // 일시정지 파생값 — 어느 하나라도 true 면 interval 등록 자체를 건너뜀
  const isPaused = isHovering || isFocused || isDragging || reducedMotion;

  // 자동 회전 interval — isPaused 변경 시 자동 cleanup + 재등록
  useEffect(() => {
    if (isPaused) return;
    const id = setInterval(() => {
      setDirection("left");
      setActiveIndex((i) => (i + 1) % PROMO_TILES.length);
    }, INTERVAL_MS);
    return () => clearInterval(id);
  }, [isPaused]);

  const next = () => {
    setDirection("left");
    setActiveIndex((i) => (i + 1) % PROMO_TILES.length);
  };

  const prev = () => {
    setDirection("right");
    setActiveIndex((i) => (i - 1 + PROMO_TILES.length) % PROMO_TILES.length);
  };

  const jumpTo = (i: number) => {
    if (i === activeIndex) return;
    setDirection(i > activeIndex ? "left" : "right");
    setActiveIndex(i);
  };

  const handleDragEnd = (_e: unknown, info: PanInfo) => {
    setIsDragging(false);
    if (info.offset.x < -SWIPE_THRESHOLD_PX) next();
    else if (info.offset.x > SWIPE_THRESHOLD_PX) prev();
  };

  // 슬라이드 variants — reducedMotion 일 때 x 변위 제거 (opacity 페이드만)
  const variants = {
    enter: (dir: SlideDirection) => ({
      x: reducedMotion ? 0 : dir === "left" ? 300 : -300,
      opacity: 0,
    }),
    center: { x: 0, opacity: 1 },
    exit: (dir: SlideDirection) => ({
      x: reducedMotion ? 0 : dir === "left" ? -300 : 300,
      opacity: 0,
    }),
  };

  const activeTile = PROMO_TILES[activeIndex];

  return (
    <LazyMotion features={domAnimation}>
      <section
        role="region"
        aria-roledescription="carousel"
        aria-label="サークル探しの入口"
        aria-live={isPaused ? "polite" : "off"}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className="space-y-2.5"
      >
      {/* 슬라이드 뷰포트 — overflow-hidden 으로 슬라이드 클리핑, touch-pan-y 로 수직 스크롤 위임 */}
      <div className="relative touch-pan-y overflow-hidden rounded-2xl">
        <AnimatePresence mode="wait" custom={direction}>
          <m.div
            key={activeIndex}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
            role="group"
            aria-roledescription="slide"
            aria-label={`${PROMO_TILES.length} のうち ${activeIndex + 1}`}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            dragDirectionLock
            onDragStart={() => setIsDragging(true)}
            onDragEnd={handleDragEnd}
          >
            <Link
              href={activeTile.href}
              className={cn(
                "group focus-visible:ring-ring flex items-center gap-4 rounded-2xl p-5 shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                activeTile.tileClassName
              )}
            >
              <Emoji name={activeTile.emoji} size={40} />
              <div className="flex-1">
                <h2 className="text-lg font-semibold">{activeTile.title}</h2>
                <p className="text-sm opacity-80">{activeTile.subtitle}</p>
              </div>
              <ChevronRight
                className="size-5 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
          </m.div>
        </AnimatePresence>
      </div>

      {/* 하단 dots — 중앙 정렬, 클릭 시 해당 슬라이드로 점프.
          hover/focus/drag 인터랙션 시 자동 회전이 멈추므로 명시적 ⏸ 버튼은 미제공. */}
      <div
        role="tablist"
        aria-label="スライドナビゲーション"
        className="flex items-center justify-center gap-1.5 px-1"
      >
        {PROMO_TILES.map((tile, i) => (
          <button
            key={tile.id}
            type="button"
            role="tab"
            aria-selected={i === activeIndex}
            aria-current={i === activeIndex ? "true" : undefined}
            aria-label={`スライド ${i + 1}`}
            onClick={() => jumpTo(i)}
            className={cn(
              "focus-visible:ring-ring h-1.5 rounded-full transition-all duration-300 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
              i === activeIndex ? "bg-foreground w-4" : "bg-muted-foreground/40 w-1.5"
            )}
          />
        ))}
      </div>
      </section>
    </LazyMotion>
  );
}
