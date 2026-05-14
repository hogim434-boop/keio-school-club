import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // 1) ESLint 검사 제외 경로
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "dist/**",
      "coverage/**",
      "next-env.d.ts",
      "*.tsbuildinfo",
    ],
  },

  // 2) Next.js + TypeScript 기본 규칙
  ...compat.extends("next/core-web-vitals", "next/typescript"),

  // 3) Prettier와 충돌하는 스타일 규칙 비활성화 (반드시 맨 마지막)
  ...compat.extends("prettier"),
];

export default eslintConfig;
