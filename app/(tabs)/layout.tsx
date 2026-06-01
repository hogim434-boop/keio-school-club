import { BottomTabs } from "@/components/layout/bottom-tabs";

/**
 * (tabs) route group 레이아웃 — 서버 컴포넌트.
 *
 * 하단 4탭 바를 마운트하는 공통 레이아웃.
 * ホーム(/) · さがす(/search) · カレンダー(/calendar) · マイページ(/mypage) 에만 탭이 표시됨.
 *
 * (tabs) 바깥 라우트 (/circles/[id], /auth/* 등) 에서는 이 레이아웃이 적용되지 않으므로
 * 탭이 나타나지 않는 풀스크린 UX 가 자동으로 구현된다.
 *
 * main: pb-[calc(env(safe-area-inset-bottom)+64px)]
 *   → 고정 탭 바(h-16=64px) + iOS 홈 인디케이터 영역이 본문을 가리지 않도록 여백 확보.
 */
export default function TabsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      {/* pb-[calc(env(safe-area-inset-bottom)+64px)]: 하단 탭 바(h-16=64px) + iOS 홈 인디케이터 영역.
          md 이상에서는 탭 바가 미노출이므로 패딩 불필요 → md:pb-0. */}
      <main className="flex-1 pb-[calc(env(safe-area-inset-bottom)+64px)] md:pb-0">{children}</main>
      <BottomTabs />
    </div>
  );
}
