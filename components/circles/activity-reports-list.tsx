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
 * - row 전체가 <div role="button"> — SlideOutContext.navigate 트리거 → iOS push 슬라이드 트랜지션으로
 *   /circles/[circleId]/reports/[reportId] 로 전환.
 *
 * 소유자 전용 ⋯ 메뉴 (isOwner=true):
 * - row 우상단에 Ellipsis 아이콘 DropdownMenu 표시.
 * - 「編集する」: 수정 바텀 시트 open.
 * - 「削除する」: AlertDialog 확인 후 deleteActivityReport() → router.refresh().
 * - ⋯ 버튼 클릭 시 stopPropagation 으로 상세 이동 차단.
 * - DropdownMenu + AlertDialog 포커스 충돌 방지 패턴 (managed-circle-card.tsx 참조):
 *   onSelect → setMenuOpen(false) → setTimeout(0) → setDeleteDialogOpen(true).
 *
 * 빈 상태: 「まだレポートがありません」 안내.
 */

import Image from "next/image";
import { useContext, useState } from "react";
import { useRouter } from "next/navigation";
import { Construction, Ellipsis, MessageSquareText, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { SlideOutContext } from "@/app/circles/[id]/template";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ReportComposeSheet } from "@/components/circles/report-compose-sheet";
import { deleteActivityReport } from "@/lib/circles/submit-activity-report";
import { cn } from "@/lib/utils";
import type { ActivityReport } from "@/lib/types/domain";

// ─────────────────────────────────────────
// Props
// ─────────────────────────────────────────

interface ActivityReportsListProps {
  /** 소속 서클 ID — 리포트 상세 URL 생성에 사용 */
  circleId: string;
  /** 전체 활동 리포트 목록 (최신순 정렬된 상태로 전달) */
  reports: ActivityReport[];
  /**
   * 소유자 여부 — true 이면 각 row 우상단에 ⋯ 메뉴(편집·삭제) 표시.
   * 서버(page.tsx)에서 getClaims() + owner_id 비교로 계산 후 circle-detail-tabs 를 경유해 전달.
   */
  isOwner?: boolean;
}

// ─────────────────────────────────────────
// 컴포넌트
// ─────────────────────────────────────────

export function ActivityReportsList({
  circleId,
  reports,
  isOwner = false,
}: ActivityReportsListProps) {
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
        <ReportListRow key={report.id} circleId={circleId} report={report} isOwner={isOwner} />
      ))}
    </ul>
  );
}

// ─────────────────────────────────────────
// 리스트 row 컴포넌트
// ─────────────────────────────────────────

interface ReportListRowProps {
  circleId: string;
  report: ActivityReport;
  isOwner: boolean;
}

/**
 * 리스트 row — div + 클릭 핸들러로 전체 클릭 영역 확보.
 * (button 중첩 금지 규칙: ⋯ 버튼을 포함하므로 row 는 div 로 변경)
 *
 * 소유자(isOwner=true) 인 경우에만 row 우상단에 ⋯ DropdownMenu 표시.
 * ⋯ 버튼 클릭은 stopPropagation 으로 상세 이동 차단.
 *
 * managed-circle-card.tsx 패턴 차용:
 * - menuOpen / editOpen / deleteDialogOpen 세 개의 controlled state
 * - 「削除する」 onSelect: setMenuOpen(false) → setTimeout(0) → setDeleteDialogOpen(true)
 *   (메뉴 close 애니메이션 완료 후 다이얼로그 포커스 이동을 올바르게 처리)
 */
function ReportListRow({ circleId, report, isOwner }: ReportListRowProps) {
  const slideOut = useContext(SlideOutContext);
  const router = useRouter();

  /** 작성일 표시 — YYYY-MM-DD → 「4月1日」 형태로 일본어 단축 */
  const formattedDate = formatJpDate(report.created_at);

  // ── 소유자 메뉴 controlled state ────────────────────────
  // managed-circle-card.tsx 패턴 그대로 차용.
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── 핸들러 ──────────────────────────────────────────────

  /** row 클릭 → 상세 페이지로 iOS push 트랜지션 */
  function handleRowClick() {
    slideOut({ kind: "navigate", url: `/circles/${circleId}/reports/${report.id}` });
  }

  /** 「編集する」 메뉴 항목 선택 */
  function handleEditMenuClick() {
    setMenuOpen(false);
    // setTimeout 0: 메뉴 close 애니메이션 완료 후 시트 open (포커스 처리)
    setTimeout(() => setEditOpen(true), 0);
  }

  /** 「削除する」 메뉴 항목 선택 */
  function handleDeleteMenuClick() {
    setMenuOpen(false);
    setTimeout(() => setDeleteDialogOpen(true), 0);
  }

  /** 삭제 AlertDialog 에서 「削除する」 확정 */
  async function handleDeleteConfirm() {
    setIsDeleting(true);
    try {
      const result = await deleteActivityReport(report.id);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("削除しました");
        setDeleteDialogOpen(false);
        router.refresh();
      }
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <li className="relative">
        {/*
         * row 전체 클릭 영역 — div + role="button" + onClick.
         * button 중첩 금지이므로 div 를 사용.
         * 내부 ⋯ 버튼은 stopPropagation 으로 row 클릭(상세 이동)과 분리.
         */}
        <div
          role="button"
          tabIndex={0}
          onClick={handleRowClick}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleRowClick();
            }
          }}
          className={cn(
            "flex w-full cursor-pointer gap-3 py-3 text-left",
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

          {/*
           * ⋯ 더보기 메뉴 — isOwner 일 때만 표시.
           * 텍스트 영역 오른쪽에 shrink-0 으로 배치.
           * stopPropagation 으로 row 전체 클릭(상세 이동)과 분리.
           */}
          {isOwner && (
            <div
              className="flex shrink-0 items-center self-center"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-foreground size-8 shrink-0"
                    aria-label="メニューを開く"
                  >
                    <Ellipsis className="size-4" aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {/* 編集する — 연필 아이콘 */}
                  <DropdownMenuItem onSelect={handleEditMenuClick}>
                    <Pencil aria-hidden="true" />
                    編集する
                  </DropdownMenuItem>
                  {/* 削除する — destructive variant(빨강) + 휴지통 아이콘 */}
                  <DropdownMenuItem variant="destructive" onSelect={handleDeleteMenuClick}>
                    <Trash2 aria-hidden="true" />
                    削除する
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </li>

      {/* ── 수정 바텀 시트 — row 외부에 렌더해 포커스 트랩 충돌 방지 ── */}
      {isOwner && (
        <ReportComposeSheet
          circleId={circleId}
          mode="edit"
          report={report}
          open={editOpen}
          onOpenChange={setEditOpen}
          showTrigger={false}
        />
      )}

      {/* ── 삭제 확인 AlertDialog — row 외부에 렌더해 포커스 트랩 충돌 방지 ── */}
      {isOwner && (
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>このレポートを削除しますか?</AlertDialogTitle>
              <AlertDialogDescription>
                この操作は取り消せません。投稿された画像も含めて完全に削除されます。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>キャンセル</AlertDialogCancel>
              {/* 삭제 실행 — destructive 스타일로 위험 동작 강조 */}
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
              >
                削除する
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}

// ─────────────────────────────────────────
// 유틸리티
// ─────────────────────────────────────────

/**
 * YYYY-MM-DD → 「4月1日」 형태로 변환.
 * UTC 파싱 시 timezone shift 우려가 있어 split 후 직접 Date 생성.
 */
function formatJpDate(isoDate: string): string {
  // created_at 은 timestamptz("YYYY-MM-DDTHH:mm:..")이므로 날짜 부분(T 이전)만 분리해 파싱.
  const [, monthStr, dayStr] = isoDate.split("T")[0].split("-");
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (Number.isNaN(month) || Number.isNaN(day)) return isoDate;
  return `${month}月${day}日`;
}
