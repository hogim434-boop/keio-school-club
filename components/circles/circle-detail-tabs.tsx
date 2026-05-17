"use client";

/**
 * CircleDetailTabs — 상세 페이지 「ホーム / 掲示板」 controlled Tabs (Client Component).
 *
 * 왜 Client 인가:
 * - Radix Tabs 자체는 Client. uncontrolled (defaultValue) 면 RSC 안에서 직접 써도 OK.
 * - 단, 「もっと見る」 클릭으로 외부 트리거 탭 전환이 필요 → useState + controlled value 필요.
 *
 * RSC children-as-prop 패턴:
 * - homeContent (SummaryGrid + Description) 는 부모 (page.tsx RSC) 에서 만들어진 Server Component 그대로 전달.
 * - 자식 콘텐츠는 cacheComponents Suspense 안에서 정상 렌더링됨.
 *
 * 탭 스와이프:
 * - TabsContent 영역을 <m.div drag="x"> 로 감싸 가로 drag 제스처로 탭 전환.
 * - dragConstraints { left:0, right:0 } + dragElastic 0.2 — 실제 이동은 elastic bounce 만.
 * - onDragEnd: info.offset.x ± SWIPE_THRESHOLD 임계값 넘으면 setTab 호출.
 * - touch-pan-y: 가로 drag 만 가로채고 세로 스크롤은 native 유지 (모바일 필수).
 * - prefers-reduced-motion 시 drag 비활성 (탭 클릭으로만 전환).
 */

import { useState } from "react";
import { LazyMotion, domMax, m, useReducedMotion, type PanInfo } from "motion/react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActivityReportsList } from "@/components/circles/activity-reports-list";
import { ActivityReportsPreview } from "@/components/circles/activity-reports-preview";
import type { ActivityReport } from "@/lib/types/domain";

interface CircleDetailTabsProps {
  /** 서클 ID — ActivityReportsList + ActivityReportsPreview 에 전달 */
  circleId: string;
  /** 해당 서클의 전체 활동 리포트 (최신순 정렬된 상태) */
  reports: ActivityReport[];
  /** 「ホーム」 탭에 표시할 콘텐츠 — SummaryGrid + Description (Server Component children) */
  homeContent: React.ReactNode;
}

type TabValue = "home" | "board";

/** 스와이프 인지 임계값 — 50px 이상 drag 후 release 시 탭 전환 */
const SWIPE_THRESHOLD = 50;

export function CircleDetailTabs({ circleId, reports, homeContent }: CircleDetailTabsProps) {
  const [tab, setTab] = useState<TabValue>("home");
  const prefersReducedMotion = useReducedMotion();

  /** 「もっと見る」 클릭 → 「掲示板」 탭으로 전환 */
  function handleMoreClick() {
    setTab("board");
  }

  /**
   * drag end 핸들러 — info.offset.x 부호 + 임계값 분기.
   * 우→좌 drag (offset.x < -threshold) + tab === "home" → board 전환
   * 좌→우 drag (offset.x > threshold)  + tab === "board" → home 전환
   */
  function handleDragEnd(_e: unknown, info: PanInfo) {
    if (info.offset.x < -SWIPE_THRESHOLD && tab === "home") {
      setTab("board");
    } else if (info.offset.x > SWIPE_THRESHOLD && tab === "board") {
      setTab("home");
    }
  }

  return (
    <Tabs value={tab} onValueChange={(value) => setTab(value as TabValue)} className="w-full">
      <TabsList variant="line" className="w-full justify-start border-b">
        <TabsTrigger
          value="home"
          className="data-[state=active]:text-keio-navy data-[state=active]:after:bg-keio-navy"
        >
          ホーム
        </TabsTrigger>
        <TabsTrigger
          value="board"
          className="data-[state=active]:text-keio-navy data-[state=active]:after:bg-keio-navy"
        >
          掲示板
        </TabsTrigger>
      </TabsList>

      {/*
       * TabsContent 영역을 motion.div 로 감싸 drag x 활성화.
       * dragConstraints { left:0, right:0 } 으로 실제 이동은 elastic bounce 만.
       * dragElastic 0.2 — release 시 부드러운 원위치 복귀.
       * touch-pan-y — 가로 drag 만 가로채고 세로 스크롤은 native scroll 유지 (모바일 필수).
       * prefers-reduced-motion 시 drag={false} 로 비활성.
       */}
      <LazyMotion features={domMax}>
        <m.div
          drag={prefersReducedMotion ? false : "x"}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
          className="touch-pan-y"
        >
          {/* ホーム — Server Component children + 활동 리포트 미리보기 캐러셀 */}
          <TabsContent value="home" className="space-y-6 pt-6">
            {homeContent}
            <ActivityReportsPreview
              circleId={circleId}
              reports={reports.slice(0, 5)}
              onMoreClick={handleMoreClick}
            />
          </TabsContent>

          {/* 掲示板 — 전체 활동 리포트 세로 리스트 */}
          <TabsContent value="board" className="pt-6">
            <ActivityReportsList circleId={circleId} reports={reports} />
          </TabsContent>
        </m.div>
      </LazyMotion>
    </Tabs>
  );
}
