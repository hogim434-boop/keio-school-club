"use client";

/**
 * CircleActions — 서클 상세 페이지의 lagging spring sticky CTA
 *
 * 동작 정책 (2026-05 T-010 개편):
 * - viewport 하단에 항상 sticky (createPortal 로 body 마운트)
 * - 스크롤 velocity 에 따라 spring 으로 부드럽게 lagging
 * - prefers-reduced-motion 시 모션 비활성
 *
 * 方向 A: 즐겨찾기는 localStorage 기반 게스트 방식 (로그인 불필요, useFavorites hook).
 *
 * UI: 좋아요 + 운영 문의하기 가 하나의 통합 pill 로 표시 (테두리 없음).
 * - 왼쪽: 하트 아이콘 영역 (좋아요 토글) — 유지
 * - 오른쪽(claim済み): 「運営に問い合わせる」 → /circles/{id}/dm 직접 이동
 * - 오른쪽(未claim):   公式SNS (Instagram 우선 → X 순) 외부 링크 버튼.
 *                      SNS 가 하나도 없으면 CTA 영역 자체 미표시.
 *
 * M-024: circle.is_claimed が false の場合は인앱 DM 버튼を非表示にして
 *        公式SNS へのリンクボタンを表示する.
 *
 * JoinChannelModal 은 외부 SNS 풋터(page.tsx)에서 별도 트리거로 분리됨.
 */

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Instagram, Twitter } from "lucide-react";
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
import { useFavorites } from "@/lib/circles/use-favorites";
import type { CircleDetail } from "@/lib/types/domain";
import { cn } from "@/lib/utils";
import { MESSAGING_ENABLED } from "@/lib/constants/features";

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
  const router = useRouter();

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

  function handleFavoriteToggle() {
    toggle();
  }

  /** 「運営に問い合わせる」 클릭 → /circles/{id}/dm 직접 이동 (claim済み 전용) */
  function handleInquiry() {
    router.push(`/circles/${circle.id}/dm`);
  }

  /**
   * 미claim 동아리 공식 SNS 링크 결정 (M-024).
   * Instagram 우선, 없으면 X, 둘 다 없으면 null → CTA 영역 자체 미표시.
   */
  const snsCtaHref = circle.contact_instagram ?? circle.contact_x ?? null;
  const isSnsInstagram = !!circle.contact_instagram;

  /**
   * 오른쪽 CTA 영역 결정 (M-024 + MESSAGING_ENABLED 플래그):
   * - claim済み かつ MESSAGING_ENABLED=true: 「運営に問い合わせる」인앱 DM 버튼
   * - 上記以外 (messaging off または 未claim) + SNS あり: 公式SNS 외부 링크 버튼
   * - 上記以外 + SNS なし: null (하트 단독 표시)
   *
   * MESSAGING_ENABLED=false の間は claim 여부와 무관하게 SNS 핸드오프로 통일된다.
   */
  const rightCta = (() => {
    if (circle.is_claimed && MESSAGING_ENABLED) {
      // claim済み かつ メッセージ機能 ON — 인앱 DM 버튼
      return (
        <motion.button
          type="button"
          onClick={handleInquiry}
          whileTap={prefersReducedMotion ? undefined : { scale: 0.97 }}
          transition={{ type: "spring", stiffness: 400, damping: 15 }}
          style={{ WebkitTapHighlightColor: "transparent" }}
          className={cn(
            "flex flex-1 items-center justify-center text-base font-bold tracking-wide transition-colors",
            "bg-keio-navy text-keio-navy-foreground hover:bg-keio-navy/90",
            "focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none",
            "touch-manipulation select-none"
          )}
        >
          運営に問い合わせる
        </motion.button>
      );
    }

    if (!snsCtaHref) {
      // SNS なし — CTA 右側なし (ハート単独)
      return null;
    }

    // SNS あり — 公式SNS 외부 링크 버튼
    // (未claim の場合も、MESSAGING_ENABLED=false で claim済みでも同じボタンを表示)
    const snsLabel = isSnsInstagram ? "Instagramで問い合わせる" : "X（Twitter）で問い合わせる";
    const SnsIcon = isSnsInstagram ? Instagram : Twitter;

    return (
      <motion.a
        href={snsCtaHref}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={snsLabel}
        whileTap={prefersReducedMotion ? undefined : { scale: 0.97 }}
        transition={{ type: "spring", stiffness: 400, damping: 15 }}
        style={{ WebkitTapHighlightColor: "transparent" }}
        className={cn(
          "flex flex-1 items-center justify-center gap-2 text-base font-bold tracking-wide transition-colors",
          "bg-keio-navy text-keio-navy-foreground hover:bg-keio-navy/90",
          "focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none",
          "touch-manipulation select-none"
        )}
      >
        <SnsIcon className="size-4 shrink-0" aria-hidden />
        {snsLabel}
      </motion.a>
    );
  })();

  /*
   * 통합 CTA pill — 좋아요 + CTA が한 rounded-full 컴포넌트 안에 함께 위치.
   * rightCta が null の場合はハートのみ（full-width）表示.
   */
  const ctaElement = (
    <motion.div
      className={cn("fixed right-0 bottom-0 left-0 z-30", "pb-[env(safe-area-inset-bottom)]")}
      style={{ y: yOffset }}
    >
      {/* 컨테이너 — 좌우 padding, 모바일/데스크탑 공통 max-w-md 중앙 정렬 */}
      <div className="mx-auto max-w-md px-3 pb-3 md:mb-3">
        {/*
         * 통합 pill — h-16, shadow-xl + keio-navy/25 글로우로 floating 강조.
         * rightCta が null なら border-r を出さないようハート幅を可変にする.
         */}
        <div className="shadow-keio-navy/25 flex h-16 items-stretch overflow-hidden rounded-full shadow-xl">
          {/*
           * 좋아요 영역.
           * rightCta がある場合: w-16 固定 + border-r 구분선.
           * rightCta が null(未claim+SNS なし)  : flex-1 で全幅.
           */}
          <motion.button
            type="button"
            onClick={handleFavoriteToggle}
            aria-pressed={favorited}
            aria-label={favorited ? "お気に入りから削除" : "お気に入りに追加"}
            disabled={isPending}
            whileTap={prefersReducedMotion ? undefined : { scale: 0.85 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
            style={{ WebkitTapHighlightColor: "transparent" }}
            className={cn(
              "flex items-center justify-center transition-colors",
              "bg-background text-keio-navy hover:bg-muted",
              "focus-visible:ring-keio-navy/40 focus-visible:ring-2 focus-visible:outline-none",
              "disabled:pointer-events-none disabled:opacity-70",
              "touch-manipulation select-none",
              // rightCta があるときだけ 幅固定 + 구분선
              rightCta ? "border-keio-navy/15 w-16 shrink-0 border-r" : "flex-1"
            )}
          >
            {/*
             * AnimatedHeart — 팝 + 링 펄스 마이크로 인터랙션.
             * colorClassName="text-keio-navy": 활성 시 keio-navy 로 채워짐.
             */}
            <AnimatedHeart active={favorited} className="size-5" colorClassName="text-keio-navy" />
          </motion.button>

          {/* 오른쪽 CTA — claim 분기로 결정된 버튼 또는 null */}
          {rightCta}
        </div>
      </div>
    </motion.div>
  );

  return (
    <>
      {/* hydration 후 portal 활성화 — SSR 단계는 빈 자리 (below-the-fold 라 인지 불가) */}
      {mounted && createPortal(ctaElement, document.body)}
    </>
  );
}
