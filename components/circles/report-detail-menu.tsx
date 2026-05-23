"use client";

/**
 * ReportDetailMenu — 활동 리포트 상세 페이지 우상단 floating ⋯(점세개) 메뉴.
 *
 * 좌상단 ReportPageHeader(뒤로가기)와 대칭으로, 우상단에 소유자 전용 편집/삭제 메뉴를 띄운다.
 *
 * 마운트 전략 (createPortal → document.body):
 * - 부모 template.tsx 가 이탈 시 transform(x:100%) 을 적용하므로,
 *   transform 조상은 자식 position:fixed 의 containing block 을 가로챈다.
 * - createPortal 로 body 에 직접 마운트하면 viewport 기준 fixed 가 정상 동작 (우상단 고정 유지).
 *   (ReportPageHeader 와 동일한 이유)
 *
 * 동작 (activity-reports-list.tsx 의 row ⋯ 메뉴 패턴 그대로 차용):
 * - 「編集する」: ReportComposeSheet(edit 모드) open → 성공 시 시트 내부에서 router.refresh().
 * - 「削除する」: AlertDialog 확인 → deleteActivityReport() → 삭제 후 서클 상세로 복귀.
 * - menuOpen / editOpen / deleteDialogOpen 세 controlled state + setTimeout(0) 으로 포커스 충돌 방지.
 *
 * 권한: isOwner=false 면 아무것도 렌더하지 않는다 (page.tsx 에서 서버 계산 후 전달).
 */

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Ellipsis } from "lucide-react";
import { toast } from "sonner";

import { DETAIL_RETURN_TAB_FLAG } from "@/app/circles/[id]/reports/[reportId]/template";
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

  // hydration 안전한 mount 가드 — SSR 시 document 미존재로 createPortal 호출 불가
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

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
  // mounted 후에만 portal 활성화 — 첫 SSR 렌더는 null
  if (!mounted) return null;

  const menu = (
    <>
      {/* 우상단 floating ⋯ 버튼 — 뒤로가기 버튼과 대칭 (left-4 ↔ right-4) */}
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger
          aria-label="メニューを開く"
          className={cn(
            // 위치: 우상단 fixed, safe-area-inset-top 회피
            "fixed right-4 z-20 size-10",
            // 모양: 원형 + glassmorphism + border + shadow (뒤로가기 버튼과 동일)
            "inline-flex items-center justify-center rounded-full",
            "bg-background/80 border shadow-md backdrop-blur",
            "supports-backdrop-filter:bg-background/60",
            // 인터랙션
            "hover:bg-background transition-colors",
            "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none"
          )}
          style={{ top: "max(env(safe-area-inset-top), 1rem)" }}
        >
          <Ellipsis className="size-5" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-32">
          {/* 編集する */}
          <DropdownMenuItem className="cursor-pointer text-sm" onSelect={handleEditMenuClick}>
            編集する
          </DropdownMenuItem>
          {/* 削除する — destructive 색상으로 위험 동작 강조 */}
          <DropdownMenuItem
            className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer text-sm"
            onSelect={handleDeleteMenuClick}
          >
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

      {/* 삭제 확인 AlertDialog */}
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
    </>
  );

  return createPortal(menu, document.body);
}
