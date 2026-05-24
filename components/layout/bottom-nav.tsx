"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@iconify/react";
import { LazyMotion, domAnimation, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";

import { cn } from "@/lib/utils";

interface BottomNavItem {
  href: string;
  label: string;
  /** Iconify 아이콘 이름 (Phosphor 채움 — 둥글고 자연스러운 톤) */
  icon: string;
  /** 접근성: aria-label 용 설명 */
  aria: string;
}

/**
 * 일반 3탭 — 등록 CTA(⊕)는 별도 절대위치 floating 으로 분리됨.
 * 첫 탭의 href 는 "/" — app/page.tsx 의 redirect 로 /circles 에 도착.
 *
 * 아이콘 톤: Phosphor 채움(ph:*-fill) — 둥글고 친근한 "당근앱" 풍 자연스러운 아이콘.
 * 활성/비활성은 채움 색(활성=慶應 네이비 / 비활성=뮤트)으로 구분.
 */
const ITEMS: BottomNavItem[] = [
  { href: "/", label: "ホーム", icon: "ph:house-fill", aria: "ホーム" },
  { href: "/favorites", label: "お気に入り", icon: "ph:heart-fill", aria: "お気に入り" },
  { href: "/mypage", label: "マイページ", icon: "ph:user-fill", aria: "マイページ" },
];

// 모바일 전용 하단 고정 탭 바 — md 미만에서만 노출
// /circles/{uuid} 서클 상세 페이지에서는 T-013 의 「参加する」 액션 바가 자리를 차지하므로 자동 숨김
// 등록 CTA 는 별도 컴포넌트 RegisterFloatingCTA 로 분리되어 우하단 floating 으로 표시됨
export function BottomNav() {
  const pathname = usePathname();
  // prefers-reduced-motion 감지 — true 이면 scale 애니메이션 없이 색/채움만 적용
  // React Hooks 규칙: 조기 return 이전에 모든 Hook 을 먼저 호출해야 함
  const reducedMotion = useReducedMotion();

  // 서클 상세 페이지(/circles/{uuid}) 에서는 hidden — /circles, /circles/new 는 제외
  const isCircleDetail = /^\/circles\/[0-9a-f-]+$/i.test(pathname) && pathname !== "/circles/new";
  // /shuffle — swipe deck 풀스크린, 하단 좌우 버튼 위해 BottomNav 미노출
  const isShuffle = pathname === "/shuffle";
  // /auth/* — 풀스크린 인증 플로우. AuthScreen footer에 CTA가 있으므로 BottomNav 미노출
  const isAuth = pathname.startsWith("/auth");
  // /circles/new(등록) · /circles/{id}/edit(수정) — 풀스크린 폼(AuthScreen). BottomNav 미노출
  const isRegister = pathname === "/circles/new" || /^\/circles\/[^/]+\/edit$/.test(pathname);
  if (isCircleDetail || isShuffle || isAuth || isRegister) return null;

  return (
    <nav
      aria-label="モバイルメニュー"
      // 배경 불투명(opacity 1) — 반투명 + backdrop-blur 제거
      className="bg-background fixed right-0 bottom-0 left-0 z-30 border-t pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {/*
       * LazyMotion: domAnimation 피처만 로드해 번들 크기를 최소화.
       * step-progress.tsx 와 동일한 프로젝트 표준 패턴.
       */}
      <LazyMotion features={domAnimation}>
        {/* 일반 3탭 — grid-cols-3 균등 분포 */}
        <ul className="mx-auto grid max-w-md grid-cols-3 items-stretch px-2">
          {ITEMS.map((item) => {
            const isActive = isItemActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-label={`${item.aria}に移動`}
                  aria-current={isActive ? "page" : undefined}
                  // 코치마크 엔진이 「お気に入り」 탭을 찾아 말풍선을 표시함
                  // href="/favorites" 인 탭에만 속성 부여, 나머지는 undefined(DOM에 미출력)
                  data-coachmark={item.href === "/favorites" ? "favorites" : undefined}
                  className={cn(
                    // h-14(56px) — 아이콘 + 라벨에 여유 있는 세로 공간(답답함 해소).
                    "focus-visible:ring-ring inline-flex h-14 w-full flex-col items-center justify-center gap-0.5 rounded-md text-[11px] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                    // 활성: 慶應 네이비 + 굵은 라벨 / 비활성: 뮤트 컬러 (채움 아이콘은 색을 currentColor 로 상속)
                    isActive ? "text-keio-navy font-semibold" : "text-muted-foreground"
                  )}
                >
                  {/*
                   * m.span: 활성 탭 아이콘에 spring scale 팝(1.12) 효과.
                   * reducedMotion 이면 scale 1 고정.
                   */}
                  <m.span
                    animate={{ scale: isActive && !reducedMotion ? 1.12 : 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    className="inline-flex"
                  >
                    {/* Phosphor 채움 아이콘 — currentColor 로 채워져 부모 텍스트 색을 상속 */}
                    <Icon icon={item.icon} className="size-6" aria-hidden="true" />
                  </m.span>
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </LazyMotion>
    </nav>
  );
}

/**
 * 현재 경로가 탭의 href 와 매칭되는지 판단.
 * - "/" 는 redirect 로 /circles 도착 → /circles 에서 「ホーム」 탭 active
 * - 그 외는 정확 매칭 또는 prefix 매칭 (예: /mypage 하위 경로도 /mypage 탭 active)
 */
function isItemActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/circles";
  return pathname === href || pathname.startsWith(href + "/");
}
