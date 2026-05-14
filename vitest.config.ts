import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Vitest 설정 — 단위 테스트(tests/unit/) 전용
// jsdom 환경으로 DOM API 가 필요한 컴포넌트 테스트도 향후 가능하게 준비
// vite-tsconfig-paths 가 tsconfig.json 의 paths(@/*) 를 자동 인식하여
// 테스트 코드에서 `import { CATEGORIES } from "@/lib/constants/category"` 형태 import 가능
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["tests/unit/**/*.test.ts", "tests/unit/**/*.test.tsx"],
    // Playwright e2e 디렉토리는 Vitest 가 절대 실행하지 않도록 분리
    exclude: ["node_modules", "tests/e2e/**", ".next", "dist"],
  },
});
