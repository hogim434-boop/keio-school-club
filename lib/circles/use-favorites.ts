"use client";

/**
 * useFavorites — sessionStorage 기반 즐겨찾기 hook
 * 같은 페이지에 여러 인스턴스가 마운트될 때 CustomEvent 로 동기화한다.
 * 인증 상태는 모듈 singleton authPromise 로 1회만 확인한다.
 */

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { hasEnvVars } from "@/lib/utils";

// sessionStorage 키와 브로드캐스트 이벤트명
const STORAGE_KEY = "kcircle:favorites";
const FAVORITES_EVENT = "kcircle:favorites-changed";

// 모듈 레벨 singleton — 페이지 수명 동안 1회만 auth 조회
let authPromise: Promise<boolean | null> | null = null;

/**
 * 인증 상태를 1회 조회하는 singleton Promise 반환
 * hasEnvVars 가 false 이면 null 을 즉시 resolve (환경 변수 미설정 환경)
 */
function getAuthPromise(): Promise<boolean | null> {
  if (!authPromise) {
    authPromise = !hasEnvVars
      ? Promise.resolve(null)
      : createClient()
          .auth.getClaims()
          .then(({ data }) => Boolean(data?.claims))
          .catch(() => null);
  }
  return authPromise;
}

/** sessionStorage 에서 즐겨찾기 목록을 읽어 Set 으로 반환 */
function readStorage(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed as string[]);
  } catch {
    return new Set();
  }
}

/** Set 을 JSON 배열로 직렬화하여 sessionStorage 에 저장 */
function writeStorage(ids: Set<string>): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

/** 같은 페이지의 다른 hook 인스턴스에게 변경을 알린다 */
function broadcast(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(FAVORITES_EVENT));
}

// ─── hook 반환 타입 ───────────────────────────────────────────────────────────
export interface UseFavoritesReturn {
  favoriteIds: Set<string>;
  isFavorite: (id: string) => boolean;
  toggle: (id: string) => void;
  isAuthenticated: boolean | null;
}

/**
 * 즐겨찾기 상태를 제공하는 Client hook.
 * - sessionStorage 에 영속화
 * - CustomEvent 로 같은 페이지 내 다중 인스턴스 동기화
 * - 미인증(isAuthenticated===false) 시 로그인 페이지로 리다이렉트
 */
export function useFavorites(): UseFavoritesReturn {
  const router = useRouter();
  const pathname = usePathname();

  // 초기값은 빈 Set — SSR 과 CSR 불일치 방지를 위해 useEffect 에서 복원
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => new Set());
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // mount 시 sessionStorage 에서 복원
  useEffect(() => {
    setFavoriteIds(readStorage());
  }, []);

  // mount 시 인증 상태 1회 조회
  useEffect(() => {
    getAuthPromise().then(setIsAuthenticated);
  }, []);

  // 다른 인스턴스의 broadcast 를 수신하여 동기화
  useEffect(() => {
    const handler = () => setFavoriteIds(readStorage());
    window.addEventListener(FAVORITES_EVENT, handler);
    return () => window.removeEventListener(FAVORITES_EVENT, handler);
  }, []);

  /** 특정 서클이 즐겨찾기에 포함되어 있는지 확인 */
  const isFavorite = useCallback((id: string) => favoriteIds.has(id), [favoriteIds]);

  /** 즐겨찾기 토글 — 미인증 시 로그인 페이지로 이동 */
  const toggle = useCallback(
    (id: string) => {
      // 명시적으로 미인증 상태일 때만 리다이렉트
      if (isAuthenticated === false) {
        router.push(`/auth/login?next=${pathname}`);
        return;
      }
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        writeStorage(next);
        broadcast();
        return next;
      });
    },
    [isAuthenticated, router, pathname]
  );

  return { favoriteIds, isFavorite, toggle, isAuthenticated };
}
