"use client";

/**
 * CircleActions — 서클 상세 페이지 하단 sticky 액션 바
 *
 * layout prop 을 제거하고 모바일/데스크탑 모두 fixed bottom sticky 로 통일.
 * - 모바일: 화면 풀폭 + 상단 border
 * - 데스크탑: max-w-md 중앙 floating pill (rounded-2xl)
 *
 * CTA 텍스트 조건:
 * - shinkan_events 중 오늘 이후 이벤트 있음 → 「新歓に参加する」
 * - 없음 → 「参加する」
 *
 * handleJoin 은 JoinChannelModal 을 open 함.
 * T-009 anchor(RPC) 및 T-015 anchor(미로그인 처리)는 모달 내부에서 담당.
 */

import { useState } from "react";

import { FavoriteToggleButton } from "@/components/circles/favorite-toggle-button";
import { JoinChannelModal } from "@/components/circles/join-channel-modal";
import { Button } from "@/components/ui/button";
import type { CircleDetail } from "@/lib/types/domain";
import { cn } from "@/lib/utils";

interface CircleActionsProps {
  /** 액션 대상 서클 상세 정보 */
  circle: CircleDetail;
}

/**
 * 서클 상세 페이지의 CTA 액션 영역.
 *
 * 모바일/데스크탑 공통으로 fixed bottom sticky 패턴 사용.
 * 모바일에서는 풀 폭, 데스크탑에서는 max-w-md 중앙 floating pill.
 * glassmorphism 배경 + shadow-lg 로 sticky 임을 시각적으로 강조.
 */
export function CircleActions({ circle }: CircleActionsProps) {
  /** 채널 선택 모달 열림 상태 */
  const [modalOpen, setModalOpen] = useState(false);

  /** 오늘 날짜 (ISO 문자열 YYYY-MM-DD, UTC 기준) */
  const today = new Date().toISOString().slice(0, 10);

  /**
   * 오늘 이후 新歓 이벤트 존재 여부
   * true → CTA 「新歓に参加する」 / false → 「参加する」
   */
  const hasUpcomingEvents = circle.shinkan_events.some((e) => e.event_date >= today);
  const ctaText = hasUpcomingEvents ? "新歓に参加する" : "参加する";

  /** 「参加する」 버튼 클릭 시 채널 선택 모달 열기 */
  function handleJoin() {
    setModalOpen(true);
  }

  return (
    <>
      {/* 모바일/데스크탑 공통 fixed bottom 컨테이너 */}
      <div className={cn("fixed right-0 bottom-0 left-0 z-30", "pb-[env(safe-area-inset-bottom)]")}>
        {/*
         * 모바일: 풀폭 + border-t + 패딩 없음 (가장자리 맞닿음)
         * 데스크탑: max-w-md 중앙 정렬 + mb-6 + rounded-2xl (floating pill)
         */}
        <div
          className={cn(
            // 공통 glassmorphism 스타일
            "bg-background/95 shadow-lg backdrop-blur",
            "supports-[backdrop-filter]:bg-background/80",
            // 모바일: 상단 border + 풀폭
            "border-t",
            // 데스크탑: 중앙 floating pill
            "md:mx-auto md:mb-6 md:max-w-md md:rounded-2xl md:border md:border-t-0 md:shadow-xl"
          )}
        >
          <div className="flex items-center gap-3 p-3">
            {/* 즐겨찾기 토글 버튼 — 48×48px 터치 타깃 */}
            {/* wrapper div 에 active:scale-95 적용 (내부 컴포넌트 스타일 미수정) */}
            <div className="shrink-0 transition-transform active:scale-95 motion-reduce:transform-none">
              <FavoriteToggleButton circleId={circle.id} variant="action-bar" />
            </div>

            {/*
             * 참가 신청 CTA 버튼
             * - keio-navy 색상
             * - flex-1 로 나머지 폭 전부 차지
             * - active:scale-95 tap feedback (접근성: motion-reduce 시 transform 비활성)
             */}
            <Button
              size="lg"
              onClick={handleJoin}
              className={cn(
                "bg-keio-navy text-keio-navy-foreground hover:bg-keio-navy/90 flex-1",
                "transition-transform active:scale-95 motion-reduce:transform-none"
              )}
            >
              {ctaText}
            </Button>
          </div>
        </div>
      </div>

      {/* 채널 선택 모달 — fixed 컨테이너 밖에 단 한 번만 렌더 */}
      <JoinChannelModal circle={circle} open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}
