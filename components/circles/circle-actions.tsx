"use client";

/**
 * CircleActions — 서클 상세 페이지 액션 영역
 * layout='mobile': 화면 하단 고정 + md:hidden (모바일 전용 fixed 액션 바)
 * layout='desktop': 헤더 영역 inline 표시 (hidden md:flex)
 * handleJoin 은 JoinChannelModal 을 open 함 — T-009 anchor(RPC) 및 T-015 anchor(미로그인 처리)는 모달 내부에서 담당
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
  /**
   * 레이아웃 모드
   * - 'mobile': 화면 하단 고정 바 (md:hidden)
   * - 'desktop': 헤더 inline 배치 (hidden md:flex)
   */
  layout: "mobile" | "desktop";
}

/**
 * 서클 상세 페이지의 CTA 액션 영역.
 * 모바일: 화면 하단 fixed + safe-area-inset-bottom 패딩
 * 데스크탑: 헤더 옆 inline 배치
 * handleJoin 은 JoinChannelModal 을 open. RPC 호출은 모달 안 handleChannelClick 의 T-009 anchor.
 */
export function CircleActions({ circle, layout }: CircleActionsProps) {
  /** 채널 선택 모달 열림 상태 */
  const [modalOpen, setModalOpen] = useState(false);

  /** 「参加する」 버튼 클릭 시 채널 선택 모달 열기 */
  function handleJoin() {
    setModalOpen(true);
  }

  return (
    <>
      {layout === "mobile" ? (
        /* 모바일 하단 고정 액션 바 — md 이상에서는 숨김 */
        <div
          className={cn(
            "fixed right-0 bottom-0 left-0 z-30",
            "bg-background/95 supports-[backdrop-filter]:bg-background/80 border-t backdrop-blur",
            "pb-[env(safe-area-inset-bottom)]",
            "md:hidden"
          )}
        >
          <div className="container mx-auto flex max-w-md items-center gap-3 p-3">
            {/* 즐겨찾기 토글 버튼 — 48×48px 터치 타깃 */}
            <FavoriteToggleButton circleId={circle.id} variant="action-bar" />

            {/* 참가 신청 CTA — keio-navy 색상, flex-1 로 나머지 폭 전체 차지 */}
            <Button
              size="lg"
              onClick={handleJoin}
              className="bg-keio-navy text-keio-navy-foreground hover:bg-keio-navy/90 flex-1"
            >
              参加する
            </Button>
          </div>
        </div>
      ) : (
        /* 데스크탑 inline 액션 — 모바일에서는 숨김, md 이상에서 flex */
        <div className="hidden items-center gap-3 md:flex">
          {/* 즐겨찾기 토글 버튼 */}
          <FavoriteToggleButton circleId={circle.id} variant="action-bar" />

          {/* 참가 신청 CTA */}
          <Button
            size="lg"
            onClick={handleJoin}
            className="bg-keio-navy text-keio-navy-foreground hover:bg-keio-navy/90"
          >
            参加する
          </Button>
        </div>
      )}

      {/* 채널 선택 모달 — Fragment 끝에 한 번만 렌더 (mobile/desktop 레이아웃 공유) */}
      <JoinChannelModal circle={circle} open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}
