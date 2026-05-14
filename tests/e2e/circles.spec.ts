import { expect, test } from "@playwright/test";

// 서클 목록 페이지(/circles) E2E — Playwright projects mobile+desktop 양쪽에서 자동 회귀

// -----------------------------------------------------------------------
// 기존 테스트 (회귀 보호)
// -----------------------------------------------------------------------

test("circles 페이지가 KCircle 목록 디자인으로 노출된다", async ({ page }) => {
  const response = await page.goto("/circles");
  expect(response?.status()).toBe(200);

  // 카테고리 nav — 「すべて」 + 8 카테고리 = 9 link
  const categoryNav = page.getByRole("navigation", { name: "カテゴリ" });
  await expect(categoryNav).toBeVisible();
  await expect(categoryNav.getByRole("link")).toHaveCount(9);

  // 추천 모드에서도 카드 링크(CircleCard 내부 /circles/00000000- 패턴) 1개 이상 노출
  const circleDetailLinks = page.locator('a[href^="/circles/00000000-"]');
  await expect(circleDetailLinks.first()).toBeVisible();
});

test("카테고리 ?category=sports 진입 시 결과 5건이 노출된다", async ({ page }) => {
  await page.goto("/circles?category=sports");

  // 「すべて」 가 아닌 「スポーツ」 탭이 active (aria-current=page)
  const categoryNav = page.getByRole("navigation", { name: "カテゴリ" });
  await expect(categoryNav.getByRole("link", { name: "スポーツ" })).toHaveAttribute(
    "aria-current",
    "page"
  );

  // 카드 5건 (sports 분포)
  const circleDetailLinks = page.locator('a[href^="/circles/00000000-"]');
  await expect(circleDetailLinks).toHaveCount(5);
});

test("결과가 없을 때 EmptyState 메시지가 노출된다", async ({ page }) => {
  await page.goto("/circles?q=存在しない団体XYZ");

  await expect(page.getByText("該当するサークルがありません")).toBeVisible();
  await expect(page.getByRole("link", { name: "フィルターをリセット" })).toBeVisible();
});

// -----------------------------------------------------------------------
// 신규: 추천 모드 케이스
// -----------------------------------------------------------------------

test("추천 모드: /circles 진입 시 2개 섹션 헤딩이 노출된다", async ({ page }) => {
  await page.goto("/circles");

  // 인기 단체 헤딩
  await expect(page.getByRole("heading", { name: "人気のサークル" })).toBeVisible();
  // 신착 단체 헤딩
  await expect(page.getByRole("heading", { name: "新着のサークル" })).toBeVisible();
  // 「カテゴリから探す」 섹션은 제거됨 (카테고리 진입은 sticky 영역의 CategoryTabs 가 담당)
});

test("추천 모드: 검색 후 결과 모드로 전환된다", async ({ page }) => {
  await page.goto("/circles");

  // 검색 form 에 テニス 입력 후 Enter
  const searchInput = page.getByRole("searchbox", { name: "サークルを検索" });
  await searchInput.fill("テニス");
  await searchInput.press("Enter");

  // URL 이 /circles?q=テニス 로 변경될 때까지 대기
  await expect(page).toHaveURL(/\/circles\?.*q=/, { timeout: 10000 });

  // 결과 모드 진입 — 추천 모드 헤딩 2개가 사라져야 함 (DOM에서 완전히 제거됨)
  await expect(page.getByRole("heading", { name: "人気のサークル" })).not.toBeAttached();
  await expect(page.getByRole("heading", { name: "新着のサークル" })).not.toBeAttached();

  // 카드 또는 EmptyState 중 하나가 반드시 노출됨 (テニス 검색 → 1건 이상 기대)
  const circleLinks = page.locator('a[href^="/circles/00000000-"]');
  const emptyState = page.getByText("該当するサークルがありません");
  // 둘 중 하나가 노출될 때까지 대기
  await expect(circleLinks.first().or(emptyState)).toBeVisible({ timeout: 10000 });
});
