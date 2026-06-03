"use client";

import { usePathname } from "next/navigation";
import { type ReactNode } from "react";

import { PageTransition } from "@/components/layout/page-transition";

/**
 * circles 세그먼트 template.
 *
 * /circles(동아리 일람)에만 페이드 인(mode="fade", opacity-only)을 적용한다.
 * /circles/[id] 등 하위는 자체 template(iOS 슬라이드)이 전환을 담당하므로 그대로 통과시켜
 * 페이드와 슬라이드가 이중으로 겹치지 않게 한다.
 */
export default function CirclesTemplate({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/circles") {
    return <PageTransition mode="fade">{children}</PageTransition>;
  }

  return <>{children}</>;
}
