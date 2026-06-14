import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Geist, Noto_Sans_JP, Kavoon } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { Header } from "@/components/layout/header";
import { HeaderClientGate } from "@/components/layout/header-client-gate";
import { RegisterFloatingCTA } from "@/components/layout/register-floating-cta";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

/**
 * viewport — Next.js 13.4+ 에서 metadata 와 분리된 별도 export.
 * (viewport 를 metadata 에 포함하면 빌드 경고 발생)
 *
 * viewportFit: "cover" — iOS Safari/standalone 에서 화면 전체(노치 포함)를 덮음.
 *   → env(safe-area-inset-*) CSS 변수가 실제 inset 값을 반환하게 됨.
 *   → globals.css + bottom-tabs / register-floating-cta 의 safe-area 패딩이 활성화.
 *
 * themeColor — 브라우저 상단 UI(주소창, 상태바 배경) 를 慶應 네이비로 착색.
 */
export const viewport: Viewport = {
  themeColor: "#25305a",
  width: "device-width",
  initialScale: 1,
  // cover: 콘텐츠가 노치/Dynamic Island 뒤까지 확장됨.
  // globals.css header padding-top 으로 safe zone 확보.
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  // template 패턴: 개별 페이지는 "%s | K CLUB" 형태, 루트는 "K CLUB" 그대로
  title: {
    default: "K CLUB",
    template: "%s | K CLUB",
  },
  description: "慶應義塾大学のサークル・部活動を探す",
  // ── iOS PWA 홈 화면 설정 ────────────────────────────────────────────────────
  appleWebApp: {
    // capable: true → apple-mobile-web-app-capable 메타 삽입 (홈 화면 추가 시 standalone 실행 허가)
    capable: true,
    // default: 라이트 상태바 (흰색 배경/검정 텍스트). 네이비 헤더 앱에 어울림.
    // "black-translucent" 는 status bar 가 반투명해져 콘텐츠가 뒤에 깔리므로 사용하지 않음.
    statusBarStyle: "default",
    title: "K CLUB",
  },
  // ── OGP (SNS 공유 미리보기) ─────────────────────────────────────────────────
  openGraph: {
    siteName: "K CLUB",
    title: "K CLUB",
    description: "慶應義塾大学のサークル・部活動を探す",
  },
};

// 본문용 기본 라틴 폰트 — 영어/숫자/일반 기호 처리
const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

// 일본어 보조 폰트 — Geist 가 처리하지 못하는 「サークル」「公認」 등 한자/가나 글리프를 담당
// next/font/google 이 unicode-range 기반으로 dynamic subsetting 을 자동 처리하므로
// 시스템 폴백(Hiragino, Yu Gothic 등) 보다 일관된 렌더링을 보장
const notoJp = Noto_Sans_JP({
  variable: "--font-noto-jp",
  display: "swap",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

// 로고 전용 폰트 — Kavoon (KCircleLogo "K CLUB" 워드마크에만 사용)
// 둥글고 굵은 개성 강한 디스플레이 서체 (단일 weight 400)
const logoFont = Kavoon({
  variable: "--font-logo",
  display: "swap",
  subsets: ["latin"],
  weight: ["400"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // PRD 기준 본 서비스는 일본 학생 대상이므로 lang 을 ja 로 설정.
    // 다크모드는 제거됨 — 라이트 톤 전용 (next-themes / ThemeProvider 미사용).
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${notoJp.variable} ${logoFont.variable} overflow-x-hidden font-sans antialiased`}
      >
        {/* 모든 페이지 공통 헤더 — sticky top-0.
            Header(RSC) 는 항상 헤더 내용을 렌더링하며 null 을 반환하지 않는다.
            숨김 판단은 HeaderClientGate(Client) 가 usePathname 으로 단독 처리.
            → SSR 직접 진입과 client soft navigation 양방향 모두 정확히 동작.
            Header 는 동적 데이터(cookies 등)를 사용하지 않으므로 내부 Suspense 불필요. */}
        <Suspense fallback={null}>
          <HeaderClientGate>
            <Header />
          </HeaderClientGate>
        </Suspense>
        {/* children — (tabs) route group 에서는 TabsLayout 이 BottomTabs 를 렌더링.
            (tabs) 바깥 경로(/circles/[id], /auth/* 등)는 탭 없이 풀스크린으로 동작. */}
        {children}
        {/* 우하단 floating 등록 CTA (당근앱 「+ 모임 만들기」 패턴) — 서클 상세·등록 페이지에서 자동 숨김.
            usePathname() 사용 Client 컴포넌트라 cacheComponents 모드에서 Suspense 필수. */}
        <Suspense fallback={null}>
          <RegisterFloatingCTA />
        </Suspense>
        {/* 토스트 알림 — 하단 다크 알약 스타일(components/ui/sonner.tsx 에서 설정).
            richColors/closeButton 제거: 다크 통일 + 자동 fade-out. */}
        <Toaster />
      </body>
    </html>
  );
}
