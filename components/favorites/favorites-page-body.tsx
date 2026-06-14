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
 *
 * 개편 (2열 그리드):
 *   - 정렬: 最近保存順 / カテゴリ順 / 募集中を優先 (circles.length >= 5 일 때 드롭다운 표시)
 *   - 필터 칩: 募集中 토글 + 카테고리 단일 선택 (circles.length > 1 일 때 표시)
 *   - 파생 목록: visibleCircles = useMemo(filter → sort)
 *   - 그리드: grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4
 *   - ＋追加 타일: 그리드 마지막 셀
 *   - 추천 섹션: circles.length <= 3 AND 필터 미적용 시
 *   - 필터 0건: 条件に合うサークルがありません + 리셋 버튼
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Plus, ArrowUpDown, Undo2 } from "lucide-react";
// motion/react: LazyMotion으로 필요한 애니메이션 기능만 번들에 포함
import { LazyMotion, domAnimation, AnimatePresence, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";

import { getFavoriteIds, removeFavoriteLocal } from "@/lib/circles/use-favorites";
import { getFavoriteCircles } from "@/app/(tabs)/favorites/actions";
import { FavoriteGridCard } from "@/components/favorites/favorite-grid-card";
import type { CircleSummary } from "@/lib/types/domain";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  CATEGORIES,
  type Category,
} from "@/lib/constants/category";
import { getCurrentRecruitingStatuses } from "@/lib/constants/recruitment-status";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Emoji } from "@/components/ui/emoji";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/** 정렬 키 타입 */
type SortKey = "recent" | "category" | "recruiting";

/** 정렬 옵션 레이블 */
const SORT_LABELS: Record<SortKey, string> = {
  recent: "最近保存順",
  category: "カテゴリ順",
  recruiting: "募集中を優先",
};

export function FavoritesPageBody() {
  // ─── 상태 ──────────────────────────────────────────────────────────────────
  /** null = SSR/마운트 전 미로딩, string[] = localStorage에서 읽은 id 배열 */
  const [ids, setIds] = useState<string[] | null>(null);
  /** 서버 액션으로 fetch한 서클 요약 목록 (ids 순서대로 정렬) */
  const [circles, setCircles] = useState<CircleSummary[]>([]);
  /** 서버 액션 fetch 중 여부 */
  const [loading, setLoading] = useState(false);

  /** 정렬 키 — 기본값은 최근 저장 순 */
  const [sortKey, setSortKey] = useState<SortKey>("recent");
  /** 募集中 필터 토글 */
  const [recruitingOnly, setRecruitingOnly] = useState(false);
  /** 카테고리 단일 선택 필터 */
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  /**
   * 인라인 Undo 유예 중인 서클 id 집합.
   * 좋아요(하트) 취소 시 즉시 제거하지 않고, 해당 카드 자리에 「削除しました · 元に戻す」
   * 스트립을 ~3초간 보여준다. 3초 경과 시 commit(localStorage 실제 제거)되어 카드가 페이드아웃.
   */
  const [pendingDelete, setPendingDelete] = useState<Set<string>>(new Set());
  /** id별 유예 타이머 — undo 시 취소 / 언마운트 시 일괄 정리 */
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  /**
   * 이전 ids 보관 ref — 이후 로직 호환용.
   * state에 넣으면 re-render가 추가 발생하므로 ref 사용.
   */
  const prevIdsRef = useRef<string[]>([]);
  /**
   * 직전 circles 캐시 ref — ids 변경 시 추가분이 없으면(취소/재정렬) 재fetch 없이
   * 이 캐시로 즉시 갱신하는 데 사용 (스크롤 점프 방지 최적화).
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

  // ─── ids 변경 시: 서버 액션 fetch (또는 캐시 즉시 갱신) ───────────────────
  // 좋아요 취소 알림은 하단 토스트가 아니라 카드 자리의 인라인 Undo(pendingDelete)가 담당.
  useEffect(() => {
    // null = 아직 마운트 전이므로 fetch 불필요
    if (ids === null) return;

    // 현재 ids를 다음 비교를 위해 ref에 저장 (이후 로직 호환용)
    prevIdsRef.current = ids;

    // ── ids가 비어있으면 fetch 없이 빈 배열로 ──
    if (ids.length === 0) {
      setCircles([]);
      return;
    }

    // ── 최적화: 추가된 id 가 없으면(좋아요 취소·재정렬만) 재fetch 하지 않고
    //    이미 받아둔 데이터로 즉시 갱신. → 로딩 스켈레톤이 그리드 위에 삽입되며
    //    스크롤이 아래로 점프하던 문제 제거 + exit 페이드아웃이 즉시 재생됨. ──
    const cached = prevCirclesRef.current;
    const allCached = ids.every((id) => cached.some((c) => c.id === id));
    if (allCached) {
      const byId = new Map(cached.map((c) => [c.id, c]));
      const sorted = ids
        .map((id) => byId.get(id))
        .filter((c): c is CircleSummary => c !== undefined);
      prevCirclesRef.current = sorted;
      setCircles(sorted);
      return;
    }

    // ── 서버 액션으로 서클 데이터 fetch (신규 id 포함 시) ──
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

  // ─── 인라인 Undo 핸들러 ────────────────────────────────────────────────────
  /**
   * 하트 취소 요청 — 즉시 제거하지 않고 카드 자리에 Undo 스트립 표시 + 3초 후 commit.
   * (localStorage 는 commit 시점에만 변경되므로, 그 전에는 카드 데이터가 그대로 유지됨)
   */
  const requestRemove = (id: string) => {
    setPendingDelete((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    // 기존 타이머가 있으면 교체
    const existing = timersRef.current.get(id);
    if (existing) clearTimeout(existing);
    const t = setTimeout(() => commitRemove(id), 2000);
    timersRef.current.set(id, t);
  };

  /** Undo — 유예 취소. localStorage 미변경이라 카드가 그대로 복귀. */
  const cancelRemove = (id: string) => {
    const t = timersRef.current.get(id);
    if (t) clearTimeout(t);
    timersRef.current.delete(id);
    setPendingDelete((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  /**
   * commit — 실제 제거. localStorage 에서 빼면 ids 변경 → circles 갱신 → 카드 페이드아웃.
   * pendingDelete 의 id 는 카드가 페이드아웃하는 동안 유지하다가, 페이드 완료 후(500ms) 정리
   * (제거 직전 프레임에 스트립→카드로 깜빡이는 것을 방지).
   */
  const commitRemove = (id: string) => {
    timersRef.current.delete(id);
    removeFavoriteLocal(id);
    setTimeout(() => {
      setPendingDelete((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 500);
  };

  // 언마운트 시: 유예 중인 항목은 의도대로 실제 제거(커밋)하고 타이머 정리.
  // (3초 전에 페이지를 떠나도 「취소」 의도가 보존됨)
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((t, id) => {
        clearTimeout(t);
        removeFavoriteLocal(id);
      });
      timers.clear();
    };
  }, []);

  // ─── 파생 상태 ─────────────────────────────────────────────────────────────

  /**
   * 필터 칩에 표시할 카테고리 목록 — 저장된 서클에 실제로 존재하는 카테고리만,
   * CATEGORY_ORDER 순으로 정렬.
   */
  const availableCategories = useMemo(() => {
    const cats = new Set(circles.map((c) => c.category));
    return CATEGORY_ORDER.filter((cat) => cats.has(cat));
  }, [circles]);

  /**
   * 필터 + 정렬을 적용한 파생 목록.
   * 원본 circles 배열은 변경하지 않음 (필터 해제 시 복원 가능).
   */
  const visibleCircles = useMemo(() => {
    let result = [...circles];

    // 필터 1: 募集中 — 현재 모집중 상태 배열에 포함되는 서클만
    if (recruitingOnly) {
      const statuses = getCurrentRecruitingStatuses();
      result = result.filter(
        (c) => c.recruitment_status !== null && statuses.includes(c.recruitment_status)
      );
    }

    // 필터 2: 카테고리 단일 선택
    if (selectedCategory !== null) {
      result = result.filter((c) => c.category === selectedCategory);
    }

    // 정렬
    if (sortKey === "category") {
      // CATEGORY_ORDER 인덱스 오름차순
      result = [...result].sort(
        (a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category)
      );
    } else if (sortKey === "recruiting") {
      // 현재 모집중인 서클을 앞으로 (동일 그룹 내 순서 유지)
      const statuses = getCurrentRecruitingStatuses();
      result = [...result].sort((a, b) => {
        const aActive =
          a.recruitment_status !== null && statuses.includes(a.recruitment_status) ? 0 : 1;
        const bActive =
          b.recruitment_status !== null && statuses.includes(b.recruitment_status) ? 0 : 1;
        return aActive - bActive;
      });
    }
    // "recent": ids 원순서 유지 (circles가 이미 ids 순서로 정렬됨)

    return result;
  }, [circles, recruitingOnly, selectedCategory, sortKey]);

  /** 필터가 하나도 적용되지 않은 상태인지 여부 */
  const isFilterDefault = !recruitingOnly && selectedCategory === null;

  /** 필터 전체 초기화 핸들러 */
  const resetFilters = () => {
    setRecruitingOnly(false);
    setSelectedCategory(null);
  };

  // ─── 렌더 분기 헬퍼 ────────────────────────────────────────────────────────
  /** 로딩 스켈레톤: 최초 로드(아직 표시할 서클이 하나도 없을 때)에만.
   *  이미 카드가 떠 있는 상태(좋아요 취소 등)에서는 스켈레톤을 그리드 위에 삽입하지 않음
   *  → 콘텐츠가 밀리며 스크롤이 점프하던 문제 방지. */
  const showSkeleton = loading && (ids?.length ?? 0) > 0 && circles.length === 0;
  /** 빈 상태: ids 로딩 완료 + fetch 완료 + 서클 없음 */
  const showEmpty = ids !== null && !loading && circles.length === 0;
  /** 카드 그리드: 서클 데이터가 1개 이상 */
  const showGrid = circles.length > 0;

  /** 필터 0건: 저장된 서클은 있지만 필터 결과가 없는 경우 */
  const showFilterEmpty = showGrid && visibleCircles.length === 0;

  /** 추천 섹션: 저장 수가 적고 필터 미적용 상태 */
  const showRecommend = circles.length <= 3 && isFilterDefault && !loading;

  /**
   * useReducedMotion: 사용자가 OS에서 "동작 줄이기"를 켰는지 감지.
   * true면 애니메이션 없이 즉시 완성 상태로 렌더한다 (접근성 준수).
   */
  const shouldReduceMotion = useReducedMotion();

  // ─── 렌더 ──────────────────────────────────────────────────────────────────
  return (
    <div className="container mx-auto max-w-6xl space-y-4 px-4 py-6">
      {/* ── 헤더: 타이틀 + 건수 + 정렬 드롭다운 ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <h1 className="text-2xl font-bold tracking-tight">お気に入り</h1>
          {/* 건수 — 유예 중(인라인 Undo) 항목은 제외해 실제 보유 수를 표시 */}
          {circles.length - pendingDelete.size > 0 && (
            <span className="text-muted-foreground text-sm">
              {circles.length - pendingDelete.size}件
            </span>
          )}
        </div>

        {/* 정렬 드롭다운: 저장 5개 이상일 때만 표시
            m.div로 감싸 처음 등장 시 가벼운 fade 진입. whileTap은 shadcn Button 자체 active 상태를 해치지 않도록 트리거 레벨에선 생략. */}
        {circles.length >= 5 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              {/*
               * 정렬 버튼 tap 피드백: m.div로 래핑해 scale 0.97 살짝 눌리는 느낌.
               * shadcn Button 내부 스타일을 건드리지 않도록 래퍼에만 적용.
               * reduced motion 시 whileTap 비활성.
               */}
              <m.div
                whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
                transition={{ duration: 0.12, ease: [0.22, 1, 0.36, 1] }}
                style={{ display: "inline-flex" }}
              >
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  aria-label="並び替えオプションを開く"
                >
                  <ArrowUpDown className="size-3.5" />
                  並び替え
                </Button>
              </m.div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-36">
              {(["recent", "category", "recruiting"] as SortKey[]).map((key) => (
                <DropdownMenuItem
                  key={key}
                  onClick={() => setSortKey(key)}
                  className={cn(
                    "text-xs",
                    // 현재 선택된 정렬 항목 강조
                    sortKey === key && "font-semibold"
                  )}
                >
                  {SORT_LABELS[key]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* ── 필터 칩 행: 저장 2개 이상일 때만 표시, 가로 스크롤 풀블리드 ──
          AnimatePresence로 칩 행 전체의 등장/퇴장을 fade+slide로 처리.
          칩 행이 갑자기 나타나거나 사라지면 레이아웃이 튀는 느낌이라
          아래에서 8px 올라오며 서서히 나타나는 방식으로 완화. */}
      <LazyMotion features={domAnimation}>
        <AnimatePresence initial={false}>
          {circles.length > 1 && (
            <m.div
              key="filter-chips-row"
              initial={shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: -4 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="-mx-4 overflow-x-auto px-4"
            >
              <div className="flex gap-2 pb-1" style={{ width: "max-content" }}>
                {/* 募集中 토글 칩
                    m.button으로 교체해 whileTap scale 피드백 추가.
                    색상 전환은 기존 transition-colors 그대로 유지. */}
                <m.button
                  type="button"
                  onClick={() => setRecruitingOnly((prev) => !prev)}
                  aria-pressed={recruitingOnly}
                  whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
                  transition={{ duration: 0.12, ease: [0.22, 1, 0.36, 1] }}
                  className={cn(
                    "flex-shrink-0 rounded-full px-3 py-1 text-xs font-medium",
                    // 색상 전환: 0.18s — 눈에 띄되 지연 없이
                    "transition-colors duration-[180ms]",
                    recruitingOnly
                      ? "bg-foreground text-background"
                      : "border-border bg-background text-foreground border"
                  )}
                >
                  募集中
                </m.button>

                {/* 카테고리 칩 — 저장된 항목에 존재하는 카테고리만, CATEGORY_ORDER 순
                    각 칩에 stagger 진입 딜레이: 0번째=0ms, 1번째=30ms, 2번째=60ms …
                    (칩이 순서대로 하나씩 나타나는 효과, 상한 120ms) */}
                {availableCategories.map((cat, chipIdx) => (
                  <m.button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory((prev) => (prev === cat ? null : cat))}
                    aria-pressed={selectedCategory === cat}
                    initial={shouldReduceMotion ? { opacity: 1, x: 0 } : { opacity: 0, x: 6 }}
                    animate={{ opacity: 1, x: 0 }}
                    whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
                    transition={{
                      duration: 0.22,
                      ease: [0.22, 1, 0.36, 1],
                      // 첫 번째 칩(募集中)이 0.04s 먼저 나오고, 카테고리 칩은 순서대로
                      delay: shouldReduceMotion ? 0 : Math.min(chipIdx, 4) * 0.03 + 0.04,
                    }}
                    className={cn(
                      "flex-shrink-0 rounded-full px-3 py-1 text-xs font-medium",
                      "transition-colors duration-[180ms]",
                      selectedCategory === cat
                        ? "bg-foreground text-background"
                        : "border-border bg-background text-foreground border"
                    )}
                  >
                    {CATEGORY_LABELS[cat]}
                  </m.button>
                ))}
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </LazyMotion>

      {/* ── 로딩: 스켈레톤 그리드 (2열) ── */}
      {showSkeleton && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              {/* 카드 커버 이미지 자리 (4:3 비율) */}
              <Skeleton className="aspect-[4/3] w-full rounded-xl" />
              {/* 카테고리 배지 자리 */}
              <Skeleton className="h-4 w-16 rounded" />
              {/* 서클명 자리 */}
              <Skeleton className="h-4 w-3/4 rounded" />
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
            {/* 컬러풀 3D 하트 — 홈 카테고리 타일과 같은 원형 소프트 배경.
                reduced motion 이 아니면 천천히 위아래로 떠다녀 빈 화면에 생기를 준다.
                우상단 sparkles 로 「알록달록」 한 홈 톤을 살짝 더함. */}
            <m.div
              className="bg-muted relative flex size-24 items-center justify-center rounded-full"
              animate={shouldReduceMotion ? undefined : { y: [0, -6, 0] }}
              transition={
                shouldReduceMotion
                  ? undefined
                  : { duration: 3, ease: "easeInOut", repeat: Infinity }
              }
            >
              <Emoji name="red-heart" size={52} />
              <Emoji name="sparkles" size={22} className="absolute -top-0.5 -right-0.5" />
            </m.div>
            {/* 문구 1줄로 축소 (기존 2줄 → 1줄). 액션 안내는 아래 버튼이 담당. */}
            <p className="font-semibold">お気に入りはまだありません</p>
            {/* 서클 목록 페이지로 이동 — 앱 공통 라운드 언어(rounded-full 알약형)에 맞춤 */}
            <Button asChild className="h-12 rounded-full px-8">
              <Link href="/circles">サークルを探す</Link>
            </Button>
          </m.div>
        )}
      </LazyMotion>

      {/* ── 카드 그리드 ──
           LazyMotion 범위 안에서:
           - AnimatePresence mode="popLayout": 카드 제거 시 exit 애니메이션 재생 후
             나머지 카드들이 자연스럽게 자리를 채움.
           - 각 m.div에 layout prop: 레이아웃 변경 시 카드 위치가 부드럽게 이동.
           - layoutId 없이 layout만 사용: 위치 이동이 필요한 카드가 FLIP 방식으로
             현재 위치 → 새 위치로 부드럽게 슬라이딩. */}
      <LazyMotion features={domAnimation}>
        {/* 바깥 AnimatePresence 는 기본 모드 — 항상 같은 key 인 단일 컨테이너라 popLayout 불필요.
            컨테이너에 layout 을 주면 카드 제거 시 박스 FLIP 으로 스크롤이 흔들리므로 layout 제거. */}
        <AnimatePresence>
          {showGrid && (
            <m.div
              // showGrid 변경 시 그리드 컨테이너 자체의 등장/퇴장은 불필요하므로
              // key를 고정해 컨테이너는 유지하고 내부 카드만 개별 애니메이션 처리.
              // (layout 미사용: 카드 제거 시 컨테이너는 자연 리사이즈 → 스크롤 점프 방지)
              key="circle-grid"
              className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4"
              aria-label="お気に入りサークル一覧"
            >
              {/* 필터 0건 메시지 — 저장 서클은 있지만 현재 필터 결과가 없을 때
                  AnimatePresence로 감싸 필터 결과가 0→1+ 또는 1+→0 전환 시
                  메시지가 fade+slide로 부드럽게 등장/퇴장. */}
              <AnimatePresence mode="wait">
                {showFilterEmpty ? (
                  <m.div
                    key="filter-empty"
                    className="col-span-2 flex flex-col items-center gap-3 py-12 text-center sm:col-span-3 xl:col-span-4"
                    initial={shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: -8 }}
                    transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <p className="text-muted-foreground text-sm">条件に合うサークルがありません</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full"
                      onClick={resetFilters}
                    >
                      すべて表示
                    </Button>
                  </m.div>
                ) : null}
              </AnimatePresence>

              {!showFilterEmpty && (
                <>
                  {/* 기본 모드 — 나가는 카드가 flow 안에 머문 채 페이드아웃(자기 셀 유지)되어
                      exit 중 문서 높이 급변이 없어 스크롤이 안정됨. 언마운트 후 남은 카드가
                      layout FLIP 으로 빈 자리를 채우며 제자리 재정렬. (popLayout 제거가 스크롤 점프 해결의 핵심) */}
                  <AnimatePresence>
                    {visibleCircles.map((c, i) => (
                      /**
                       * m.div: 각 카드를 모션 래퍼로 감쌈.
                       *   - key=c.id: circles 배열에서 id가 사라지면 AnimatePresence가 exit 재생.
                       *   - layout: 카드 제거/필터 변경 후 남은 카드들이 FLIP으로 위치 이동.
                       *
                       * 진입 (initial→animate):
                       *   y: 8px 아래에서 올라오며 fade-in. 카드 많아도 딜레이 상한 적용.
                       *
                       * 제거 (exit):
                       *   scale 0.92 + opacity 0으로 수축하며 사라짐. popLayout 덕에
                       *   exit 중인 카드의 공간을 남은 카드가 즉시 채우기 시작.
                       *   reduced motion 시에는 exit 적용하지 않음(즉시 제거).
                       *
                       * layout transition:
                       *   카드 재배치(필터/정렬 변경)는 조금 더 느리게(0.32s) — 위치 이동이
                       *   opacity 전환보다 시각적으로 더 무거워 충분한 시간이 필요.
                       */
                      <m.div
                        key={c.id}
                        layout
                        initial={shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={
                          shouldReduceMotion
                            ? undefined
                            : // 제자리 페이드아웃 — scale 수축 없이 opacity 만 (요청대로)
                              {
                                opacity: 0,
                                transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] },
                              }
                        }
                        transition={{
                          // 진입/opacity 애니메이션
                          duration: 0.28,
                          ease: [0.22, 1, 0.36, 1],
                          delay: shouldReduceMotion ? 0 : Math.min(i, 8) * 0.04,
                          // layout 이동(재배치)은 별도 transition 지정
                          layout: {
                            duration: shouldReduceMotion ? 0 : 0.32,
                            ease: [0.32, 0.72, 0, 1], // iOS spring 느낌의 ease
                          },
                        }}
                      >
                        {pendingDelete.has(c.id) ? (
                          /* 인라인 Undo 스트립 — 카드 자리에 표시(그리드 stretch 로 카드 높이에 맞춰짐).
                             3초 후 자동 commit 되어 바깥 m.div exit(페이드아웃)로 사라짐. */
                          <div className="border-border bg-muted/40 flex h-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-3 text-center">
                            <p className="text-muted-foreground text-xs">削除しました</p>
                            <button
                              type="button"
                              onClick={() => cancelRemove(c.id)}
                              className="text-foreground hover:bg-muted focus-visible:ring-ring border-border inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
                            >
                              <Undo2 className="size-3.5" aria-hidden="true" />
                              元に戻す
                            </button>
                          </div>
                        ) : (
                          <FavoriteGridCard circle={c} onUnsave={requestRemove} />
                        )}
                      </m.div>
                    ))}
                  </AnimatePresence>

                  {/* ＋追加 타일 — 카드 그리드 마지막 셀
                      - 마운트 시: 카드들보다 약간 늦게(delay 0.1s) 등장해 시선이 카드→타일 순으로
                      - hover: border 색이 foreground/30으로 강조 (CSS transition으로 처리)
                      - whileHover scale은 넣지 않음 — 타일이 커지면 그리드가 흔들리는 느낌 */}
                  {visibleCircles.length > 0 && (
                    <m.div
                      key="add-tile"
                      layout
                      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={
                        shouldReduceMotion
                          ? undefined
                          : { opacity: 0, transition: { duration: 0.15 } }
                      }
                      transition={{
                        duration: 0.3,
                        ease: [0.22, 1, 0.36, 1],
                        // 카드들 중 마지막 것(최대 8번째)보다 살짝 늦게
                        delay: shouldReduceMotion
                          ? 0
                          : Math.min(visibleCircles.length, 8) * 0.04 + 0.06,
                        layout: {
                          duration: shouldReduceMotion ? 0 : 0.32,
                          ease: [0.32, 0.72, 0, 1],
                        },
                      }}
                    >
                      <Link href="/circles" className="block" aria-label="サークルを追加">
                        {/*
                         * hover 시 border/텍스트 색 강조: CSS transition-colors.
                         * group/add-tile로 네이밍해 내부 아이콘에도 같은 hover 효과.
                         */}
                        <div
                          className={cn(
                            "group/add-tile",
                            "flex aspect-[4/3] flex-col items-center justify-center gap-1",
                            "border-border rounded-lg border-2 border-dashed",
                            "text-muted-foreground",
                            // 색상 전환: 200ms — 눈에 띄되 순간 반응
                            "transition-colors duration-200",
                            "hover:border-foreground/30 hover:bg-muted/30 hover:text-foreground/60"
                          )}
                        >
                          {/*
                           * 아이콘: hover 시 그룹 색상과 함께 부드럽게 전환.
                           * scale은 넣지 않음 — 절제된 톤 유지.
                           */}
                          <Plus className="size-5 transition-transform duration-200 group-hover/add-tile:scale-110" />
                          <span className="text-xs">サークルを追加</span>
                        </div>
                      </Link>
                    </m.div>
                  )}
                </>
              )}
            </m.div>
          )}
        </AnimatePresence>
      </LazyMotion>

      {/* ── 추천 섹션 — 저장 3개 이하 + 필터 미적용 시 ──
          LazyMotion 내 AnimatePresence로 showRecommend 전환 시
          fade+slide 등장/퇴장. 조건이 빠르게 바뀌는 경우를 대비해
          mode="wait"(퇴장 완료 후 등장)보다 교차 전환이 자연스러운 기본 모드 사용. */}
      <LazyMotion features={domAnimation}>
        <AnimatePresence>
          {showRecommend && (
            <m.div
              key="recommend-section"
              initial={shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="bg-muted/40 space-y-3 rounded-xl p-4"
            >
              <p className="text-sm font-semibold">他にも気になるサークルは?</p>

              {/* 셔플 탐색 버튼 — 알약형(rounded-full)으로 통일 */}
              <Button asChild variant="outline" size="sm" className="w-full rounded-full sm:w-auto">
                <Link href="/shuffle">シャッフルで探す</Link>
              </Button>

              {/* 카테고리 칩 — CATEGORIES 앞 6개, 각 카테고리 검색 페이지로 이동 */}
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.slice(0, 6).map((cat) => (
                  <Link
                    key={cat}
                    href={`/circles?category=${cat}`}
                    className={cn(
                      "border-border bg-background rounded-full border",
                      "text-foreground px-3 py-1 text-xs font-medium",
                      "hover:bg-accent transition-colors"
                    )}
                  >
                    {CATEGORY_LABELS[cat]}
                  </Link>
                ))}
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </LazyMotion>
    </div>
  );
}
