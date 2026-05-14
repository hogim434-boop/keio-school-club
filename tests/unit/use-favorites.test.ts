/**
 * use-favorites hook 단위 테스트
 * jsdom 환경에서 sessionStorage 동작 / toggle / 다중 인스턴스 동기화를 검증한다.
 * Supabase auth 및 next/navigation 은 vi.mock 으로 stub 처리.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFavorites } from "@/lib/circles/use-favorites";

// ── next/navigation stub ─────────────────────────────────────────────────────
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/test",
}));

// ── Supabase client stub ─────────────────────────────────────────────────────
// 테스트는 인증 무관 storage 동작만 검증하므로 getClaims 는 null 반환
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getClaims: async () => ({ data: null, error: null }),
    },
  }),
}));

// ── 환경 변수 stub — hasEnvVars false 로 고정 ────────────────────────────────
vi.mock("@/lib/utils", () => ({
  hasEnvVars: false,
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

// ── 모듈 singleton authPromise 를 각 테스트마다 리셋 ─────────────────────────
// use-favorites 모듈을 재평가해서 singleton 을 초기화한다.
beforeEach(async () => {
  window.sessionStorage.clear();
  // 모듈 캐시를 리셋하여 authPromise singleton 초기화
  vi.resetModules();
});

describe("useFavorites", () => {
  /**
   * 테스트 1: 초기 마운트 시 favoriteIds 는 빈 Set 이어야 한다.
   */
  it("초기 마운트 시 favoriteIds 는 빈 Set 이다", async () => {
    const { result } = renderHook(() => useFavorites());

    // 초기 동기 상태는 빈 Set
    expect(result.current.favoriteIds.size).toBe(0);
  });

  /**
   * 테스트 2: toggle('id-1') 후 isFavorite('id-1') === true 가 된다.
   */
  it("toggle 후 isFavorite 이 true 를 반환한다", async () => {
    const { result } = renderHook(() => useFavorites());

    await act(async () => {
      result.current.toggle("id-1");
    });

    expect(result.current.isFavorite("id-1")).toBe(true);
  });

  /**
   * 테스트 3: toggle 후 sessionStorage 에 값이 영속화된다.
   */
  it("toggle 후 sessionStorage 에 저장된다", async () => {
    const { result } = renderHook(() => useFavorites());

    await act(async () => {
      result.current.toggle("id-1");
    });

    const stored = window.sessionStorage.getItem("kcircle:favorites");
    expect(stored).not.toBeNull();
    const parsed: string[] = JSON.parse(stored!);
    expect(parsed).toContain("id-1");
  });

  /**
   * 테스트 4: CustomEvent broadcast 후 다른 hook 인스턴스도 동기화된다.
   */
  it("CustomEvent broadcast 후 다른 인스턴스도 동기화된다", async () => {
    // 두 번째 인스턴스를 먼저 마운트
    const { result: result2 } = renderHook(() => useFavorites());

    // 첫 번째 인스턴스에서 toggle
    const { result: result1 } = renderHook(() => useFavorites());

    await act(async () => {
      result1.current.toggle("id-sync");
    });

    // CustomEvent 발행 후 result2 도 업데이트되어 있어야 한다
    expect(result2.current.isFavorite("id-sync")).toBe(true);
  });

  /**
   * 테스트 5: sessionStorage 에 미리 값이 있으면 mount 시 복원된다.
   */
  it("재 마운트 시 sessionStorage 에서 즐겨찾기를 복원한다", async () => {
    // sessionStorage 에 미리 값 설정
    window.sessionStorage.setItem("kcircle:favorites", JSON.stringify(["id-restore"]));

    const { result } = renderHook(() => useFavorites());

    // useEffect 가 실행될 때까지 기다린다
    await act(async () => {
      // 동기화 대기
    });

    expect(result.current.isFavorite("id-restore")).toBe(true);
  });

  /**
   * 테스트 6: toggle 두 번 호출 시 즐겨찾기에서 제거된다 (토글 해제).
   */
  it("같은 id 를 두 번 toggle 하면 즐겨찾기에서 제거된다", async () => {
    const { result } = renderHook(() => useFavorites());

    await act(async () => {
      result.current.toggle("id-double");
    });

    expect(result.current.isFavorite("id-double")).toBe(true);

    await act(async () => {
      result.current.toggle("id-double");
    });

    expect(result.current.isFavorite("id-double")).toBe(false);
  });
});
