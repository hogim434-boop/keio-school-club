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
 * - AnimatePresence: 카드 삭제 시 exit 페이드아웃 재생
 * - useReducedMotion(): true 이면 initial = animate = 즉시 표시 / exit 도 비활성
 *
 * 삭제 흐름 (낙관적 업데이트):
 *   handleDelete(id) →
 *     1. 로컬 state 에서 즉시 제거 → AnimatePresence exit 재생 (opacity 0, 0.2s)
 *     2. deleteCircle(id) Server Action 호출
 *     3. 실패 시 목록 복원 + toast.error("削除に失敗しました")
 *     4. 성공 시 toast.success("削除しました") (선택)
 *
 * 하위 컴포넌트:
 * - ProfileHero: 이니셜 아바타 + 이름 + 인증뱃지
 * - ManagedCircleCard: 운영 카드 (status 별 분기) — onRequestDelete prop 추가
 * - ManagedCirclesEmpty: 0건 빈 상태
 * - LogoutButton: 로그아웃 (하단)
 */

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, LazyMotion, domAnimation, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { toast } from "sonner";

import { deleteCircle } from "@/app/mypage/actions";
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

export function MyPageView({
  displayName,
  keioVerified,
  circles: initialCircles,
}: MyPageViewProps) {
  /* OS "동작 줄이기" 감지 */
  const shouldReduceMotion = useReducedMotion();

  /*
   * 로컬 서클 목록 상태 — props 를 초기값으로 하는 클라이언트 state.
   * 삭제 시 낙관적으로 즉시 제거하고, 서버 Action 실패 시 복원한다.
   * revalidatePath 후 서버가 새 props 를 내려도 로컬 state 가 source of truth.
   */
  const [localCircles, setLocalCircles] = useState<MyCircle[]>(initialCircles);

  /*
   * 동아리 삭제 핸들러 — 낙관적 업데이트 패턴.
   * 1. 로컬 state 에서 즉시 제거 → AnimatePresence exit 재생
   * 2. Server Action 호출
   * 3. 실패 시 목록 복원 + 에러 토스트
   */
  const handleDelete = async (id: string) => {
    // 1. 낙관적 제거 — exit 페이드아웃 즉시 재생
    setLocalCircles((prev) => prev.filter((c) => c.id !== id));

    // 2. Server Action 호출
    const res = await deleteCircle(id);

    if (!res.ok) {
      // 3a. 실패 — 원래 목록 복원 + 에러 토스트
      setLocalCircles(initialCircles);
      toast.error("削除に失敗しました");
      return;
    }

    // 3b. 성공 — 가벼운 완료 토스트 (카드가 사라진 것으로 충분하지만 명시적 피드백 제공)
    toast.success("削除しました");
  };

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
              {localCircles.length > 0 && (
                <span className="text-muted-foreground ml-1.5 text-sm font-normal">
                  ({localCircles.length})
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
          {localCircles.length === 0 ? (
            /* 0건: 풍성한 빈 상태 컴포넌트 */
            <ManagedCirclesEmpty />
          ) : (
            /*
             * 1건 이상: AnimatePresence 로 감싸 개별 카드의 exit 페이드아웃 처리.
             * - AnimatePresence initial={false}: 최초 마운트 시 진입 애니메이션 중복 방지
             *   (진입은 부모 m.div variants={enterItem} 로 처리하므로)
             * - 각 카드 래퍼 m.div 에 key={circle.id}, layout, exit 설정
             */
            <div className="space-y-4">
              <AnimatePresence initial={false}>
                {localCircles.map((circle) => (
                  <m.div
                    key={circle.id}
                    layout
                    variants={itemVariants}
                    /*
                     * exit: 카드가 제거될 때 opacity 0 으로 페이드아웃.
                     * reduced motion 시에는 exit 를 적용하지 않아 즉시 사라짐.
                     * layout transition: 카드 제거 후 남은 카드들이 FLIP 으로 자연스럽게 이동.
                     */
                    exit={
                      shouldReduceMotion
                        ? undefined
                        : {
                            opacity: 0,
                            transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] },
                          }
                    }
                    transition={{
                      layout: {
                        duration: shouldReduceMotion ? 0 : 0.28,
                        ease: [0.32, 0.72, 0, 1],
                      },
                    }}
                  >
                    <ManagedCircleCard
                      circle={circle}
                      onRequestDelete={() => handleDelete(circle.id)}
                    />
                  </m.div>
                ))}
              </AnimatePresence>
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
