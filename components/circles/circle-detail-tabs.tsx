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
 */

import { useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActivityReportsList } from "@/components/circles/activity-reports-list";
import { ActivityReportsPreview } from "@/components/circles/activity-reports-preview";
import type { ActivityReport } from "@/lib/types/domain";

interface CircleDetailTabsProps {
  /** 서클 ID — ActivityReportsList 에 전달하여 상세 페이지 URL 생성에 사용 */
  circleId: string;
  /** 해당 서클의 전체 활동 리포트 (최신순 정렬된 상태) */
  reports: ActivityReport[];
  /** 「ホーム」 탭에 표시할 콘텐츠 — SummaryGrid + Description (Server Component children) */
  homeContent: React.ReactNode;
}

type TabValue = "home" | "board";

export function CircleDetailTabs({ circleId, reports, homeContent }: CircleDetailTabsProps) {
  const [tab, setTab] = useState<TabValue>("home");

  /** 「もっと見る」 클릭 → 「掲示板」 탭으로 전환 */
  function handleMoreClick() {
    setTab("board");
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

      {/* ホーム — Server Component children + 활동 리포트 미리보기 캐러셀 */}
      <TabsContent value="home" className="space-y-6 pt-6">
        {homeContent}
        <ActivityReportsPreview reports={reports.slice(0, 5)} onMoreClick={handleMoreClick} />
      </TabsContent>

      {/* 掲示板 — 전체 활동 리포트 세로 리스트 */}
      <TabsContent value="board" className="pt-6">
        <ActivityReportsList circleId={circleId} reports={reports} />
      </TabsContent>
    </Tabs>
  );
}
