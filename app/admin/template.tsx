"use client";

import { type ReactNode } from "react";

import { PageTransition } from "@/components/layout/page-transition";

/**
 * admin 영역(announcements / circles / inquiry-reports) 공통 진입 페이드 인.
 * 검색 페이지와 동일한 mode="fade"(opacity-only).
 */
export default function AdminTemplate({ children }: { children: ReactNode }) {
  return <PageTransition mode="fade">{children}</PageTransition>;
}
