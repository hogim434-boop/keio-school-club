"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Home, User } from "lucide-react";
import { LazyMotion, domAnimation, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";

import { cn } from "@/lib/utils";

interface BottomNavItem {
  href: string;
  label: string;
  Icon: typeof Home;
  /** 접근성: aria-label 용 설명 */
  aria: string;
}

/**
 * 일반 3탭 — 등록 CTA(⊕)는 별도 절대위치 floating 으로 분리됨.
 * 첫 탭의 href 는 "/" — app/page.tsx 의 redirect 로 /circles 에 도착.
 *
 * 아이콘 톤: lucide 단색 미니멀.
 * 항상 노출되는 글로벌 nav 라 차분한 톤이 더 모던하다는 판단 — 카테고리 그리드·셔플 카드의
 * 컬러풀 Fluent 이모지와 대비되어 시각적 위계 명확.
 */
const ITEMS: BottomNavItem[] = [
  { href: "/", label: "ホーム", Icon: Home, aria: "ホーム" },
  { href: "/favorites", label: "お気に入り", Icon: Heart, aria: "お気に入り" },
  { href: "/mypage", label: "マイページ", Icon: User, aria: "マイページ" },
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
  if (isCircleDetail || isShuffle || isAuth) return null;

  return (
    <nav
      aria-label="モバイルメニュー"
      className="bg-background/95 supports-[backdrop-filter]:bg-background/80 fixed right-0 bottom-0 left-0 z-30 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
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
            const Icon = item.Icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-label={`${item.aria}に移動`}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "focus-visible:ring-ring inline-flex h-14 w-full flex-col items-center justify-center gap-0.5 rounded-md text-[11px] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                    // 활성: 慶應 네이비 + 굵은 라벨 / 비활성: 뮤트 컬러
                    isActive ? "text-keio-navy font-semibold" : "text-muted-foreground"
                  )}
                >
                  {/*
                   * m.span: LazyMotion 내부에서 사용 가능한 경량 motion 컴포넌트.
                   * animate.scale:
                   *   - 활성이고 reducedMotion이 false 일 때만 1.12 (팝 효과)
                   *   - 비활성이거나 reducedMotion true 이면 1 (크기 변화 없음)
                   * transition: spring 물리 기반 — 탄력적이고 자연스러운 팝 감각.
                   *   stiffness 400 + damping 17 → 빠른 팽창 후 살짝 바운스
                   */}
                  <m.span
                    animate={{ scale: isActive && !reducedMotion ? 1.12 : 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    className="inline-flex"
                  >
                    <Icon
                      className={cn(
                        "size-5",
                        // 활성 탭만 아이콘 내부를 currentColor 로 채움 (lucide SVG fill 속성)
                        isActive && "fill-current"
                      )}
                      aria-hidden="true"
                    />
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
 * - 그 외는 정확 매칭 또는 prefix 매칭 (예: /mypage/circles 도 /mypage 탭 active)
 */
function isItemActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/circles";
  return pathname === href || pathname.startsWith(href + "/");
}
