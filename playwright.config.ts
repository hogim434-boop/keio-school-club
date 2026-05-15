import { defineConfig, devices } from "@playwright/test";

// Playwright E2E 설정
// - testDir: tests/e2e/ — Vitest 의 tests/unit/ 과 명확히 분리
// - projects: ROADMAP 「🟦 모바일 퍼스트」 원칙에 맞춰 Mobile Chrome(Pixel 5, 393px) +
//   Desktop Chrome(1280px) 2종을 기본 회귀 가드로 구성. 모든 spec 이 양쪽에서 자동 실행
// - webServer: npm run dev 자동 기동, reuseExistingServer 로 기존 서버 충돌 회피
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "mobile",
      // 모바일에서는 채널 모달 click 이 슬라이드 인 (motion/react) mid-animation race
      // 를 만들지 않도록 reducedMotion 강제 활성화. template.tsx 의 matchMedia 가
      // 이를 감지해 m.div 자체를 안 렌더 → 즉시 노출.
      use: {
        ...devices["Pixel 5"],
        contextOptions: { reducedMotion: "reduce" },
      },
    },
    {
      // desktop 은 실제 슬라이드 인 애니메이션 동작을 검증 — entry stuck 회귀 가드용
      name: "desktop",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
