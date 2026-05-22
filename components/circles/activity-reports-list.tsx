"use client";

/**
 * ActivityReportsList — 「掲示板」 탭의 전체 활동 리포트 세로 리스트.
 *
 * 디자인 (미니멀):
 * - 각 row: 좌측 정사각 썸네일 (size-20) + 우측 텍스트 영역
 * - 텍스트: 제목 (font-semibold) + 본문 2줄 미리보기 + 작성일 (text-xs)
 * - 좋아요/작성자 메타 없음
 *
 * 클릭 동작:
 * - row 전체가 <button> — SlideOutContext.navigate 트리거 → iOS push 슬라이드 트랜지션으로
 *   /circles/[circleId]/reports/[reportId] 로 전환.
 *
 * 빈 상태: 「まだレポートがありません」 안내. 더미 데이터로 인해 실제로는 잘 보이지 않음.
 */

import Image from "next/image";
import { useContext } from "react";
import { Construction, MessageSquareText } from "lucide-react";

import { SlideOutContext } from "@/app/circles/[id]/template";
import { cn } from "@/lib/utils";
import type { ActivityReport } from "@/lib/types/domain";

interface ActivityReportsListProps {
  /** 소속 서클 ID — 리포트 상세 URL 생성에 사용 */
  circleId: string;
  /** 전체 활동 리포트 목록 (최신순 정렬된 상태로 전달) */
  reports: ActivityReport[];
}

export function ActivityReportsList({ circleId, reports }: ActivityReportsListProps) {
  // 0건이면 빈 상태 안내
  if (reports.length === 0) {
    return (
      <div className="border-border bg-muted/30 flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-4 py-12 text-center">
        <MessageSquareText className="text-muted-foreground/60 size-16" aria-hidden="true" />
        <h3 className="text-base font-semibold">まだレポートがありません</h3>
        <p className="text-muted-foreground max-w-md text-sm">
          サークルメンバーが活動の様子を投稿すると、ここに表示されます。
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-border divide-y">
      {reports.map((report) => (
        <ReportListRow key={report.id} circleId={circleId} report={report} />
      ))}
    </ul>
  );
}

/**
 * 리스트 row — button 으로 감싸 전체 클릭 영역 확보.
 * 클릭 시 SlideOutContext 의 navigate 액션 → iOS push 슬라이드 트랜지션으로 상세 페이지 진입.
 */
function ReportListRow({ circleId, report }: { circleId: string; report: ActivityReport }) {
  const slideOut = useContext(SlideOutContext);
  /** 작성일 표시 — YYYY-MM-DD → 「4月1日」 형태로 일본어 단축 */
  const formattedDate = formatJpDate(report.created_at);

  function handleClick() {
    slideOut({ kind: "navigate", url: `/circles/${circleId}/reports/${report.id}` });
  }

  return (
    <li>
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          // 레이아웃 — 기존 li 와 동일한 flex row
          "flex w-full gap-3 py-3 text-left",
          // 인터랙션 스타일
          "-mx-3 rounded-md px-3 transition-colors",
          "hover:bg-accent/50",
          "focus-visible:bg-accent/50 focus-visible:outline-none",
          "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-1"
        )}
      >
        {/* 좌측 정사각 썸네일 — 80×80 */}
        <div className="bg-muted relative size-20 shrink-0 overflow-hidden rounded-lg">
          {report.image_url ? (
            <Image
              src={report.image_url}
              alt={report.title}
              fill
              sizes="80px"
              className="object-cover"
            />
          ) : (
            <div className="text-muted-foreground flex h-full w-full items-center justify-center">
              <Construction className="size-5" aria-hidden="true" />
            </div>
          )}
        </div>

        {/* 우측 텍스트 영역 — min-w-0 로 truncate 동작 보장 */}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="line-clamp-1 text-sm font-semibold">{report.title}</p>
          <p className="text-muted-foreground line-clamp-2 text-xs">{report.content}</p>
          <time className="text-muted-foreground text-xs" dateTime={report.created_at}>
            {formattedDate}
          </time>
        </div>
      </button>
    </li>
  );
}

/**
 * YYYY-MM-DD → 「4月1日」 형태로 변환.
 * UTC 파싱 시 timezone shift 우려가 있어 split 후 직접 Date 생성.
 */
function formatJpDate(isoDate: string): string {
  // created_at 은 timestamptz("YYYY-MM-DDTHH:mm:..")이므로 날짜 부분(T 이전)만 분리해 파싱.
  // (split("-") 만 하면 dayStr 이 "22T12:.." 가 되어 Number() → NaN → raw 노출되는 버그)
  const [, monthStr, dayStr] = isoDate.split("T")[0].split("-");
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (Number.isNaN(month) || Number.isNaN(day)) return isoDate;
  return `${month}月${day}日`;
}
