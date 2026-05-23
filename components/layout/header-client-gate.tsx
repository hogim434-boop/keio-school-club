"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// 글로벌 헤더 숨김의 단독 결정자(sole gate).
// usePathname() 은 SSR 에서도 올바른 경로를 반환하므로
// SSR(직접 진입)·client soft navigation 양방향 모두 정확히 처리한다.
//
// 과거에는 Header(RSC) 가 x-pathname 으로 1차 숨김, 본 컴포넌트가 안전망 역할을 했으나
// App Router 루트 레이아웃에서 RSC 는 최초 하드 로드 시 한 번만 실행되어 null 로 굳는 버그가 있었다.
// (숨김 경로에서 직접 진입 → 홈 soft nav 시 헤더가 영구적으로 사라지는 현상)
// 이제 Header 는 항상 내용을 렌더하고, 숨김 판단은 본 컴포넌트가 전담한다.
//
// Hide 대상:
// - 서클 상세 (/circles/{uuid}) — 메루카리 풀-블리드 cover 패턴
// - 활동 리포트 상세 (/circles/{uuid}/reports/{uuid}) — 콘텐츠 중심 페이지, floating 뒤로가기 사용
// - 검색 페이지 (/search) — 당근앱 패턴, SearchPageHeader 가 글로벌 헤더 역할 인계
// - 셔플 페이지 (/shuffle) — Tinder 풀스크린 swipe deck
// - 인증 페이지 (/auth/*) — 풀스크린 AuthScreen 이 헤더를 덮으므로 미노출
// - 등록·수정 페이지 (/circles/new, /circles/{id}/edit) — 풀스크린 폼
export function HeaderClientGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isCircleDetail = /^\/circles\/[0-9a-f-]+$/i.test(pathname) && pathname !== "/circles/new";
  // reportId 는 더미 데이터에서 `{uuid}-report-{n}` 형태 → [\w-]+ 로 영문 포함 매칭
  const isCircleReportDetail = /^\/circles\/[0-9a-f-]+\/reports\/[\w-]+$/i.test(pathname);
  const isSearch = pathname === "/search";
  const isShuffle = pathname === "/shuffle";
  // /auth/* — AuthScreen fixed inset-0 풀스크린이 헤더를 완전히 덮음
  const isAuth = pathname.startsWith("/auth");
  // /circles/new(등록) · /circles/{id}/edit(수정) — 풀스크린 폼(AuthScreen). 헤더 미노출
  const isRegister = pathname === "/circles/new" || /^\/circles\/[^/]+\/edit$/.test(pathname);
  if (isCircleDetail || isCircleReportDetail || isSearch || isShuffle || isAuth || isRegister)
    return null;
  return <>{children}</>;
}
