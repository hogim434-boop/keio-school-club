import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Noto_Sans_JP } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Header } from "@/components/layout/header";
import { RegisterFloatingCTA } from "@/components/layout/register-floating-cta";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "KCircle — 慶應公認サークル検索",
  description: "慶應義塾大学の公認サークルを探す・比較する",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // PRD 기준 본 서비스는 일본 학생 대상이므로 lang 을 ja 로 설정
    <html lang="ja" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${notoJp.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {/* 모든 페이지 공통 헤더 — sticky top-0, T-002 에서 도입.
              Header 가 cookies() 의존(role 추출)이므로 cacheComponents 모드에서
              Suspense 필수. fallback 은 동일 높이의 빈 헤더로 layout shift 방지. */}
          <Suspense fallback={<header className="bg-background h-14 border-b" />}>
            <Header />
          </Suspense>
          {/* 모바일 하단 탭 바가 본문을 가리지 않도록 모바일에서만 pb-16 추가
              (BottomNav 의 fixed 영역 ≈ 64px). 데스크탑은 BottomNav 미노출이라 패딩 불필요. */}
          <div className="pb-16 md:pb-0">{children}</div>
          {/* 모바일 전용 하단 탭 바 (md 미만, 당근앱 패턴) — 서클 상세에서는 자동 숨김.
              usePathname() 사용 Client 컴포넌트라 cacheComponents 모드에서 Suspense 필수. */}
          <Suspense fallback={null}>
            <BottomNav />
          </Suspense>
          {/* 우하단 floating 등록 CTA (당근앱 「+ 모임 만들기」 패턴) — 서클 상세·등록 페이지에서 자동 숨김.
              usePathname() 사용 Client 컴포넌트라 cacheComponents 모드에서 Suspense 필수. */}
          <Suspense fallback={null}>
            <RegisterFloatingCTA />
          </Suspense>
          {/* 토스트 알림 Provider — ThemeProvider 내부에 두어 다크 모드 색상 자동 적용 */}
          <Toaster richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
