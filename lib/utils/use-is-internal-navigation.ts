"use client";

import { useEffect, useLayoutEffect, useState } from "react";

// SSR-safe useLayoutEffect — 서버에선 useEffect 로 fallback (warning 회피),
// 클라이언트에선 paint 전 동기 실행 → motion 이 첫 mount 시 transition 을 즉시 인지하게 함.
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * 현재 페이지 마운트가 「내부 SPA navigation」 인지 「외부 진입·새로고침」 인지 판정.
 *
 * 반환값:
 * - `null` — 아직 결정 안 됨 (SSR + client 첫 렌더, hydration mismatch 회피)
 * - `true` — 내부 navigation (Link 클릭, router.push 등)
 * - `false` — 외부 진입·새로고침·직접 진입
 *
 * 판정 우선순위:
 * 1. **PerformanceNavigationTiming.type === "reload"** → 항상 false.
 *    document.referrer 만 보면 새로고침 시에도 이전 referrer 가 보존되어 internal 로 잘못 잡힘.
 * 2. `document.referrer` 의 origin 이 같은 origin → true
 * 3. 그 외 (빈 referrer, 다른 origin) → false
 *
 * useLayoutEffect 를 쓰는 이유 — useEffect 는 첫 paint 후 실행되어 motion 이
 * transition 변화를 batch 로 무시할 수 있음. useLayoutEffect 는 paint 전 동기 실행이라
 * 첫 mount 시점에 isInternal 결정이 완료된 상태로 motion 이 transition 적용.
 */
export function useIsInternalNavigation(): boolean | null {
  const [isInternal, setIsInternal] = useState<boolean | null>(null);

  useIsoLayoutEffect(() => {
    if (typeof window === "undefined") return;

    // 1) 새로고침은 항상 external 톤 — referrer 가 보존되어도 reload 가 우선
    try {
      const navEntries = performance.getEntriesByType(
        "navigation"
      ) as PerformanceNavigationTiming[];
      if (navEntries[0]?.type === "reload") {
        setIsInternal(false);
        return;
      }
    } catch {
      // performance API 미지원 환경 — referrer 로 fallback
    }

    // 2) referrer 평가
    const ref = document.referrer;
    if (!ref) {
      setIsInternal(false);
      return;
    }
    try {
      setIsInternal(new URL(ref).origin === window.location.origin);
    } catch {
      setIsInternal(false);
    }
  }, []);

  return isInternal;
}
