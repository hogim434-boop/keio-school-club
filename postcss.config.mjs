// Tailwind v4 전용 PostCSS 설정
// v3의 `tailwindcss` + `autoprefixer` 조합은 v4에서 `@tailwindcss/postcss` 한 개로 통합됨
// (autoprefixer 기능이 내부에 포함되어 별도 설치/설정이 더 이상 필요 없음)
/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
