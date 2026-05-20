"use client";

/**
 * FavoritesPageBody — 즐겨찾기 페이지 본문 (T-017)
 *
 * localStorage(`kc:favorites`)에서 저장된 서클 id를 읽어
 * 서버 액션으로 상세 데이터를 fetch하고 카드 그리드로 표시한다.
 *
 * 상태 흐름:
 *   ids=null(초기) → 마운트 후 syncIds() → ids=string[]
 *   ids 변경 → getFavoriteCircles() → circles 정렬 저장
 *
 * 즐겨찾기 해제 감지:
 *   prevIdsRef와 현재 ids를 비교 → 줄어든 id가 있으면 undo 토스트 발행.
 *
 * 모션:
 *   LazyMotion + domAnimation으로 번들 최소화.
 *   useReducedMotion() 준수 — 접근성 설정 시 즉시 완성 상태로 표시.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { toast } from "sonner";
// motion/react: LazyMotion으로 필요한 애니메이션 기능만 번들에 포함
import { LazyMotion, domAnimation, AnimatePresence, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";

import { getFavoriteIds, addFavoriteLocal } from "@/lib/circles/use-favorites";
import { getFavoriteCircles } from "@/app/favorites/actions";
import { CircleCard } from "@/components/circles/circle-card";
import type { CircleSummary } from "@/lib/types/domain";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export function FavoritesPageBody() {
  // ─── 상태 ──────────────────────────────────────────────────────────────────
  /** null = SSR/마운트 전 미로딩, string[] = localStorage에서 읽은 id 배열 */
  const [ids, setIds] = useState<string[] | null>(null);
  /** 서버 액션으로 fetch한 서클 요약 목록 (ids 순서대로 정렬) */
  const [circles, setCircles] = useState<CircleSummary[]>([]);
  /** 서버 액션 fetch 중 여부 */
  const [loading, setLoading] = useState(false);

  /**
   * 이전 ids 보관 ref — undo 감지에 사용.
   * state에 넣으면 re-render가 추가 발생하므로 ref 사용.
   */
  const prevIdsRef = useRef<string[]>([]);
  /**
   * undo 토스트에서 name 조회를 위해 직전 circles를 ref로 보관.
   * circles state는 fetch 후 갱신되어 삭제 직후에도 이전 값 유지 필요.
   */
  const prevCirclesRef = useRef<CircleSummary[]>([]);

  // ─── 마운트: localStorage 읽기 + 이벤트 구독 ─────────────────────────────
  useEffect(() => {
    /**
     * localStorage에서 최신 즐겨찾기 id 배열을 읽어 state에 반영.
     * 같은 탭: "kc-favorites-changed" CustomEvent
     * 다른 탭:  "storage" StorageEvent
     */
    const syncIds = () => setIds(getFavoriteIds());

    // 마운트 시 1회 즉시 실행
    syncIds();

    window.addEventListener("kc-favorites-changed", syncIds);
    window.addEventListener("storage", syncIds);

    return () => {
      window.removeEventListener("kc-favorites-changed", syncIds);
      window.removeEventListener("storage", syncIds);
    };
  }, []);

  // ─── ids 변경 시: undo 감지 + 서버 액션 fetch ────────────────────────────
  useEffect(() => {
    // null = 아직 마운트 전이므로 fetch 불필요
    if (ids === null) return;

    // ── undo 감지: 이전 ids에는 있었지만 현재 ids에는 없는 id(줄어든 것만) ──
    const prevIds = prevIdsRef.current;
    const removedIds = prevIds.filter((id) => !ids.includes(id));

    for (const removedId of removedIds) {
      // 직전 circles에서 서클명 조회 (fetch 전이므로 prevCirclesRef 사용)
      const circle = prevCirclesRef.current.find((c) => c.id === removedId);
      const message = circle
        ? `「${circle.name}」をお気に入りから削除しました`
        : "お気に入りから削除しました";

      toast(message, {
        action: {
          label: "元に戻す",
          /**
           * addFavoriteLocal → kc-favorites-changed 발화 → syncIds → ids 복구.
           * ids가 다시 늘어나므로 "줄어든 경우"가 아니라 undo 토스트 재발행 없음 (무한루프 방지).
           */
          onClick: () => addFavoriteLocal(removedId),
        },
        duration: 4000,
      });
    }

    // 현재 ids를 다음 비교를 위해 ref에 저장
    prevIdsRef.current = ids;

    // ── ids가 비어있으면 fetch 없이 빈 배열로 ──
    if (ids.length === 0) {
      setCircles([]);
      return;
    }

    // ── 서버 액션으로 서클 데이터 fetch ──
    let cancelled = false;
    setLoading(true);

    getFavoriteCircles(ids).then((data) => {
      // 컴포넌트 언마운트 또는 ids 재변경 시 결과 무시 (race condition 방지)
      if (cancelled) return;

      // 서버가 순서를 보장하지 않으므로 ids 배열 순서대로 재정렬
      const byId = new Map(data.map((c) => [c.id, c]));
      const sorted = ids
        .map((id) => byId.get(id))
        .filter((c): c is CircleSummary => c !== undefined);

      // 다음 undo 감지에서 name 조회할 수 있도록 ref도 갱신
      prevCirclesRef.current = sorted;
      setCircles(sorted);
      setLoading(false);
    });

    // cleanup: ids가 바뀌면 이전 fetch 결과 무시
    return () => {
      cancelled = true;
    };
    // circles를 dep에 포함하면 fetch 완료 → circles 변경 → 재fetch 무한루프 발생.
    // prevCirclesRef로 접근하므로 의도적으로 제외.
  }, [ids]);

  // ─── 렌더 분기 헬퍼 ────────────────────────────────────────────────────────
  /** 로딩 스켈레톤: fetch 중이고 ids가 1개 이상인 경우 */
  const showSkeleton = loading && (ids?.length ?? 0) > 0;
  /** 빈 상태: ids 로딩 완료 + fetch 완료 + 서클 없음 */
  const showEmpty = ids !== null && !loading && circles.length === 0;
  /** 카드 그리드: 서클 데이터가 1개 이상 */
  const showGrid = circles.length > 0;

  /**
   * useReducedMotion: 사용자가 OS에서 "동작 줄이기"를 켰는지 감지.
   * true면 애니메이션 없이 즉시 완성 상태로 렌더한다 (접근성 준수).
   */
  const shouldReduceMotion = useReducedMotion();

  // ─── 렌더 ──────────────────────────────────────────────────────────────────
  return (
    <div className="container mx-auto max-w-6xl space-y-6 px-4 py-6">
      {/* ── 헤더 ── */}
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold tracking-tight">お気に入り</h1>
        {/* 서클이 1개 이상일 때만 건수 표시 */}
        {circles.length > 0 && (
          <span className="text-muted-foreground text-sm">{circles.length}件</span>
        )}
      </div>

      {/* ── 로딩: 스켈레톤 그리드 ── */}
      {showSkeleton && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              {/* 카드 커버 이미지 자리 */}
              <Skeleton className="aspect-[16/9] w-full rounded-lg" />
              {/* 카테고리 배지 자리 */}
              <Skeleton className="h-4 w-16 rounded" />
              {/* 서클명 자리 */}
              <Skeleton className="h-4 w-3/4 rounded" />
              {/* 태그 자리 */}
              <Skeleton className="h-3 w-1/2 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* ── 빈 상태 ──
           LazyMotion 내부의 m.div로 가볍게 fade + scale 등장.
           reduced motion 시에는 initial을 animate와 동일하게 설정해 즉시 표시. */}
      <LazyMotion features={domAnimation}>
        {showEmpty && (
          <m.div
            className="flex flex-col items-center gap-4 py-16 text-center"
            /**
             * reduced motion: opacity/scale 모두 완성값으로 시작해 애니메이션 없이 표시.
             * 일반 모드: 살짝 작고 투명한 상태(scale 0.96, opacity 0)에서 등장.
             */
            initial={shouldReduceMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: 0.3,
              ease: [0.22, 1, 0.36, 1], // expo out — 빠르게 시작해 부드럽게 멈춤
            }}
          >
            {/* 하트 아이콘 — strokeWidth 1.5 로 가볍게 */}
            <Heart size={64} strokeWidth={1.5} className="text-keio-navy" aria-hidden="true" />
            <p className="font-semibold">お気に入りはまだありません</p>
            <p className="text-muted-foreground text-sm">気になるサークルを♡で保存しましょう</p>
            {/* 서클 목록 페이지로 이동 */}
            <Button asChild className="h-12">
              <Link href="/circles">サークルを探す</Link>
            </Button>
          </m.div>
        )}
      </LazyMotion>

      {/* ── 카드 그리드 ──
           LazyMotion 범위 안에서:
           - AnimatePresence mode="popLayout": 카드 제거 시 exit 애니메이션 재생 후
             나머지 카드들이 자연스럽게 자리를 채움.
           - 각 m.div에 layout prop: 레이아웃 변경 시 카드 위치가 부드럽게 이동. */}
      <LazyMotion features={domAnimation}>
        <AnimatePresence mode="popLayout">
          {showGrid && (
            <m.div
              // showGrid 변경 시 그리드 컨테이너 자체의 등장/퇴장은 불필요하므로
              // key를 고정해 컨테이너는 유지하고 내부 카드만 개별 애니메이션 처리
              key="circle-grid"
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
              aria-label="お気に入りサークル一覧"
            >
              <AnimatePresence mode="popLayout">
                {circles.map((c, i) => (
                  /**
                   * m.div: 각 카드를 모션 래퍼로 감쌈.
                   *   - key=c.id: circles 배열에서 id가 사라지면 AnimatePresence가 exit 재생.
                   *   - layout: 카드 제거 후 남은 카드들의 위치 변경을 부드럽게 처리.
                   *
                   * 진입 (initial→animate):
                   *   y: 8px 아래에서 올라오며 fade-in. 카드 많아도 딜레이 상한 적용.
                   *
                   * 제거 (exit):
                   *   scale 0.95 + opacity 0으로 살짝 수축하며 사라짐.
                   *   reduced motion 시에는 exit 적용하지 않음.
                   */
                  <m.div
                    key={c.id}
                    layout
                    initial={
                      shouldReduceMotion
                        ? { opacity: 1, y: 0 } // reduced: 즉시 완성 상태
                        : { opacity: 0, y: 8 } // 일반: 8px 아래에서 올라옴
                    }
                    animate={{ opacity: 1, y: 0 }}
                    exit={
                      shouldReduceMotion
                        ? undefined // reduced: exit 생략
                        : { opacity: 0, scale: 0.95 }
                    }
                    transition={{
                      duration: 0.28,
                      ease: [0.22, 1, 0.36, 1],
                      // 카드가 많아도 딜레이 최대 0.32s (8번째 이후는 동일 딜레이)
                      delay: shouldReduceMotion ? 0 : Math.min(i, 8) * 0.04,
                    }}
                  >
                    <CircleCard circle={c} />
                  </m.div>
                ))}
              </AnimatePresence>
            </m.div>
          )}
        </AnimatePresence>
      </LazyMotion>
    </div>
  );
}
