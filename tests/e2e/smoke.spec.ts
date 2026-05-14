import { expect, test } from "@playwright/test";

// 스모크 E2E — 홈 페이지가 200 응답이고 헤더에 「KCircle」 로고가 노출되는지 검증
// playwright.config.ts 의 projects(mobile/desktop) 으로 양쪽 viewport 자동 회귀
test("home page renders with KCircle header", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);

  // 헤더의 KCircle 로고 (Link) — 햄버거 버튼은 <button> 이라 role 분리됨
  const logo = page.getByRole("link", { name: "KCircle" });
  await expect(logo).toBeVisible();
});
