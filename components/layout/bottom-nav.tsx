"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Emoji, type EmojiName } from "@/components/ui/emoji";
import { cn } from "@/lib/utils";

interface BottomNavItem {
  href: string;
  label: string;
  emoji: EmojiName;
  /** 접근성: aria-label 용 설명 */
  aria: string;
}

/**
 * 일반 3탭 — 등록 CTA(⊕)는 별도 절대위치 floating 으로 분리됨.
 * 첫 탭의 href 는 "/" — app/page.tsx 의 redirect 로 /circles 에 도착.
 * Fluent 3D Emoji 로 컬러풀 통일.
 */
const ITEMS: BottomNavItem[] = [
  { href: "/", label: "ホーム", emoji: "house", aria: "ホーム" },
  { href: "/favorites", label: "お気に入り", emoji: "red-heart", aria: "お気に入り" },
  { href: "/mypage", label: "マイページ", emoji: "bust-in-silhouette", aria: "マイページ" },
];

// 모바일 전용 하단 고정 탭 바 — md 미만에서만 노출
// /circles/{uuid} 서클 상세 페이지에서는 T-013 의 「参加する」 액션 바가 자리를 차지하므로 자동 숨김
// 등록 CTA 는 별도 컴포넌트 RegisterFloatingCTA 로 분리되어 우하단 floating 으로 표시됨
export function BottomNav() {
  const pathname = usePathname();

  // 서클 상세 페이지(/circles/{uuid}) 에서는 hidden — /circles, /circles/new 는 제외
  const isCircleDetail = /^\/circles\/[0-9a-f-]+$/i.test(pathname) && pathname !== "/circles/new";
  if (isCircleDetail) return null;

  return (
    <nav
      aria-label="モバイルメニュー"
      className="bg-background/95 supports-[backdrop-filter]:bg-background/80 fixed right-0 bottom-0 left-0 z-30 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
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
                className={cn(
                  "focus-visible:ring-ring inline-flex h-14 w-full flex-col items-center justify-center gap-0.5 rounded-md text-[11px] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                  // 컬러풀 이모지는 그대로 두고, 라벨 색만 active/inactive 분기 (이전 lucide currentColor 패턴과 동일한 시각적 무게)
                  isActive ? "text-foreground font-semibold" : "text-muted-foreground"
                )}
              >
                <Emoji name={item.emoji} size={22} />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
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
