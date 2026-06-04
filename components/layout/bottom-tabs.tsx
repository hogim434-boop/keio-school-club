"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LazyMotion, domAnimation, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { Icon } from "@iconify/react";

import { cn } from "@/lib/utils";

/**
 * 5탭 하단 내비게이션 바 — (tabs) route group 레이아웃에서 마운트.
 *
 * 탭 목록 (마이페이지를 항상 우측 끝에 두고 「お気に入り」 를 4번째 위치에 삽입):
 *   ホーム      → /  (redirect 로 /circles 도착)
 *   さがす      → /search
 *   カレンダー  → /calendar
 *   お気に入り  → /favorites
 *   マイページ  → /mypage
 *
 * 아이콘 톤: Phosphor 채움(ph:*-fill) — 둥글고 친근한 아이콘.
 * 활성/비활성: 채움 색(활성=慶應 네이비 / 비활성=muted-foreground)으로 구분.
 *
 * 접근성:
 *   - aria-label="モバイルメニュー"
 *   - 각 링크에 aria-current="page" (활성 탭)
 *   - prefers-reduced-motion 감지 → 애니메이션 비활성화
 */

interface TabItem {
  href: string;
  label: string;
  /** Iconify 아이콘 이름 (Phosphor fill) */
  icon: string;
  /** 접근성: aria-label 용 설명 */
  aria: string;
}

const TABS: TabItem[] = [
  { href: "/", label: "ホーム", icon: "ph:house-fill", aria: "ホーム" },
  { href: "/search", label: "さがす", icon: "ph:magnifying-glass-fill", aria: "さがす" },
  { href: "/calendar", label: "カレンダー", icon: "ph:calendar-fill", aria: "カレンダー" },
  // お気に入り 탭 — 4번째 위치. heart-fill 아이콘. /favorites 진입 시 active.
  { href: "/favorites", label: "お気に入り", icon: "ph:heart-fill", aria: "お気に入り" },
  { href: "/mypage", label: "マイページ", icon: "ph:user-fill", aria: "マイページ" },
];

/**
 * 현재 경로가 탭의 href 와 매칭되는지 판단.
 *   - "/" 는 현재 큐레이션 홈. "/circles" 는 카테고리·검색 결과 일람(홈의 「もっと見る」·
 *     카테고리 클릭 도착지)이므로 둘 다 「ホーム」 탭으로 강조한다.
 *   - 그 외는 정확 매칭 또는 하위 경로 prefix 매칭
 */
function isTabActive(pathname: string, href: string): boolean {
  // ホーム 탭: "/"(큐레이션 홈) + "/circles"(카테고리·검색 결과 일람) 둘 다 active
  if (href === "/") return pathname === "/" || pathname === "/circles";
  return pathname === href || pathname.startsWith(href + "/");
}

export function BottomTabs() {
  const pathname = usePathname();
  // prefers-reduced-motion 감지 — true 이면 scale 애니메이션 없이 색/채움만 적용.
  // React Hooks 규칙: 조기 return 이전에 모든 Hook 을 먼저 호출해야 함.
  const reducedMotion = useReducedMotion();

  return (
    <nav
      aria-label="モバイルメニュー"
      // fixed bottom-0 — 화면 하단에 고정. z-40 으로 본문 위에 표시.
      // pb-[env(safe-area-inset-bottom)] — iOS 홈 인디케이터 영역 확보.
      // md 미만(모바일)에서만 표시 — 데스크탑은 사이드바·상단 네비로 대체 예정
      className="bg-background fixed inset-x-0 bottom-0 z-40 border-t pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <LazyMotion features={domAnimation}>
        {/* 4탭 균등 분포 — flex justify-around */}
        <ul className="flex justify-around">
          {TABS.map((tab) => {
            const active = isTabActive(pathname, tab.href);
            return (
              <li key={tab.href} className="flex-1">
                <Link
                  href={tab.href}
                  aria-label={`${tab.aria}に移動`}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    // h-16(64px) — 아이콘 + 라벨에 여유 있는 세로 공간.
                    "focus-visible:ring-ring inline-flex h-16 w-full flex-col items-center justify-center gap-0.5 rounded-md text-[11px] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                    // 활성: 慶應 네이비 + 굵은 라벨 / 비활성: muted-foreground
                    active ? "text-keio-navy font-semibold" : "text-muted-foreground"
                  )}
                >
                  {/*
                   * m.span: 활성 탭 아이콘에 spring scale 팝(1.12) 효과.
                   * reducedMotion 이면 scale 1 고정.
                   */}
                  <m.span
                    animate={{ scale: active && !reducedMotion ? 1.12 : 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    className="inline-flex"
                  >
                    {/* Phosphor 채움 아이콘 — currentColor 로 부모 텍스트 색 상속 */}
                    <Icon icon={tab.icon} className="size-6" aria-hidden="true" />
                  </m.span>
                  <span>{tab.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </LazyMotion>
    </nav>
  );
}
