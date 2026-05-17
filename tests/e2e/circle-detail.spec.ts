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

test("요약 카드 라벨이 모두 노출된다", async ({ page }) => {
  await page.goto("/circles/00000000-0000-4000-8000-000000000001");

  // 「年会費」「新入生比率」 는 2026-05 정책으로 제거됨
  const labels = ["募集状況", "活動頻度", "活動日", "活動時間", "会員数"];
  for (const label of labels) {
    await expect(page.getByText(label).first()).toBeVisible();
  }
});

// DetailPageHeader (메루카리 패턴) — 뒤로가기 / 홈 / 공유 3 버튼 가시성
test("상세 페이지 헤더에 戻る・ホーム・共有 3 버튼이 노출된다", async ({ page }) => {
  await page.goto("/circles/00000000-0000-4000-8000-000000000001");
  await page.waitForLoadState("networkidle");

  await expect(page.getByRole("button", { name: "戻る" })).toBeVisible();
  await expect(page.getByRole("link", { name: "ホームに移動" })).toBeVisible();
  await expect(page.getByRole("button", { name: "共有" })).toBeVisible();
});

// 진입 슬라이드 인 entry 회귀 가드 — m.div 가 translateX(100%) stuck 상태로 멈추지 않는지 확인.
// desktop 만 reducedMotion 이 꺼져 있어 실제 motion lifecycle 검증 가능.
test("desktop: 진입 후 cover 가 viewport 안으로 슬라이드 인된다", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "애니메이션은 desktop 프로젝트에서만 검증");
  await page.goto("/circles/00000000-0000-4000-8000-000000000001");
  // spring transition (~600ms) 종료 충분히 대기
  await page.waitForTimeout(800);
  const cover = page.locator("main article img").first();
  const box = await cover.boundingBox();
  // translateX(100%) stuck 시 cover 의 x 가 viewport width 이상 (>1000)
  // 정상 entry 후에는 0 근방 (container padding 정도)
  expect(box?.x ?? 9999).toBeLessThan(100);
});

// 글로벌 헤더 hide — client-side navigation (Link 클릭) 경로에서도 RSC 가 pathname 을 읽도록
// middleware 가 x-pathname 을 request headers 로 forward 하는지 회귀 가드.
test("Link 클릭으로 상세 진입 시 글로벌 헤더가 숨겨진다", async ({ page }) => {
  await page.goto("/circles");
  await page.waitForLoadState("networkidle");

  // /circles 단계에서는 글로벌 헤더 (KCircle) 가 보여야 함
  await expect(page.locator("header").filter({ hasText: "KCircle" })).toBeVisible();

  // UUID 카드를 Link 클릭 — soft navigation
  await page.locator('a[href^="/circles/00000000-"]').first().click();
  await page.waitForURL(/\/circles\/[0-9a-f-]+$/);
  await page.waitForLoadState("networkidle");

  // 상세 페이지에서는 글로벌 헤더 (KCircle) 가 없어야 함
  await expect(page.locator("header").filter({ hasText: "KCircle" })).toHaveCount(0);
});

// 같은 카드 재진입 회귀 가드 — Next.js Link 의 same-URL no-op 우회 패턴 (CircleCardLink + CustomEvent).
// CircleCardLink 가 same-URL click 감지 시 CustomEvent 발화 → template 의 animKey 토글
// → m.div re-mount → motion entry 재발화. URL 변화 없음, RSC fetch 없음.
test("desktop: 같은 카드 재진입 시 slide-in entry 가 발화하고 URL 이 깨끗하다", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "motion lifecycle 은 desktop 에서만 검증");

  await page.goto("/circles");
  await page.waitForLoadState("networkidle");

  const firstCard = page.locator('a[href^="/circles/00000000-"]').first();
  const firstHref = await firstCard.getAttribute("href");
  await firstCard.click();
  await page.waitForURL(/\/circles\/[0-9a-f-]+$/);
  await page.waitForTimeout(800);

  // 戻る → /circles (dev overlay race 회피로 evaluate)
  await page.evaluate(() => {
    document.querySelector<HTMLButtonElement>('button[aria-label="戻る"]')?.click();
  });
  await page.waitForURL(/\/circles$/);
  await page.waitForTimeout(600);

  // 같은 카드 재클릭 — same-URL click. CustomEvent 가 m.div re-mount 트리거
  await page.locator(`a[href="${firstHref}"]`).first().click();
  // navigation 자체는 없지만 m.div re-mount + entry transition 대기
  await page.waitForTimeout(800);

  // cover 가 viewport 안에 정상 노출 (slide-in 완료)
  const cover = page.locator("main article img").first();
  const box = await cover.boundingBox();
  expect(box?.x ?? 9999).toBeLessThan(100);

  // URL 이 timestamp/hash 없이 깨끗해야 함 (CustomEvent 패턴은 URL 안 건드림)
  expect(page.url()).toMatch(/\/circles\/[0-9a-f-]+$/);
});

// 戻る 후 다른 카드로 재진입 회귀 가드 — slide-out 후 다음 entry animation 정상 동작.
// desktop 만 reducedMotion 이 꺼져 있어 motion lifecycle 검증 가능.
// (Next.js Link 의 same-URL click 은 no-op 동작이라 다른 URL 시나리오로 검증.)
test("desktop: 戻る 후 다른 카드 진입 시 slide-in 정상 동작한다", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "motion lifecycle 은 desktop 에서만 검증");

  await page.goto("/circles");
  await page.waitForLoadState("networkidle");

  // 첫 번째 카드 진입
  const firstCard = page.locator('a[href^="/circles/00000000-"]').first();
  const firstHref = await firstCard.getAttribute("href");
  await firstCard.click();
  await page.waitForURL(/\/circles\/[0-9a-f-]+$/);
  await page.waitForTimeout(800);

  // 戻る 클릭 → /circles 복귀 (dev overlay race 회피 위해 evaluate 사용)
  await page.evaluate(() => {
    const btn = document.querySelector<HTMLButtonElement>('button[aria-label="戻る"]');
    btn?.click();
  });
  await page.waitForURL(/\/circles$/);
  await page.waitForTimeout(600);

  // 메인 페이지에 stale m.div 가 visible 한 상태로 잔존하면 안 됨
  const visibleStaleCount = await page.locator(".will-change-transform:visible").count();
  expect(visibleStaleCount).toBe(0);

  // 다른 카드 진입 — 첫 카드와 다른 href 의 카드 선택
  const anotherCard = page
    .locator(`a[href^="/circles/00000000-"]:not([href="${firstHref}"])`)
    .first();
  await anotherCard.click();
  await page.waitForURL(/\/circles\/[0-9a-f-]+$/);
  await page.waitForTimeout(800);

  // cover 가 viewport 안에 정상 노출 (slide-in 완료)
  const cover = page.locator("main article img").first();
  const box = await cover.boundingBox();
  expect(box?.x ?? 9999).toBeLessThan(100);
});

test("존재하지 않는 id 는 not-found UI 가 노출된다", async ({ page }) => {
  await page.goto("/circles/00000000-0000-4000-8000-999999999999");

  await expect(page.getByRole("heading", { name: "サークルが見つかりません" })).toBeVisible();
  await expect(page.getByRole("link", { name: "サークル一覧に戻る" })).toBeVisible();
});

// T-014 채널 모달 동작 검증 — mobile+desktop 양쪽 projects 에서 자동 실행

test("「参加する」 클릭 시 채널 모달이 열린다", async ({ page }) => {
  await page.goto("/circles/00000000-0000-4000-8000-000000000001");
  // template.tsx 의 슬라이드 인 애니메이션이 mid-animation race 를 만들지 않도록 networkidle 대기
  await page.waitForLoadState("networkidle");
  // .first() 로 mobile/desktop 중 viewport 에 visible 한 버튼 선택
  // force: true — Framer Motion 슬라이드 인 후 SummaryGrid 가 mobile 액션 바와 stacking context 충돌 회피
  const joinButton = page.getByRole("button", { name: "参加する" }).first();
  await joinButton.click({ force: true });
  await expect(page.getByRole("heading", { name: "参加方法を選んでください" })).toBeVisible();
});

test("등록된 채널만 모달에 노출된다", async ({ page }) => {
  // テニス部(id=1): contact_instagram + contact_x (contact_line = null)
  await page.goto("/circles/00000000-0000-4000-8000-000000000001");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "参加する" }).first().click({ force: true });
  const dialog = page.getByRole("dialog");
  // Instagram + X 링크는 존재해야 함
  await expect(dialog.getByRole("link", { name: /Instagram/ })).toBeVisible();
  await expect(dialog.getByRole("link", { name: /X .Twitter./ })).toBeVisible();
  // LINE 은 null 이므로 노출되지 않아야 함
  await expect(dialog.getByRole("link", { name: /LINE/ })).toHaveCount(0);
});

test("채널 link 가 새 탭 + noopener rel 속성을 가진다", async ({ page }) => {
  await page.goto("/circles/00000000-0000-4000-8000-000000000001");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "参加する" }).first().click({ force: true });
  // Instagram 링크의 접근성·보안 속성 확인
  const igLink = page.getByRole("link", { name: /Instagram/ });
  await expect(igLink).toHaveAttribute("target", "_blank");
  await expect(igLink).toHaveAttribute("rel", /noopener/);
  await expect(igLink).toHaveAttribute("rel", /noreferrer/);
});
