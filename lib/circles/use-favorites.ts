"use client";

/**
 * useFavorites — Supabase Server Action 기반 즐겨찾기 hook
 *
 * Phase 1.2 T-009 와이어업: sessionStorage 완전 제거.
 * useOptimistic + startTransition 으로 낙관적 UI 업데이트 구현.
 *
 * 동작 정책:
 * - 초기 즐겨찾기 상태(initialFavorited)는 RSC에서 isFavorited()로 조회하여 prop으로 전달.
 *   카드 목록처럼 prop을 내려주기 어려운 경우에는 false (비즐겨찾기 상태)로 시작.
 * - toggle 호출 시 즉시 낙관적 업데이트 → Server Action 실행 → 에러 시 롤백.
 * - 비로그인 시 /auth/login?next=${encodeURIComponent(pathname)} 로 리다이렉트.
 * - isAuthenticated가 undefined면 Supabase client에서 1회 lazy 조회.
 */

import { startTransition, useCallback, useEffect, useOptimistic, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toggleFavorite as toggleFavoriteAction } from "@/app/circles/[id]/actions";
import { createClient } from "@/lib/supabase/client";
import { hasEnvVars } from "@/lib/utils";

// ─── hook 반환 타입 ───────────────────────────────────────────────────────────
export interface UseFavoritesReturn {
  /** 현재 즐겨찾기 상태 (낙관적 포함) */
  isFavorited: boolean;
  /** 즐겨찾기 토글 — 비로그인 시 리다이렉트 */
  toggle: () => void;
  /** 토글 진행 중 여부 (중복 클릭 방지용) */
  isPending: boolean;
}

/**
 * 인증 상태를 1회 조회하는 모듈 singleton Promise.
 * 카드 목록처럼 다수의 FavoriteToggleButton이 동시 마운트될 때
 * auth 조회를 반복하지 않도록 공유 캐시.
 */
let cachedAuthPromise: Promise<boolean> | null = null;

function getAuthStatus(): Promise<boolean> {
  if (!cachedAuthPromise) {
    if (!hasEnvVars) {
      // 환경 변수 미설정 환경 — false로 처리
      cachedAuthPromise = Promise.resolve(false);
    } else {
      cachedAuthPromise = createClient()
        .auth.getClaims()
        .then(({ data }) => Boolean(data?.claims))
        .catch(() => false);
    }
  }
  return cachedAuthPromise;
}

/**
 * 단일 서클에 대한 즐겨찾기 상태를 제공하는 Client hook.
 *
 * @param circleId 대상 서클 UUID
 * @param initialFavorited 초기 즐겨찾기 상태 (RSC에서 조회한 값 또는 false)
 * @param isAuthenticatedProp RSC에서 확인한 인증 상태 (undefined이면 client에서 lazy 조회)
 */
export function useFavorites(
  circleId: string,
  initialFavorited: boolean = false,
  isAuthenticatedProp?: boolean
): UseFavoritesReturn {
  const router = useRouter();
  const pathname = usePathname();

  // 서버 실행 중 여부 추적 (중복 클릭 방지)
  const [isPending, setIsPending] = useState(false);

  // 인증 상태 — prop이 있으면 그대로, 없으면 lazy 조회 (null: 조회 전)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(
    isAuthenticatedProp !== undefined ? isAuthenticatedProp : null
  );

  // isAuthenticatedProp이 undefined인 경우 mount 시 lazy 조회
  useEffect(() => {
    if (isAuthenticatedProp === undefined) {
      getAuthStatus().then(setIsAuthenticated);
    }
  }, [isAuthenticatedProp]);

  // useOptimistic: 낙관적 상태 — 실제 상태와 별도로 즉각 반영
  const [optimisticFavorited, setOptimisticFavorited] = useOptimistic(initialFavorited);

  /** 즐겨찾기 토글 — 비로그인 시 로그인 페이지로 이동 */
  const toggle = useCallback(() => {
    // 인증 상태 조회 전(null)이거나 명시적 미인증(false)이면 리다이렉트
    if (isAuthenticated === false) {
      router.push(`/auth/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    // 인증 상태 조회 중(null)이면 대기
    if (isAuthenticated === null) return;

    // 중복 클릭 방지
    if (isPending) return;

    startTransition(async () => {
      setIsPending(true);
      // 낙관적 업데이트: 토글 즉시 반영
      setOptimisticFavorited((prev) => !prev);

      try {
        const result = await toggleFavoriteAction(circleId);
        if (result.error === "unauthenticated") {
          // 서버측에서 비인증 판정 — 롤백 후 리다이렉트
          setOptimisticFavorited((prev) => !prev);
          router.push(`/auth/login?next=${encodeURIComponent(pathname)}`);
        } else if (result.error) {
          // 기타 서버 에러 — 낙관적 상태 롤백
          setOptimisticFavorited((prev) => !prev);
          console.error("[useFavorites] toggle error:", result.error);
        }
      } catch (e) {
        // 네트워크 에러 등 — 롤백
        setOptimisticFavorited((prev) => !prev);
        console.error("[useFavorites] unexpected error:", e);
      } finally {
        setIsPending(false);
      }
    });
  }, [isAuthenticated, isPending, circleId, pathname, router, setOptimisticFavorited]);

  return {
    isFavorited: optimisticFavorited,
    toggle,
    isPending,
  };
}
