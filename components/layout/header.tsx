import Link from "next/link";
import { headers } from "next/headers";
import { Bell, Search } from "lucide-react";

import { KCircleLogo } from "@/components/layout/kcircle-logo";

/**
 * KCircle 글로벌 헤더 (RSC) — 당근앱/메루카리 모바일 우선 슬림 패턴.
 *
 * 레이아웃: 좌측 로고 | (spacer) | お知らせ (Bell) + 検索 (Search) 2 아이콘.
 * - 로그인/회원가입 진입은 マイページ 로 이양 (BottomNav 에서 접근).
 * - 다크모드 토글은 제거 — 시스템 설정 자동 추종은 ThemeProvider 가 담당.
 * - 데스크탑 가로 nav (MainNav) 도 제거하여 모바일/데스크탑 동일 헤더.
 *
 * Hide 대상 경로:
 * - 서클 상세 페이지 (/circles/{uuid}) — 메루카리 풀-블리드 cover 패턴
 * - 활동 리포트 상세 페이지 (/circles/{uuid}/reports/{uuid}) — 콘텐츠 중심 페이지, floating 뒤로가기 사용
 * - 검색 페이지 (/search) — 당근앱 패턴, SearchPageHeader 가 글로벌 헤더 역할 인계
 *
 * pathname 은 middleware(proxy.ts) 가 설정한 x-pathname request header 에서 읽음.
 * client-side soft navigation 대응은 HeaderClientGate (`app/layout.tsx`) 가 안전망 처리.
 */
export async function Header() {
  // server-side pathname 분기 — 특정 페이지에서 글로벌 헤더 hide (SSR-safe, 깜빡임 없음)
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";
  const isCircleDetail = /^\/circles\/[0-9a-f-]+$/i.test(pathname) && pathname !== "/circles/new";
  // 활동 리포트 상세 — /circles/{uuid}/reports/{uuid} 패턴. 콘텐츠 중심 페이지라 글로벌 헤더 미노출
  // reportId 는 더미 데이터에서 `{uuid}-report-{n}` 형태 → [\w-]+ 로 영문 포함 매칭
  const isCircleReportDetail = /^\/circles\/[0-9a-f-]+\/reports\/[\w-]+$/i.test(pathname);
  const isSearch = pathname === "/search";
  // /shuffle — Tinder 스타일 swipe deck 풀스크린 패턴, 글로벌 헤더 미노출
  const isShuffle = pathname === "/shuffle";
  // /auth/* — 풀스크린 인증 플로우. AuthScreen이 fixed inset-0으로 헤더를 덮으므로 미노출
  const isAuth = pathname.startsWith("/auth");
  if (isCircleDetail || isCircleReportDetail || isSearch || isShuffle || isAuth) return null;

  // 우측 아이콘 공통 클래스 — 40×40 hit target + focus ring + hover 반응
  const iconButton =
    "hover:bg-muted focus-visible:ring-ring inline-flex size-10 items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:outline-none";

  return (
    // 배경 불투명(opacity 1) — 기존 반투명 + backdrop-blur 제거. 경계선 없음.
    <header className="bg-background sticky top-0 z-40">
      {/* 슬림 헤더: h-14(56px). 좌측 로고 + 우측 아이콘. */}
      <div className="container mx-auto flex h-14 max-w-6xl items-center px-4">
        <Link
          href="/"
          aria-label="KCircle ホーム"
          className="focus-visible:ring-ring rounded-md focus-visible:ring-2 focus-visible:outline-none"
        >
          <KCircleLogo size="md" />
        </Link>

        <div className="ml-auto flex items-center gap-1">
          <Link href="/notifications" aria-label="お知らせ" className={iconButton}>
            <Bell className="size-5" aria-hidden="true" />
          </Link>
          <Link href="/search" aria-label="検索" className={iconButton}>
            <Search className="size-5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </header>
  );
}
