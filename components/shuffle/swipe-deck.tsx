"use client";

// SwipeDeck — 서버에서 prefetch 된 circles 를 받아 swipe 상태를 관리하는 Client Component.
// LazyMotion 래핑 담당 (SwipeCard 에서 m.div 사용 → 여기서 domAnimation 공급).

import Link from "next/link";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { LazyMotion, domAnimation } from "motion/react";
import { ArrowLeft, Heart, X } from "lucide-react";
import { toast } from "sonner";

import { ShuffleSlideOutContext } from "@/app/shuffle/template";
import { SwipeCard, type SwipeCardHandle } from "@/components/shuffle/swipe-card";
import { Emoji } from "@/components/ui/emoji";
import { useFavorites } from "@/lib/circles/use-favorites";
import { fisherYates } from "@/lib/utils/shuffle";
import type { CircleSummary } from "@/lib/types/domain";

interface SwipeDeckProps {
  circles: CircleSummary[];
}

export function SwipeDeck({ circles }: SwipeDeckProps) {
  // 戻る 버튼 → template 의 슬라이드 아웃 트리거 → /circles 로 router.push 일임
  const slideOutToCircles = useContext(ShuffleSlideOutContext);

  // 재셔플 시 useMemo 재계산 트리거용 카운터 — 「もう一度シャッフル」 클릭 시 +1
  const [reshuffleKey, setReshuffleKey] = useState(0);

  // 페이지 진입·재셔플마다 1회 셔플 — reshuffleKey 를 의존성에 두어 「もう一度」 클릭 시 재계산.
  // void 로 명시적 참조해 react-hooks/exhaustive-deps 가 dep 를 인지하도록 함.
  const shuffled = useMemo(() => {
    void reshuffleKey;
    return fisherYates(circles);
  }, [circles, reshuffleKey]);

  // 현재 상단 카드 인덱스 — swipe 발생할 때마다 +1
  const [currentIndex, setCurrentIndex] = useState(0);

  // toggle: 右 swipe 시 즐겨찾기 추가 / 미인증이면 로그인 리다이렉트 자동 처리
  const { toggle } = useFavorites();

  // 가장 위 카드의 imperative handle — 좌우 버튼·키보드가 호출해 fly-out 트리거
  const topCardRef = useRef<SwipeCardHandle>(null);

  // fly-out 완료 후 SwipeCard.onSwipe 콜백으로 호출됨 — 즐겨찾기·인덱스 갱신만 담당
  const handleSwipe = (dir: "left" | "right") => {
    if (dir === "right") {
      const target = shuffled[currentIndex];
      if (target) {
        toggle(target.id);
        toast.success("気になるに追加しました");
      }
    }
    setCurrentIndex((i) => i + 1);
  };

  // 버튼·키보드 입력 → top 카드 fly-out 애니메이션을 거친 뒤 handleSwipe 실행됨.
  // drag/버튼/키보드 모두 동일한 시각 피드백 경로 공유.
  const triggerSwipe = (dir: "left" | "right") => {
    topCardRef.current?.swipe(dir);
  };

  // ── 키보드 핸들러 ────────────────────────────────────────────────
  // ref 패턴 — currentIndex 변경 시 window 리스너 재등록 회피 + stale closure 방지
  const triggerSwipeRef = useRef(triggerSwipe);
  useEffect(() => {
    triggerSwipeRef.current = triggerSwipe;
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") triggerSwipeRef.current("left");
      else if (e.key === "ArrowRight") triggerSwipeRef.current("right");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // 모든 카드를 다 본 상태
  const isFinished = currentIndex >= shuffled.length;

  // 「もう一度シャッフル」 — 새 시드로 재셔플 + 인덱스 리셋
  const handleReshuffle = () => {
    setReshuffleKey((k) => k + 1);
    setCurrentIndex(0);
  };

  return (
    <LazyMotion features={domAnimation}>
      <div className="relative mx-auto flex h-dvh max-w-md flex-col px-4 pb-32">
        {/* ── 헤더 영역 — 戻る 버튼 전용 region. 카드 영역과 layout 상 완전 분리. ── */}
        <header
          className="flex items-center"
          style={{
            paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)",
            paddingBottom: "0.75rem",
          }}
        >
          <button
            type="button"
            onClick={slideOutToCircles}
            aria-label="シャッフルを終了"
            className="bg-background/80 ring-border hover:bg-muted focus-visible:ring-ring inline-flex size-10 items-center justify-center rounded-full shadow-sm ring-1 backdrop-blur transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            <ArrowLeft className="size-5" aria-hidden="true" />
          </button>
        </header>

        {/* 본문 영역 — FinishedView 또는 카드 스택 */}
        <div className="relative flex-1">
          {isFinished ? <FinishedView onReshuffle={handleReshuffle} /> : <CardStack />}
        </div>

        {/* 좌우 액션 버튼 — 카드가 남아있을 때만 노출.
            triggerSwipe → topCardRef.swipe() → fly-out 후 handleSwipe 호출 (drag 와 동일 경로) */}
        {!isFinished && (
          <div className="fixed inset-x-0 bottom-8 z-10 flex items-center justify-center gap-8">
            <button
              type="button"
              onClick={() => triggerSwipe("left")}
              aria-label="次へ"
              className="bg-background ring-border hover:bg-muted focus-visible:ring-ring inline-flex size-16 items-center justify-center rounded-full shadow-lg ring-1 transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              <X className="size-7 text-red-500" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => triggerSwipe("right")}
              aria-label="気になるに追加"
              className="bg-background ring-border hover:bg-muted focus-visible:ring-ring inline-flex size-16 items-center justify-center rounded-full shadow-lg ring-1 transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              <Heart className="size-7 text-green-500" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </LazyMotion>
  );

  // ── 내부 컴포넌트 ────────────────────────────────────────────────
  // 외부 export 불필요 + 클로저로 shuffled/currentIndex/handleSwipe 접근 가능
  function CardStack() {
    // 성능: 현재 + 다음 2장(총 3장)만 DOM 에 마운트
    const stack = shuffled.slice(currentIndex, currentIndex + 3);
    if (stack.length === 0) return null;

    // 뒤 카드부터 렌더 → 앞 카드가 자연스럽게 위에 쌓임 (z-index 불필요)
    return (
      <>
        {[...stack].reverse().map((circle, i) => {
          const stackPos = stack.length - 1 - i;
          // 가장 위 카드에만 ref 연결 — 버튼·키보드의 명령형 swipe() 진입점
          const isTop = stackPos === 0;
          return (
            <SwipeCard
              key={circle.id}
              ref={isTop ? topCardRef : null}
              circle={circle}
              stackPosition={stackPos}
              onSwipe={handleSwipe}
            />
          );
        })}
      </>
    );
  }
}

// ── FinishedView ────────────────────────────────────────────────────
// 모든 카드를 다 본 후 노출되는 빈 상태 + 재셔플/一覧 진입점.
// 응원 톤 + 큼지막 sparkles 이모지 + 차분한 카피
function FinishedView({ onReshuffle }: { onReshuffle: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <Emoji name="sparkles" size={72} className="mb-4" />
      <h2 className="text-foreground mb-2 text-2xl font-bold">全部見ました!</h2>
      <p className="text-muted-foreground mb-8 max-w-xs text-sm leading-relaxed">
        気になるサークルは「お気に入り」で確認できます
      </p>
      <div className="flex w-full max-w-xs flex-col gap-3">
        <button
          type="button"
          onClick={onReshuffle}
          className="bg-foreground text-background hover:bg-foreground/90 focus-visible:ring-ring inline-flex h-12 w-full items-center justify-center rounded-full text-sm font-semibold shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          もう一度シャッフル
        </button>
        <Link
          href="/circles"
          className="text-muted-foreground hover:text-foreground inline-flex h-12 w-full items-center justify-center rounded-full text-sm font-medium transition-colors"
        >
          一覧で見る →
        </Link>
      </div>
    </div>
  );
}
