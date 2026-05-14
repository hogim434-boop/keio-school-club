"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";

/**
 * 우하단 floating 등록 CTA (당근앱 「+ 모임 만들기」 패턴).
 * - BottomNav 와 분리된 별도 fixed Layer.
 * - 알약 모양, 텍스트 라벨 동반.
 * - 서클 상세(/circles/{uuid}) 및 등록 페이지(/circles/new) 에서 자동 hidden.
 * - 데스크탑(md+) 에서는 hidden.
 */
export function RegisterFloatingCTA() {
  const pathname = usePathname();

  // 서클 상세 페이지 — T-013 의 「参加する」 액션 바와 자리 충돌 회피
  const isCircleDetail = /^\/circles\/[0-9a-f-]+$/i.test(pathname) && pathname !== "/circles/new";
  // 등록 페이지 자기 자신 — 중복 노출 회피
  const isRegisterPage = pathname === "/circles/new";

  if (isCircleDetail || isRegisterPage) return null;

  return (
    <Link
      href="/circles/new"
      aria-label="サークルを登録に移動"
      className="bg-keio-navy text-keio-navy-foreground focus-visible:ring-ring fixed right-4 z-40 inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold shadow-lg transition-shadow hover:shadow-xl focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none md:hidden"
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 4.5rem)" }}
    >
      <Plus className="size-5" aria-hidden="true" />
      <span>サークルを登録</span>
    </Link>
  );
}
