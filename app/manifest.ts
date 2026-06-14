import type { MetadataRoute } from "next";

/**
 * PWA Web App Manifest — Next.js App Router 의 route convention.
 * `/manifest.webmanifest` 경로로 자동 제공됨.
 *
 * 목적: 홈 화면에 추가 시 주소창 없는 standalone 앱처럼 실행.
 * 대상: iOS Safari (홈 화면에 추가) / Android Chrome (설치 배너)
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    // 설치 시 표시되는 앱 이름 (홈 화면 아이콘 아래 라벨)
    name: "K CLUB",
    // 공간이 좁을 때(iOS 홈 화면) 사용하는 짧은 이름
    short_name: "K CLUB",
    description: "慶應義塾大学のサークル・部活動を探す",
    // 일본어 앱 — html[lang] 과 맞춤
    lang: "ja",
    dir: "ltr",
    // 앱 실행 시 진입 URL
    start_url: "/",
    // standalone: 주소창·브라우저 UI 없이 네이티브 앱 형태로 실행
    display: "standalone",
    // 세로 전용 — 가로 모드에서도 세로 고정
    orientation: "portrait",
    // 스플래시 배경색 — 라이트 톤 전용 앱
    background_color: "#ffffff",
    // 상태바/툴바 색 — 慶應 네이비 (#25305a ≈ oklch(0.32 0.092 256))
    theme_color: "#25305a",
    // ── 아이콘 목록 ────────────────────────────────────────────────────────────
    // /icon → app/icon.tsx (ImageResponse 동적 생성 512×512)
    // /apple-icon → app/apple-icon.tsx (ImageResponse 동적 생성 180×180)
    // maskable: 안드로이드 원형/스쿼클 마스크 대응 — 아이콘 중앙 80% safe zone 이 K 를 담음
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
