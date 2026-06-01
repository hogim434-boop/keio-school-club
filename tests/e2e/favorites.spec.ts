import { expect, test } from "@playwright/test";

/**
 * favorites E2E 테스트
 * Playwright projects (mobile=Pixel 5 393px / desktop=1280px) 양쪽에서 자동 실행
 *
 * 설계 배경:
 * - 환경 변수(NEXT_PUBLIC_SUPABASE_URL)가 설정된 상태에서 미인증 사용자가 하트를 클릭하면
 *   isAuthenticated === false 로 판정되어 /auth/login?next=... 로 리다이렉트된다.
 *   이것이 useFavorites 의 정상 동작이므로 E2E 는 이 흐름을 검증한다.
 * - 서클 상세 페이지의 「運営に問い合わせる」 버튼 가시성은 인증과 무관하게 검증 가능하다.
 *   (T-010 에서 「参加する」→「運営に問い合わせる」 로 변경)
 */

// 테스트 1: 하트 버튼이 렌더링되고 클릭 이벤트를 처리한다
// / 는 /circles 로 redirect 됨 — /circles 추천 모드에서 하트 버튼 검증
// 인증 상태에 따라: isAuthenticated===false → 로그인 리다이렉트 / null → sessionStorage 토글
test("홈 페이지 하트 버튼이 렌더링되고 클릭 가능하다", async ({ page }) => {
  await page.goto("/circles");

  // 하트 버튼이 렌더링될 때까지 대기
  const heart = page.locator('button[aria-label="お気に入りに追加"]').first();
  await expect(heart).toBeVisible();
  await expect(heart).toHaveAttribute("aria-pressed", "false");

  // authPromise(supabase.auth.getClaims) 가 resolve 되어 isAuthenticated 가 확정될 때까지 대기
  // isAuthenticated 가 null → false 또는 null → true 로 바뀌는 시점을 포착하기 위해
  // 네트워크가 유휴 상태가 될 때까지 충분히 기다림
  await page.waitForLoadState("networkidle");

  // 하트 클릭 후 URL 변경 또는 aria 변경을 관찰
  await heart.click();

  // 두 가지 결과 중 하나를 검증:
  // (a) 로그인 페이지로 리다이렉트 (isAuthenticated === false)
  // (b) aria-pressed='true' 로 토글 (isAuthenticated === null)
  // networkidle 이후 클릭하므로 authPromise 가 이미 resolve 된 상태.
  // redirect 가 발생하면 waitForURL 이 포착, 아니면 aria 변화를 확인
  const redirected = await page
    .waitForURL(/\/auth\/login/, { timeout: 5000 })
    .then(() => true)
    .catch(() => false);

  if (redirected) {
    // (a) 리다이렉트 케이스
    expect(page.url()).toContain("/auth/login");
  } else {
    // (b) sessionStorage 토글 케이스 — aria-pressed 가 true 로 변경됨을 확인
    await expect(heart).toHaveAttribute("aria-pressed", "true", {
      timeout: 3000,
    });
  }
});

// 테스트 2: 하트 버튼 클릭 시 로그인 리다이렉트 또는 토글 중 하나가 동작한다
// / 는 /circles 로 redirect 됨 — /circles 추천 모드에서 동작 검증
// (인증 상태에 따라: isAuthenticated===false → 리다이렉트 / null → sessionStorage 토글)
test("하트 버튼 클릭 시 즐겨찾기 관련 동작이 발생한다", async ({ page }) => {
  await page.goto("/circles");

  const heart = page.locator('button[aria-label="お気に入りに追加"]').first();
  await expect(heart).toBeVisible();

  // authPromise(supabase.auth.getClaims) 가 resolve 되어 isAuthenticated 가 확정될 때까지 대기
  // 네트워크가 유휴 상태가 될 때까지 기다려 authPromise resolve 완료를 보장
  await page.waitForLoadState("networkidle");

  await heart.click();

  // 두 가지 결과 중 하나를 검증:
  // (a) 로그인 페이지로 리다이렉트 됨 (isAuthenticated === false)
  // (b) 하트 버튼이 토글되어 aria-pressed='true' 가 됨 (isAuthenticated === null)
  // networkidle 이후 클릭하므로 authPromise 가 이미 resolve 된 상태
  const redirected = await page
    .waitForURL(/\/auth\/login/, { timeout: 5000 })
    .then(() => true)
    .catch(() => false);

  if (redirected) {
    // (a) 리다이렉트 케이스: URL 에 /auth/login 이 포함됨
    expect(page.url()).toContain("/auth/login");
  } else {
    // (b) 토글 케이스: aria-pressed 가 true 로 변경됨
    await expect(heart).toHaveAttribute("aria-pressed", "true", {
      timeout: 3000,
    });
  }
});

// 테스트 3: 서클 상세 페이지에 「運営に問い合わせる」 버튼이 노출된다 (mobile+desktop)
// T-010: 「参加する」→「運営に問い合わせる」 CTA 변경 반영
test("서클 상세 페이지에 運営に問い合わせる 버튼이 노출된다", async ({ page }) => {
  // 더미 데이터 첫 번째 서클 UUID (lib/dummy/circles.ts 고정값)
  await page.goto("/circles/00000000-0000-4000-8000-000000000001");
  await page.waitForLoadState("networkidle");

  // CircleActions portal — document.body 에 마운트되는 fixed bottom CTA
  // 「運営に問い合わせる」 버튼이 mobile/desktop 모두 동일한 portal 로 표시됨
  const ctaBtn = page.getByRole("button", { name: "運営に問い合わせる" });
  await expect(ctaBtn).toBeVisible();
});

// 테스트 4: 서클 상세 페이지에 즐겨찾기 하트 버튼이 노출된다
test("서클 상세 페이지에 즐겨찾기 하트 버튼이 노출된다", async ({ page, isMobile }) => {
  await page.goto("/circles/00000000-0000-4000-8000-000000000001");

  if (isMobile) {
    // 모바일: fixed bottom 액션 바의 하트 버튼 (variant='action-bar')
    const mobileBar = page.locator('div.fixed.bottom-0[class*="md:hidden"]');
    await expect(mobileBar).toBeVisible();
    const heartBtn = mobileBar.getByRole("button", { name: /お気に入り/ });
    await expect(heartBtn).toBeVisible();
  } else {
    // 데스크탑: 헤더 inline 영역의 하트 버튼
    const desktopActions = page.locator('div[class*="hidden"][class*="md:flex"]');
    const heartBtn = desktopActions.getByRole("button", { name: /お気に入り/ }).first();
    await expect(heartBtn).toBeVisible();
  }
});
