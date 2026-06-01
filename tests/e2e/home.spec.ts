import { expect, test } from "@playwright/test";

// KCircle 루트 경로 E2E
// / 는 /circles 로 redirect 되므로 redirect 동작만 검증
// playwright.config.ts 의 projects(mobile=Pixel 5 393px / desktop=1280px) 양쪽에서 자동 실행

test("/ 접근 시 /circles 로 redirect 된다", async ({ page }) => {
  await page.goto("/");
  // redirect 후 URL 이 /circles 인지 확인
  await expect(page).toHaveURL(/\/circles$/);
});

// 하단 탭 바 — 모바일 viewport(<768px) 에서만 노출 (md:hidden 토글)
// BottomNav 는 일반 3탭 (ホーム / お気に入り / マイページ) = link 3개. 등록 CTA 는 별도 floating 으로 분리됨.
test("bottom navigation visibility per viewport (모바일 퍼스트)", async ({ page }) => {
  await page.goto("/circles");
  const bottomNav = page.getByRole("navigation", { name: "モバイルメニュー" });
  const isMobile = (page.viewportSize()?.width ?? 0) < 768;
  if (isMobile) {
    await expect(bottomNav).toBeVisible();
    // 일반 3탭 link 만 — floating ⊕ 는 nav 외부로 분리됨
    await expect(bottomNav.getByRole("link")).toHaveCount(3);
    // 첫 탭 라벨이 「ホーム」 로 노출되는지 검증
    await expect(bottomNav.getByText("ホーム")).toBeVisible();
  } else {
    await expect(bottomNav).toBeHidden();
  }
});

// 우하단 floating 등록 CTA — 모바일에서만 visible (당근앱 「+ 모임 만들기」 패턴)
test("register floating CTA visibility per viewport", async ({ page }) => {
  await page.goto("/circles");
  const registerCta = page.getByRole("link", { name: "サークルを登録に移動" });
  const isMobile = (page.viewportSize()?.width ?? 0) < 768;
  if (isMobile) {
    await expect(registerCta).toBeVisible();
    // 알약 안의 텍스트 라벨 「サークルを登録」 가시성
    await expect(registerCta.getByText("サークルを登録")).toBeVisible();
  } else {
    await expect(registerCta).toBeHidden();
  }
});

// 서클 상세 페이지에서는 CircleActions 「運営に問い合わせる」 액션 바가 자리를 차지하므로 BottomNav 와 floating CTA 모두 자동 숨김
test("bottom navigation and floating CTA hide on circle detail page", async ({ page }) => {
  const isMobile = (page.viewportSize()?.width ?? 768) < 768;
  if (!isMobile) {
    return; // 데스크탑은 항상 hidden 이라 본 테스트 의미 없음
  }
  await page.goto("/circles/00000000-0000-4000-8000-000000000001");
  const bottomNav = page.getByRole("navigation", { name: "モバイルメニュー" });
  const registerCta = page.getByRole("link", { name: "サークルを登録に移動" });
  await expect(bottomNav).toBeHidden();
  await expect(registerCta).toBeHidden();
});
