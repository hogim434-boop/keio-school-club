"use client";

/**
 * useFavorites — localStorage 기반 게스트 즐겨찾기 hook
 *
 * 방향 A(디렉터리형): 탐색·즐겨찾기는 로그인 불필요. 누구나 브라우저
 * localStorage 에 즐겨찾기를 저장한다. (계정 동기화는 추후 로그인 도입 시 추가)
 *
 * 동작:
 * - SSR 안전: 서버 렌더 시 false, 마운트 후 localStorage 에서 hydrate.
 * - 같은 탭의 여러 하트(목록 카드 등) 는 custom event 로, 다른 탭은 storage event 로 동기화.
 * - 로그인 리다이렉트 없음 (이전 Supabase Server Action 방식 폐기).
 */

import { useCallback, useEffect, useState } from "react";

/** localStorage 키 — 즐겨찾기 circle id 배열을 JSON 으로 저장 */
const STORAGE_KEY = "kc:favorites";
/** 같은 탭 내 hook 인스턴스 동기화용 custom event 이름 */
const SYNC_EVENT = "kc-favorites-changed";

/** localStorage 에서 즐겨찾기 id 집합을 읽음 (실패 시 빈 집합) */
function readIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

/** 즐겨찾기 id 집합을 저장하고 동기화 이벤트를 발행 */
function writeIds(ids: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // quota 초과 등은 조용히 무시 (즐겨찾기는 보조 기능)
  }
  // 같은 탭 내 다른 hook 인스턴스가 즉시 반영하도록 알림
  window.dispatchEvent(new CustomEvent(SYNC_EVENT));
}

/** 즐겨찾기 추가 (hook 없이 호출 — 셔플 우측 스와이프 등에서 사용) */
export function addFavoriteLocal(circleId: string): void {
  const ids = readIds();
  ids.add(circleId);
  writeIds(ids);
}

/** 현재 즐겨찾기 여부 */
export function isFavoriteLocal(circleId: string): boolean {
  return readIds().has(circleId);
}

/** 저장된 즐겨찾기 id 배열 (즐겨찾기 페이지 등에서 사용 예정) */
export function getFavoriteIds(): string[] {
  return [...readIds()];
}

// ─── hook 반환 타입 ───────────────────────────────────────────────────────────
export interface UseFavoritesReturn {
  /** 현재 즐겨찾기 상태 */
  isFavorited: boolean;
  /** 즐겨찾기 토글 (로그인 불필요) */
  toggle: () => void;
  /** 진행 중 여부 — localStorage 는 동기 처리라 항상 false (호출부 호환용) */
  isPending: boolean;
}

/**
 * 단일 서클의 즐겨찾기 상태를 제공하는 Client hook.
 *
 * @param circleId 대상 서클 UUID
 */
export function useFavorites(circleId: string): UseFavoritesReturn {
  const [isFavorited, setIsFavorited] = useState(false);

  // 마운트 후 localStorage 에서 초기 상태 hydrate + 변경 이벤트 구독
  useEffect(() => {
    const sync = () => setIsFavorited(isFavoriteLocal(circleId));
    sync();
    window.addEventListener(SYNC_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(SYNC_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [circleId]);

  const toggle = useCallback(() => {
    const ids = readIds();
    if (ids.has(circleId)) ids.delete(circleId);
    else ids.add(circleId);
    writeIds(ids);
    setIsFavorited(ids.has(circleId));
  }, [circleId]);

  return { isFavorited, toggle, isPending: false };
}
