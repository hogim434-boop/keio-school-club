"use client";

/**
 * ReportDetailMenu — 활동 리포트 상세 페이지 sticky 헤더 안 ⋯(점세개) 메뉴.
 *
 * 헤더 컴포넌트(report-detail-header.tsx) 내부에 인라인으로 렌더되는 드롭다운 메뉴.
 * (기존 createPortal + fixed 방식을 제거 → sticky 헤더 안 인라인으로 변경)
 *
 * 동작 (activity-reports-list.tsx 의 row ⋯ 메뉴 패턴 그대로 차용):
 * - 「編集する」: ReportComposeSheet(edit 모드) open → 성공 시 시트 내부에서 router.refresh().
 * - 「削除する」: AlertDialog 확인 → deleteActivityReport() → 삭제 후 서클 상세로 복귀.
 * - menuOpen / editOpen / deleteDialogOpen 세 controlled state + setTimeout(0) 으로 포커스 충돌 방지.
 *
 * 권한: isOwner=false 면 아무것도 렌더하지 않는다 (page.tsx 에서 서버 계산 후 전달).
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ellipsis, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { DETAIL_RETURN_TAB_FLAG } from "@/app/circles/[id]/reports/[reportId]/template";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
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

interface ReportDetailMenuProps {
  /** 소속 서클 ID — 편집 시트 / 삭제 후 복귀 URL 에 사용 */
  circleId: string;
  /** 편집 시트에 넘길 현재 리포트 */
  report: ActivityReport;
  /** 소유자 여부 — false 면 메뉴 미표시 */
  isOwner: boolean;
}

export function ReportDetailMenu({ circleId, report, isOwner }: ReportDetailMenuProps) {
  const router = useRouter();

  // ── 메뉴 controlled state (activity-reports-list.tsx 패턴) ──
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  /** 「編集する」 선택 → 메뉴 닫고 편집 시트 open (포커스 처리용 setTimeout 0) */
  function handleEditMenuClick() {
    setMenuOpen(false);
    setTimeout(() => setEditOpen(true), 0);
  }

  /** 「削除する」 선택 → 메뉴 닫고 삭제 확인 다이얼로그 open */
  function handleDeleteMenuClick() {
    setMenuOpen(false);
    setTimeout(() => setDeleteDialogOpen(true), 0);
  }

  /**
   * 삭제 확정.
   * - 성공 시: 현재 상세 리포트가 사라지므로(이 페이지는 404 가 됨) 서클 상세로 복귀.
   * - DETAIL_RETURN_TAB_FLAG="board": 복귀 후 「掲示板」 탭이 활성화되도록 신호.
   * - router.replace + refresh: Router Cache 의 stale 리스트(삭제된 항목)를 피하고 최신 데이터로.
   */
  async function handleDeleteConfirm() {
    setIsDeleting(true);
    try {
      const result = await deleteActivityReport(report.id);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("削除しました");
      setDeleteDialogOpen(false);
      try {
        sessionStorage.setItem(DETAIL_RETURN_TAB_FLAG, "board");
      } catch {
        // private mode 등 sessionStorage 차단 환경 — 무시 (기본 탭으로 복귀)
      }
      router.replace(`/circles/${circleId}`);
      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  }

  // 소유자가 아니면 아무것도 렌더하지 않음
  if (!isOwner) return null;

  return (
    <>
      {/* 헤더 안 인라인 ⋯ 버튼 — ghost 원형 스타일 */}
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger
          aria-label="メニューを開く"
          className={cn(
            // 크기: 터치 영역 확보
            "inline-flex size-10 shrink-0 items-center justify-center rounded-full",
            // 색상: ghost (배경 없음 → hover 시 muted)
            "text-foreground hover:bg-muted transition-colors",
            // 포커스 링
            "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none"
          )}
        >
          <Ellipsis className="size-5" aria-hidden="true" />
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

      {/* 편집 바텀 시트 — controlled (showTrigger=false), 성공 시 내부 router.refresh() */}
      <ReportComposeSheet
        circleId={circleId}
        mode="edit"
        report={report}
        open={editOpen}
        onOpenChange={setEditOpen}
        showTrigger={false}
      />

      {/* 삭제 확인 다이얼로그 */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="このレポートを削除しますか?"
        description="この操作は取り消せません。投稿された画像も含めて完全に削除されます。"
        onConfirm={handleDeleteConfirm}
        isLoading={isDeleting}
      />
    </>
  );
}
