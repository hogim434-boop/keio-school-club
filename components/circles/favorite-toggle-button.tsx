"use client";

/**
 * FavoriteToggleButton — 즐겨찾기 토글 버튼 컴포넌트
 *
 * Phase 1.2 T-009: sessionStorage 제거 → Supabase Server Action 기반으로 교체.
 * useFavorites hook에 circleId / initialFavorited / isAuthenticated 전달.
 *
 * variant='card' 는 카드 우상단 오버레이용, variant='action-bar' 는 하단 고정 액션 바 / 데스크탑 inline 용.
 * variant='action-bar-card' 는 하단 sticky 바 이미지 패턴용 정사각 카드 버튼 (56×56px, keio-navy 하트).
 * onClick 에서 e.preventDefault + stopPropagation 으로 카드 Link navigation 을 차단한다.
 */

import { Heart } from "lucide-react";

import { useFavorites } from "@/lib/circles/use-favorites";
import { cn } from "@/lib/utils";

interface FavoriteToggleButtonProps {
  /** 즐겨찾기 대상 서클 ID */
  circleId: string;
  /**
   * 버튼 스타일 변형
   * - 'card': 카드 우상단 오버레이 (h-9 w-9, bg-background/80, backdrop-blur)
   * - 'action-bar': 하단 액션 바 / 데스크탑 inline (h-12 w-12, border, bg-background)
   * - 'action-bar-card': 하단 sticky 바 이미지 패턴 (56×56px 정사각, rounded-xl, keio-navy 하트)
   */
  variant: "card" | "action-bar" | "action-bar-card";
  /**
   * RSC 에서 내려주는 초기 즐겨찾기 상태.
   * 카드 목록에서는 false 로 시작 (DB 쿼리 비용 절감), 상세 페이지에서는 isFavorited()로 조회.
   */
  initialFavorited?: boolean;
  /**
   * RSC 에서 내려주는 인증 상태 (선택적).
   * - 제공된 경우: 그 값을 즉시 사용.
   * - 미제공(카드 목록 등): hook 내부에서 Supabase client로 lazy 조회.
   * false 면 토글 시 로그인 페이지로 리다이렉트.
   */
  isAuthenticated?: boolean;
}

/**
 * 즐겨찾기 하트 버튼 — useFavorites hook 을 사용하여 상태를 읽고 토글한다.
 * 카드 전체가 Link 로 감싸진 경우에도 클릭이 페이지 이동으로 이어지지 않도록
 * e.preventDefault() + e.stopPropagation() 을 호출한다.
 */
export function FavoriteToggleButton({
  circleId,
  variant,
  initialFavorited = false,
  isAuthenticated,
}: FavoriteToggleButtonProps) {
  // isAuthenticated가 undefined이면 hook 내부에서 lazy 조회 (카드 목록 등)
  const {
    isFavorited: active,
    toggle,
    isPending,
  } = useFavorites(circleId, initialFavorited, isAuthenticated);

  return (
    <button
      type="button"
      onClick={(e) => {
        // 카드 Link 클릭 이벤트가 버블링되지 않도록 차단
        e.preventDefault();
        e.stopPropagation();
        toggle();
      }}
      aria-pressed={active}
      aria-label={active ? "お気に入りから削除" : "お気に入りに追加"}
      disabled={isPending}
      className={cn(
        // 공통 스타일
        "inline-flex items-center justify-center rounded-full transition-colors",
        "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
        "disabled:pointer-events-none disabled:opacity-70",
        // variant 별 스타일 분기
        variant === "card" &&
          "bg-background/80 text-muted-foreground hover:text-foreground h-9 w-9 backdrop-blur",
        variant === "action-bar" && "bg-background hover:bg-accent h-12 w-12 border",
        // 신규: 이미지 패턴 정사각 카드 (56×56px, rounded-xl)
        variant === "action-bar-card" &&
          "border-border bg-background hover:bg-accent size-14 rounded-xl border transition-transform active:scale-95 motion-reduce:transform-none"
      )}
    >
      {/* 하트 아이콘 — variant에 따라 크기·색상 분기 */}
      <Heart
        className={cn(
          "size-5",
          // action-bar-card 는 아이콘을 size-6 으로 약간 크게 표시
          variant === "action-bar-card" && "size-6",
          // active 상태 색상: action-bar-card → keio-navy, 나머지 → red-500
          active && variant === "action-bar-card" && "text-keio-navy fill-current",
          active && variant !== "action-bar-card" && "fill-current text-red-500"
        )}
        aria-hidden="true"
      />
    </button>
  );
}
