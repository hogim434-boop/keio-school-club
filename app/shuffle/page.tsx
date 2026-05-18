import { Suspense } from "react";

import { SwipeDeck } from "@/components/shuffle/swipe-deck";
import { filterCircles } from "@/lib/supabase/queries/circles";

/**
 * /shuffle — Tinder/Hinge 스타일 swipe deck 디스커버리 페이지 (RSC).
 *
 * cacheComponents:true 모드 호환: cookies() 등 동적 API 에 접근하는 Server Component 는
 * 반드시 <Suspense> 안에 위치해야 한다 (CLAUDE.md 참조).
 *
 * 글로벌 UI (Header / BottomNav / RegisterFloatingCTA) 는 이 경로에서 자동 숨김.
 */
export default function ShufflePage() {
  return (
    <main className="min-h-dvh">
      <Suspense fallback={null}>
        <ShuffleContent />
      </Suspense>
    </main>
  );
}

async function ShuffleContent() {
  // 전체 prefetch — all:true 로 페이지네이션 없이 전부 취득.
  // 클라이언트 SwipeDeck 에서 Fisher-Yates 셔플 후 deck 구성.
  const { circles } = await filterCircles({ all: true });
  return <SwipeDeck circles={circles} />;
}
