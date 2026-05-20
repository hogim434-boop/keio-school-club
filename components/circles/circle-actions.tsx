"use client";

/**
 * CircleActions — 서클 상세 페이지의 lagging spring sticky CTA
 *
 * 동작 정책 (2026-05):
 * - viewport 하단에 항상 sticky (createPortal 로 body 마운트)
 * - 스크롤 velocity 에 따라 spring 으로 부드럽게 lagging
 * - prefers-reduced-motion 시 모션 비활성
 *
 * 방향 A: 즐겨찾기는 localStorage 기반 게스트 방식 (로그인 불필요, useFavorites hook).
 *
 * UI: 좋아요 + 가입하기 가 하나의 통합 pill 로 표시 (테두리 없음).
 * - 왼쪽: 하트 아이콘 영역 (좋아요 토글)
 * - 오른쪽: 「参加する」 텍스트 영역 (모달 오픈)
 * - 시각적으로 하나의 rounded-full bg-keio-navy pill, 클릭 영역만 내부 분리.
 */

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from "motion/react";

// Heart 아이콘은 AnimatedHeart 내부에서 캡슐화되어 있으므로 직접 import 불필요
import { AnimatedHeart } from "@/components/circles/animated-heart";
import { JoinChannelModal } from "@/components/circles/join-channel-modal";
import { useFavorites } from "@/lib/circles/use-favorites";
import type { CircleDetail } from "@/lib/types/domain";
import { cn } from "@/lib/utils";

interface CircleActionsProps {
  /** 액션 대상 서클 상세 정보 */
  circle: CircleDetail;
}

/**
 * 서클 상세 페이지의 통합 CTA 액션 영역.
 *
 * motion/react 의 useScroll + useVelocity + useSpring 조합으로
 * 스크롤 velocity 에 따라 CTA 가 살짝 「밀려」 부드럽게 따라오는 모션 구현.
 */
export function CircleActions({ circle }: CircleActionsProps) {
  /** 채널 선택 모달 열림 상태 */
  const [modalOpen, setModalOpen] = useState(false);

  /**
   * Portal 마운트 가드 — SSR 단계에서는 document 미존재로 createPortal 호출 불가.
   *
   * 왜 Portal 인가:
   * app/circles/[id]/template.tsx 가 페이지를 motion.div (transform + will-change) 로 감싸는데,
   * CSS 명세상 transform 적용된 조상은 자식 position:fixed 의 containing block 이 됨.
   * 해결: createPortal 로 document.body 에 직접 마운트 → viewport 기준 fixed 정상 복귀.
   */
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  /** 시스템 「모션 줄이기」 설정 감지 — true 면 lagging 효과 비활성 */
  const prefersReducedMotion = useReducedMotion();

  /*
   * lagging spring 모션 파이프라인
   * scrollY → useVelocity → useSpring → useTransform([-2000,0,2000] → [-12,0,12])
   * 효과: 스크롤 시 CTA 가 살짝 밀려났다가 spring 으로 0 복귀.
   */
  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);
  const smoothVelocity = useSpring(scrollVelocity, { damping: 30, stiffness: 200 });
  const yOffset = useTransform(
    smoothVelocity,
    [-2000, 0, 2000],
    prefersReducedMotion ? [0, 0, 0] : [-12, 0, 12]
  );

  /** 즐겨찾기 hook — Supabase Server Action 기반 */
  const { isFavorited: favorited, toggle, isPending } = useFavorites(circle.id);

  /** CTA 텍스트 — 채널(連絡) 모달 오픈 */
  const ctaText = "参加する";

  function handleFavoriteToggle() {
    toggle();
  }

  function handleJoin() {
    setModalOpen(true);
  }

  /*
   * 통합 CTA pill — 좋아요 + 가입하기 가 한 rounded-full 컴포넌트 안에 함께 위치.
   * 색상 분리: 좋아요는 light 배경 + keio-navy 하트, 가입은 keio-navy 배경 + 흰 텍스트.
   * 컨테이너 보더/glassmorphism 제거. shadow-lg 만으로 floating 강조.
   */
  const ctaElement = (
    <motion.div
      className={cn("fixed right-0 bottom-0 left-0 z-30", "pb-[env(safe-area-inset-bottom)]")}
      style={{ y: yOffset }}
    >
      {/* 컨테이너 — 좌우 padding, 모바일/데스크탑 공통 max-w-md 중앙 정렬 */}
      <div className="mx-auto max-w-md px-3 pb-3 md:mb-3">
        {/*
         * 통합 pill — 외곽 rounded-full + overflow-hidden 으로 두 영역 모서리 잘라냄.
         * 자식 두 button 이 각자 배경색을 가짐 (시각적 분리는 색상 차이로 자연 발생).
         */}
        <div className="flex h-14 items-stretch overflow-hidden rounded-full shadow-lg">
          {/*
           * 좋아요 영역 — light 배경 (bg-background) + keio-navy 하트
           * active 시 하트 fill (keio-navy 채움)
           */}
          <button
            type="button"
            onClick={handleFavoriteToggle}
            aria-pressed={favorited}
            aria-label={favorited ? "お気に入りから削除" : "お気に入りに追加"}
            disabled={isPending}
            className={cn(
              "flex w-14 shrink-0 items-center justify-center transition-colors",
              "bg-background text-keio-navy hover:bg-muted",
              "active:scale-95 motion-reduce:transform-none",
              "focus-visible:ring-keio-navy/40 focus-visible:ring-2 focus-visible:outline-none",
              "disabled:pointer-events-none disabled:opacity-70"
            )}
          >
            {/*
             * AnimatedHeart — 팝 + 링 펄스 마이크로 인터랙션.
             * colorClassName="text-keio-navy": 활성 시 keio-navy 로 채워짐.
             * 링도 border-current 로 동일 색 상속.
             */}
            <AnimatedHeart active={favorited} className="size-5" colorClassName="text-keio-navy" />
          </button>

          {/*
           * 가입하기 영역 — keio-navy 배경 + 흰 텍스트
           * flex-1 로 좋아요 옆 나머지 폭 모두 차지
           */}
          <button
            type="button"
            onClick={handleJoin}
            className={cn(
              "flex flex-1 items-center justify-center text-base font-semibold transition-colors",
              "bg-keio-navy text-keio-navy-foreground hover:bg-keio-navy/90",
              "active:scale-95 motion-reduce:transform-none",
              "focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
            )}
          >
            {ctaText}
          </button>
        </div>
      </div>
    </motion.div>
  );

  return (
    <>
      {/* hydration 후 portal 활성화 — SSR 단계는 빈 자리 (below-the-fold 라 인지 불가) */}
      {mounted && createPortal(ctaElement, document.body)}

      {/* 채널 선택 모달 — Radix Sheet 의 내부 Portal 사용 */}
      <JoinChannelModal circle={circle} open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}
