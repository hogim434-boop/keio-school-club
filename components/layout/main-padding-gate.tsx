"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * 본문 하단 패딩 게이트 — 모바일 하단 탭 바(BottomNav)가 본문을 가리지 않도록 `pb-16` 를 준다.
 *
 * 단, BottomNav 가 숨겨지는 풀스크린 경로(서클 상세 / 셔플 / 인증)에서는 패딩도 빼야 한다.
 * 그렇지 않으면 네비가 없는데도 64px 여백이 남아 풀스크린 화면(예: /shuffle)에 스크롤이 생긴다.
 *
 * Hide 대상은 bottom-nav.tsx 의 조건과 반드시 일치시킬 것.
 */
export function MainPaddingGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // bottom-nav.tsx 와 동일한 hide 조건
  const isCircleDetail = /^\/circles\/[0-9a-f-]+$/i.test(pathname) && pathname !== "/circles/new";
  const isShuffle = pathname === "/shuffle";
  const isAuth = pathname.startsWith("/auth");
  const hideNav = isCircleDetail || isShuffle || isAuth;

  // 네비가 보일 때만 모바일 하단 패딩 적용 (네비 h-14=56px 에 맞춰 pb-16).
  // 데스크탑은 네비 미노출이라 항상 패딩 불필요.
  return <div className={cn(!hideNav && "pb-16 md:pb-0")}>{children}</div>;
}
