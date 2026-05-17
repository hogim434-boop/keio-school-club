"use client";

/**
 * ActivityReportsPreview — 「ホーム」 탭의 「活動レポート」 가로 캐러셀 (4-5건 미리보기).
 *
 * 디자인 (미니멀 — 좋아요/작성자 표시 안 함):
 * - 헤더: 「活動レポート」 + 「もっと見る >」 (button)
 * - 카드: 정사각 썸네일 + 제목 + 본문 1줄 미리보기
 * - 「もっと見る」 클릭 시 onMoreClick 호출 → 부모 (CircleDetailTabs) 가 「掲示板」 탭으로 전환
 *
 * 가로 스크롤은 모바일/데스크탑 공통 (snap-x mandatory + overflow-x-auto).
 * 풀-블리드 가로 스크롤 패턴 — `-mx-4 px-4` 으로 좌우 padding 안에서 자연스럽게.
 *
 * 카드 클릭:
 * - useContext(SlideOutContext) 로 navigate 트리거 — 게시판 row 와 동일한 트랜지션 발화.
 * - 서클 페이지 좌측 슬라이드 아웃 + 활동 상세 페이드 인.
 */

import { useContext } from "react";
import Image from "next/image";
import { ChevronRight, Construction } from "lucide-react";

import { SlideOutContext } from "@/app/circles/[id]/template";
import type { ActivityReport } from "@/lib/types/domain";
import { cn } from "@/lib/utils";

interface ActivityReportsPreviewProps {
  /** 소속 서클 ID — 카드 클릭 시 상세 페이지 URL 생성 */
  circleId: string;
  /** 미리보기로 노출할 리포트 (보통 5건) */
  reports: ActivityReport[];
  /** 「もっと見る」 클릭 콜백 — 부모가 탭 전환 처리 */
  onMoreClick: () => void;
}

export function ActivityReportsPreview({
  circleId,
  reports,
  onMoreClick,
}: ActivityReportsPreviewProps) {
  // 리포트 0건이면 섹션 자체 미렌더 (Phase 1.1 더미는 채워져 있어 실제로는 항상 노출)
  if (reports.length === 0) return null;

  return (
    <section className="space-y-3">
      {/* 헤더 — 좌측 타이틀 + 우측 「もっと見る」 button */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">活動レポート</h2>
        <button
          type="button"
          onClick={onMoreClick}
          className={cn(
            "text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5 text-sm transition-colors",
            "focus-visible:ring-ring focus-visible:rounded focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          )}
        >
          もっと見る
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      </div>

      {/*
       * 가로 캐러셀 — 풀블리드 (-mx-4 px-4) + snap.
       * gap-3 + 카드 폭 w-36 / md:w-44 → 모바일 약 2-3장 / 데스크탑 약 4-5장 보임.
       */}
      <div
        className={cn(
          "-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1",
          "[scroll-padding-inline:1rem] [overscroll-behavior-x:contain]"
        )}
      >
        {reports.map((report) => (
          <ReportPreviewCard key={report.id} circleId={circleId} report={report} />
        ))}
      </div>
    </section>
  );
}

/**
 * 미리보기 카드 — 정사각 썸네일 + 제목 1줄 + 본문 1줄.
 * button 으로 감싸 클릭 시 SlideOutContext.navigate 발화 → 게시판 row 와 동일한 트랜지션.
 */
function ReportPreviewCard({ circleId, report }: { circleId: string; report: ActivityReport }) {
  const slideOut = useContext(SlideOutContext);

  function handleClick() {
    slideOut({ kind: "navigate", url: `/circles/${circleId}/reports/${report.id}` });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "w-36 shrink-0 snap-start space-y-2 text-left md:w-44",
        "rounded-lg transition-opacity",
        "hover:opacity-90 active:opacity-80",
        "focus-visible:ring-ring focus-visible:rounded-lg focus-visible:ring-2 focus-visible:outline-none"
      )}
    >
      {/* 정사각 썸네일 — image_url null 시 Construction 아이콘 placeholder */}
      <div className="bg-muted relative aspect-square overflow-hidden rounded-lg">
        {report.image_url ? (
          <Image
            src={report.image_url}
            alt={report.title}
            fill
            sizes="(min-width: 768px) 11rem, 9rem"
            className="object-cover"
          />
        ) : (
          <div className="text-muted-foreground flex h-full w-full items-center justify-center">
            <Construction className="size-6" aria-hidden="true" />
          </div>
        )}
      </div>

      {/* 텍스트 영역 — 제목 1줄 + 본문 1줄 */}
      <div className="space-y-0.5">
        <p className="line-clamp-1 text-sm font-medium">{report.title}</p>
        <p className="text-muted-foreground line-clamp-1 text-xs">{report.content}</p>
      </div>
    </button>
  );
}
