"use client";

import { usePathname } from "next/navigation";
import { type ReactNode } from "react";

import { PageTransition } from "@/components/layout/page-transition";

/**
 * (tabs) 그룹 공통 template.
 *
 * 홈("/")에만 검색 페이지와 동일한 페이드 인(mode="fade", opacity-only)을 적용한다.
 * search / calendar / favorites / mypage / messages 는 각자 자체 template 을 가지므로
 * 여기서는 그대로 통과시켜 페이드가 이중으로 겹치지 않게 한다.
 */
export default function TabsTemplate({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/") {
    return <PageTransition mode="fade">{children}</PageTransition>;
  }

  return <>{children}</>;
}
