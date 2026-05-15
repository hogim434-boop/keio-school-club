"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// 글로벌 헤더의 client-side hide 게이트.
// 서버 측 header.tsx 가 x-pathname 으로 분기하지만, client-side soft navigation 시
// RSC fetch 가 middleware 의 request headers forward 를 못 받는 케이스가 있어 안전망으로 추가.
// SSR 시 children 그대로 → hydration 후 usePathname 평가 → hide 대상이면 null.
// 직접 진입은 server-side 가 hide 처리하여 깜빡임 없고, soft navigation 은 본 게이트가 책임.
//
// Hide 대상 (header.tsx 와 일치 유지):
// - 서클 상세 (/circles/{uuid}) — 메루카리 풀-블리드 cover 패턴
// - 검색 페이지 (/search) — 당근앱 패턴, SearchPageHeader 가 글로벌 헤더 역할 인계
export function HeaderClientGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isCircleDetail = /^\/circles\/[0-9a-f-]+$/i.test(pathname) && pathname !== "/circles/new";
  const isSearch = pathname === "/search";
  if (isCircleDetail || isSearch) return null;
  return <>{children}</>;
}
