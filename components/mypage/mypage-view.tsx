"use client";

/**
 * MyPageView — 마이페이지 클라이언트 뷰 컨테이너.
 *
 * DB·인증 접근 없이 서버(app/mypage/page.tsx) 에서 props 로 받은 데이터만 렌더.
 * cacheComponents 모드에서 motion("use client") 과 cookies() 의존 RSC 를 분리하기 위한 구조.
 *
 * 모션 구조:
 * - LazyMotion features={domAnimation}: 번들 최소화
 * - m.div variants={enterContainer}: stagger 컨테이너
 *   - 자식 m.div variants={enterItem}: 프로필 → 섹션헤더 → 카드들 순차 fade-up
 * - useReducedMotion(): true 이면 initial = animate = 즉시 표시
 *
 * 하위 컴포넌트:
 * - ProfileHero: 이니셜 아바타 + 이름 + 인증뱃지
 * - ManagedCircleCard: 운영 카드 (status 별 분기)
 * - ManagedCirclesEmpty: 0건 빈 상태
 * - LogoutButton: 로그아웃 (하단)
 */

import Link from "next/link";
import { LazyMotion, domAnimation, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";

import { LogoutButton } from "@/components/logout-button";
import { type MyCircle } from "@/lib/supabase/queries/circles";
import { enterContainer, enterItem } from "@/lib/motion/tokens";

import { ManagedCircleCard } from "./managed-circle-card";
import { ManagedCirclesEmpty } from "./managed-circles-empty";
import { ProfileHero } from "./profile-hero";

interface MyPageViewProps {
  /** 사용자 표시 이름 */
  displayName: string | null;
  /** 慶應生 인증 여부 */
  keioVerified: boolean;
  /** 운영 중인 서클 목록 (전 상태 포함) */
  circles: MyCircle[];
}

export function MyPageView({ displayName, keioVerified, circles }: MyPageViewProps) {
  /* OS "동작 줄이기" 감지 */
  const shouldReduceMotion = useReducedMotion();

  /*
   * reduced motion 대응:
   * - true 이면 variants 의 hidden (opacity:0, y:12) 을 무시하고
   *   initial="show" 로 설정해 즉시 완성 상태로 렌더.
   * - stagger delay 도 제거됨 (animate="show" 즉시 적용).
   */
  const containerVariants = shouldReduceMotion
    ? { hidden: {}, show: {} } // 애니메이션 없음
    : enterContainer;

  const itemVariants = shouldReduceMotion
    ? { hidden: { opacity: 1, y: 0 }, show: { opacity: 1, y: 0 } } // 즉시 표시
    : enterItem;

  return (
    <LazyMotion features={domAnimation}>
      <m.div
        className="container mx-auto max-w-2xl space-y-6 px-4 py-6"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {/* ── 1. 페이지 타이틀 ── */}
        <m.h1 className="text-2xl font-bold" variants={itemVariants}>
          マイページ
        </m.h1>

        {/* ── 2. 프로필 히어로 ── */}
        <m.div variants={itemVariants}>
          <ProfileHero displayName={displayName} keioVerified={keioVerified} />
        </m.div>

        {/* ── 3. 운영 중인 서클 섹션 ── */}
        <m.section variants={itemVariants} aria-label="運営中のサークル">
          {/* 섹션 헤더: 타이틀(건수 포함) + 신규 등록 링크 */}
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold">
              運営中のサークル
              {/* 건수: 0건이면 숫자 숨김 */}
              {circles.length > 0 && (
                <span className="text-muted-foreground ml-1.5 text-sm font-normal">
                  ({circles.length})
                </span>
              )}
            </h2>
            {/* 신규 등록 링크 */}
            <Link
              href="/circles/new"
              className="text-keio-navy hover:text-keio-navy/80 flex items-center gap-0.5 text-sm font-medium transition-colors"
              aria-label="新しいサークルを登録する"
            >
              ＋ 新規登録
            </Link>
          </div>

          {/* 서클 목록 or 빈 상태 */}
          {circles.length === 0 ? (
            /* 0건: 풍성한 빈 상태 컴포넌트 */
            <ManagedCirclesEmpty />
          ) : (
            /* 1건 이상: stagger 카드 목록 */
            <div className="space-y-4">
              {circles.map((circle) => (
                <m.div key={circle.id} variants={itemVariants}>
                  <ManagedCircleCard circle={circle} />
                </m.div>
              ))}
            </div>
          )}
        </m.section>

        {/* ── 4. 로그아웃 버튼 (하단) ── */}
        <m.div variants={itemVariants} className="pt-2">
          <LogoutButton redirectTo="/circles" />
        </m.div>
      </m.div>
    </LazyMotion>
  );
}
