"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface MobileNavProps {
  /** 관리자 권한 — 'admin' 일 때만 「承認管理」 메뉴 노출 */
  role?: string;
}

// 모바일(md 미만) 햄버거 메뉴 — 클릭 시 좌측 Sheet 슬라이드 아웃
// 데스크탑에서는 md:hidden 으로 숨김. PRD 「메뉴 구조」 와 동일 항목 사용
export function MobileNav({ role }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const items: { href: string; label: string }[] = [
    { href: "/circles", label: "サークルを探す" },
    { href: "/favorites", label: "お気に入り" },
    { href: "/circles/new", label: "サークルを登録する" },
    { href: "/mypage", label: "マイページ" },
  ];
  if (role === "admin") {
    items.push({ href: "/admin/circles", label: "承認管理" });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="メニューを開く">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72">
        <SheetHeader>
          <SheetTitle>メニュー</SheetTitle>
        </SheetHeader>
        <nav className="mt-6 flex flex-col gap-1" aria-label="モバイルメニュー">
          {items.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/circles/new" &&
                item.href !== "/" &&
                pathname.startsWith(item.href + "/"));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "hover:bg-accent hover:text-accent-foreground rounded-md px-3 py-2 text-sm transition-colors",
                  isActive ? "bg-accent text-accent-foreground font-semibold" : "text-foreground"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
