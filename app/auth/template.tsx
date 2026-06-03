"use client";

import { type ReactNode } from "react";

import { PageTransition } from "@/components/layout/page-transition";

/**
 * 인증 페이지(login / sign-up / forgot-password 등) 공통 진입 페이드 인.
 * 검색 페이지와 동일한 mode="fade"(opacity-only) — 풀스크린 AuthScreen 의 fixed 레이아웃과 충돌 없음.
 */
export default function AuthTemplate({ children }: { children: ReactNode }) {
  return <PageTransition mode="fade">{children}</PageTransition>;
}
