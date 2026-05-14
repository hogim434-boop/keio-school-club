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

// T-014 채널 모달 동작 검증 — mobile+desktop 양쪽 projects 에서 자동 실행

test("「参加する」 클릭 시 채널 모달이 열린다", async ({ page }) => {
  await page.goto("/circles/00000000-0000-4000-8000-000000000001");
  // .first() 로 mobile/desktop 중 viewport 에 visible 한 버튼 선택
  const joinButton = page.getByRole("button", { name: "参加する" }).first();
  await joinButton.click();
  await expect(page.getByRole("heading", { name: "参加方法を選んでください" })).toBeVisible();
});

test("등록된 채널만 모달에 노출된다", async ({ page }) => {
  // テニス部(id=1): contact_instagram + contact_x (contact_line = null)
  await page.goto("/circles/00000000-0000-4000-8000-000000000001");
  await page.getByRole("button", { name: "参加する" }).first().click();
  const dialog = page.getByRole("dialog");
  // Instagram + X 링크는 존재해야 함
  await expect(dialog.getByRole("link", { name: /Instagram/ })).toBeVisible();
  await expect(dialog.getByRole("link", { name: /X .Twitter./ })).toBeVisible();
  // LINE 은 null 이므로 노출되지 않아야 함
  await expect(dialog.getByRole("link", { name: /LINE/ })).toHaveCount(0);
});

test("채널 link 가 새 탭 + noopener rel 속성을 가진다", async ({ page }) => {
  await page.goto("/circles/00000000-0000-4000-8000-000000000001");
  await page.getByRole("button", { name: "参加する" }).first().click();
  // Instagram 링크의 접근성·보안 속성 확인
  const igLink = page.getByRole("link", { name: /Instagram/ });
  await expect(igLink).toHaveAttribute("target", "_blank");
  await expect(igLink).toHaveAttribute("rel", /noopener/);
  await expect(igLink).toHaveAttribute("rel", /noreferrer/);
});
