"use client";

import { usePathname } from "next/navigation";

import { BottomTabs } from "@/components/layout/bottom-tabs";

/**
 * /circles 영역 레이아웃 (Client) — 하단 탭바 노출 제어.
 *
 * app/circles 는 (tabs) route group 밖에 있어 기본적으로 BottomTabs 가 붙지 않는다.
 * 하지만 `/circles`(카테고리·검색 결과 一覧)는 홈의 「もっと見る」 도착지로,
 * BottomTabs 의 isTabActive 도 /circles 를 「ホーム」 활성으로 처리하므로 탭바가 보여야 한다.
 *
 * 따라서 **일람 페이지(`/circles`)에서만** 탭바 + 하단 패딩을 적용하고,
 * 상세(`/circles/[id]`)·등록(`/circles/new`)·수정(`/circles/[id]/edit`) 등
 * 풀스크린 서브라우트에서는 패스스루(탭바 미노출)로 기존 UX 를 유지한다.
 */
export default function CirclesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // 쿼리스트링(?category=...)은 pathname 에 포함되지 않으므로 일람 필터 화면도 매칭된다.
  const isListPage = pathname === "/circles";

  if (!isListPage) return <>{children}</>;

  return (
    <div className="flex min-h-svh flex-col">
      {/* (tabs)/layout.tsx 와 동일: 고정 탭바(h-16=64px) + iOS 홈 인디케이터 영역 만큼 본문 하단 여백 확보. */}
      <main className="flex-1 pb-[calc(env(safe-area-inset-bottom)+64px)] md:pb-0">{children}</main>
      <BottomTabs />
    </div>
  );
}
