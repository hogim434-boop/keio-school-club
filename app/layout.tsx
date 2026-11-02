import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Noto_Sans_JP, Kavoon } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { Header } from "@/components/layout/header";
import { HeaderClientGate } from "@/components/layout/header-client-gate";
import { RegisterFloatingCTA } from "@/components/layout/register-floating-cta";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

/**
 * 사이트 기준 URL — OG 이미지 등 절대 URL 생성에 사용.
 * 우선순위: 직접 지정(NEXT_PUBLIC_SITE_URL) → Vercel 운영 도메인(VERCEL_PROJECT_PRODUCTION_URL)
 *          → 배포 단위 URL(VERCEL_URL, 프리뷰용) → 로컬.
 * VERCEL_URL 만 쓰면 해시가 붙은 *.vercel.app 주소가 공유 카드에 들어가므로 운영 도메인을 우선한다.
 */
const siteHost = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
const defaultUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? (siteHost ? `https://${siteHost}` : "http://localhost:3000");

const SITE_DESCRIPTION = "慶應のサークル・部活動を、ジャンルや活動頻度から探せる。";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  // template: 하위 페이지가 title 을 지정하면 「동아리명｜K CLUB」 형태로 자동 조합된다.
  title: {
    default: "K CLUB｜慶應のサークル・部活動探し",
    template: "%s｜K CLUB",
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    title: "K CLUB｜慶應のサークル・部活動探し",
    description: SITE_DESCRIPTION,
    siteName: "K CLUB",
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "K CLUB｜慶應のサークル・部活動探し",
    description: SITE_DESCRIPTION,
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
        {/* Vercel Web Analytics — 방문자·페이지뷰·유입 경로 수집(개인정보 비수집·쿠키리스).
            Vercel 대시보드에서 Web Analytics 토글 ON 시 데이터가 쌓인다. */}
        <Analytics />
      </body>
    </html>
  );
}
