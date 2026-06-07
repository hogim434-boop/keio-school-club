import Link from "next/link";

import { KCircleLogo } from "@/components/layout/kcircle-logo";
import { MessagesLink } from "@/components/layout/messages-link";
import { NotificationBell } from "@/components/layout/notification-bell";
import { HeaderSearchLink } from "@/components/layout/header-search-link";
import { MESSAGING_ENABLED } from "@/lib/constants/features";

/**
 * KCircle 글로벌 헤더 (RSC) — 당근앱/메루카리 모바일 우선 슬림 패턴.
 *
 * 레이아웃: 좌측 로고 | (spacer) | お知らせ (Bell) + 検索 (Search) 2 아이콘.
 * - 로그인/회원가입 진입은 マイページ 로 이양 (BottomNav 에서 접근).
 * - 다크모드 토글은 제거 — 시스템 설정 자동 추종은 ThemeProvider 가 담당.
 * - 데스크탑 가로 nav (MainNav) 도 제거하여 모바일/데스크탑 동일 헤더.
 *
 * 숨김 판단은 HeaderClientGate 가 단독 담당.
 * Header 는 항상 헤더 내용(로고 + 아이콘)을 렌더링하며 null 을 반환하지 않는다.
 * → App Router 루트 레이아웃에서 RSC 는 최초 하드 로드 시 한 번만 실행되어 결과가 고정되므로,
 *   숨김 경로에서 직접 진입 → 홈 soft nav 시 null 로 굳는 버그를 방지.
 */
export function Header() {
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
          {/* メッセージアイコン: MESSAGING_ENABLED false 시 숨김 */}
          {MESSAGING_ENABLED && <MessagesLink />}
          {/* Bell 아이콘은 뱃지 로직이 필요해 Client Component로 분리 */}
          <NotificationBell />
          {/* 검색 아이콘은 현재 필터 유지가 필요해 Client Component로 분리 */}
          <HeaderSearchLink />
        </div>
      </div>
    </header>
  );
}
