import type { Metadata } from "next";
import { Geist, Noto_Sans_JP } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
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
          {children}
          {/* 토스트 알림 Provider — ThemeProvider 내부에 두어 다크 모드 색상 자동 적용 */}
          <Toaster richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
