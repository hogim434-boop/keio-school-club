"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface MainNavProps {
  /** 관리자 권한 — 'admin' 일 때만 「承認管理」 메뉴 노출 */
  role?: string;
  className?: string;
}

// PRD 「메뉴 구조」 기준 데스크탑 가로 내비게이션 (md 이상에서 노출)
// usePathname 으로 현재 경로와 일치하는 메뉴에 aria-current + 강조 적용
export function MainNav({ role, className }: MainNavProps) {
  const pathname = usePathname();

  // 베이스 메뉴 (전 사용자 공통)
  const items: { href: string; label: string }[] = [
    { href: "/circles", label: "サークルを探す" },
    { href: "/favorites", label: "お気に入り" },
    { href: "/circles/new", label: "サークルを登録する" },
    { href: "/mypage", label: "マイページ" },
  ];

  // 관리자 전용 메뉴 추가 (실제 라우트 보호는 서버 측 is_admin() 헬퍼가 담당 — T-019)
  if (role === "admin") {
    items.push({ href: "/admin/circles", label: "承認管理" });
  }

  return (
    <nav className={cn("items-center gap-5 text-sm", className)} aria-label="メインメニュー">
      {items.map((item) => {
        // /circles 와 /circles/new 가 동시에 활성화되는 것을 막기 위해 정확/부분 매칭 분리
        const isActive =
          pathname === item.href ||
          (item.href !== "/circles/new" &&
            item.href !== "/" &&
            pathname.startsWith(item.href + "/"));
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "hover:text-foreground transition-colors",
              isActive ? "text-foreground font-semibold" : "text-muted-foreground"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
