import { expect, test } from "@playwright/test";

// 서클 상세 페이지 E2E — Playwright projects mobile+desktop 양쪽 회귀

test("홈에서 카드 클릭 시 상세 페이지 진입 + h1 서클명 노출", async ({ page }) => {
  await page.goto("/");

  // 첫 인기 카드 (UUID 패턴)
  const firstCard = page.locator('a[href^="/circles/00000000-"]').first();
  const href = await firstCard.getAttribute("href");
  expect(href).toBeTruthy();

  await firstCard.click();
  await expect(page).toHaveURL(href!);

  // h1 서클명 visible
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("요약 카드 5종 라벨이 모두 노출된다", async ({ page }) => {
  await page.goto("/circles/00000000-0000-4000-8000-000000000001");

  const labels = ["活動頻度", "年会費", "活動曜日", "会員数", "新入生比率"];
  for (const label of labels) {
    await expect(page.getByText(label).first()).toBeVisible();
  }
});

test("존재하지 않는 id 는 not-found UI 가 노출된다", async ({ page }) => {
  await page.goto("/circles/00000000-0000-4000-8000-999999999999");

  await expect(page.getByRole("heading", { name: "サークルが見つかりません" })).toBeVisible();
  await expect(page.getByRole("link", { name: "サークル一覧に戻る" })).toBeVisible();
});
