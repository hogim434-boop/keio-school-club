"use client";

import { type ReactNode } from "react";

import { PageTransition } from "@/components/layout/page-transition";

/**
 * DM 채팅(발신 폼 / 스레드) 진입 페이드 인.
 *
 * 부모 circles/[id]/template 은 "/dm" 경로에서 모션 래퍼 없이 children 만 통과시키므로
 * (풀스크린 fixed 채팅 레이아웃 보호), 이 template 이 전환을 담당한다.
 * mode="fade"(opacity-only)라 fixed inset-0 채팅 레이아웃을 붕괴시키지 않는다.
 */
export default function DmTemplate({ children }: { children: ReactNode }) {
  return <PageTransition mode="fade">{children}</PageTransition>;
}
