"use client";

/**
 * components/dm/block-user-menu.tsx
 *
 * 운영진이 인박스에서 발신자를 차단/해제하는 DropdownMenu + AlertDialog.
 *
 * ── 역할 ─────────────────────────────────────────────────────────────────────
 * - isBlocked=false: 「このユーザーをブロック」 항목 → AlertDialog 확인 → blockUser 호출
 * - isBlocked=true : 「ブロックを解除」 항목 → AlertDialog 없이 즉시 unblockUser 호출
 *   (차단 해제는 되돌릴 수 있는 작업이므로 AlertDialog 생략)
 *
 * ── UI 요건 ───────────────────────────────────────────────────────────────────
 * - AlertDialog 확인 문구: 강제·위협 톤 금지 (CLAUDE.md 금지어 규칙)
 * - 일본어 UI
 * - 부모 <Link> 클릭과 메뉴 버튼 클릭이 충돌하지 않도록 stopPropagation
 *
 * ── 3-context 패턴 ────────────────────────────────────────────────────────────
 * Server Action(blockUser/unblockUser)을 직접 호출.
 * 이 컴포넌트 자체는 Supabase 클라이언트를 직접 생성하지 않음.
 */

import { useState, useTransition } from "react";
import { MoreVertical, ShieldBan, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { cn } from "@/lib/utils";
import { blockUser, unblockUser } from "@/app/circles/[id]/dm/actions";

// ── Props ──────────────────────────────────────────────────────────────────────
interface BlockUserMenuProps {
  /** 차단/해제를 적용할 서클 UUID */
  circleId: string;
  /** 차단/해제 대상 사용자 UUID */
  targetUserId: string;
  /** 현재 차단 상태 여부 */
  isBlocked: boolean;
  /** 연결된 inquiry ID (선택 — 로그/디버그 용도로 전달 가능) */
  inquiryId?: string;
  /** 대상 사용자 표시명 (AlertDialog 안내에 사용) */
  targetDisplayName?: string | null;
}

/**
 * 운영진 인박스 스레드 카드 우측에 표시하는 차단 메뉴.
 */
export function BlockUserMenu({
  circleId,
  targetUserId,
  isBlocked,
  targetDisplayName,
}: BlockUserMenuProps) {
  // AlertDialog 열림 상태 — 차단 확인 다이얼로그
  const [isAlertOpen, setIsAlertOpen] = useState(false);

  // useTransition: Server Action 실행 중 pending 상태 관리
  const [isPending, startTransition] = useTransition();

  // ── 차단 실행 핸들러 ─────────────────────────────────────────────────────
  function handleBlock() {
    startTransition(async () => {
      const result = await blockUser(circleId, targetUserId);

      if (result && "error" in result) {
        // 실패 시 에러 토스트
        toast.error(result.error);
      } else {
        // 성공 시 안내 토스트
        const name = targetDisplayName ?? "このユーザー";
        toast.success(`${name} をブロックしました`);
      }
      setIsAlertOpen(false);
    });
  }

  // ── 차단 해제 실행 핸들러 ──────────────────────────────────────────────
  function handleUnblock() {
    startTransition(async () => {
      const result = await unblockUser(circleId, targetUserId);

      if (result && "error" in result) {
        toast.error(result.error);
      } else {
        const name = targetDisplayName ?? "このユーザー";
        toast.success(`${name} のブロックを解除しました`);
      }
    });
  }

  return (
    <>
      {/* ── DropdownMenu トリガー ──────────────────────────────────────── */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            // 부모 <Link> 의 클릭 이벤트와 충돌 방지
            onClick={(e) => e.preventDefault()}
            disabled={isPending}
            aria-label="メニューを開く"
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-md",
              "text-muted-foreground transition-colors",
              "hover:bg-muted hover:text-foreground",
              "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
              isPending && "cursor-not-allowed opacity-50"
            )}
          >
            <MoreVertical className="size-4" aria-hidden />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-48">
          {isBlocked ? (
            /* ── 차단 해제 항목 ───────────────────────────────────── */
            <DropdownMenuItem
              onClick={(e) => {
                // 부모 Link 이벤트 버블링 차단
                e.preventDefault();
                e.stopPropagation();
                handleUnblock();
              }}
              disabled={isPending}
              className="cursor-pointer gap-2 text-sm"
            >
              <ShieldCheck className="size-4 text-green-600" aria-hidden />
              <span>ブロックを解除</span>
            </DropdownMenuItem>
          ) : (
            /* ── 차단 항목 → AlertDialog 트리거 ─────────────────── */
            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // DropdownMenu 가 닫힌 뒤 AlertDialog 를 열기 위해 약간 지연
                setIsAlertOpen(true);
              }}
              disabled={isPending}
              className="text-destructive focus:text-destructive cursor-pointer gap-2 text-sm"
            >
              <ShieldBan className="size-4" aria-hidden />
              <span>このユーザーをブロック</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* ── 차단 확인 AlertDialog ──────────────────────────────────────── */}
      {/* isBlocked=false 의 경우에만 렌더링 */}
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent
          // AlertDialog 클릭이 부모 Link 로 버블링되지 않도록
          onClick={(e) => e.stopPropagation()}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>ブロックの確認</AlertDialogTitle>
            <AlertDialogDescription>
              {/* 강제·위협 톤 금지 — CLAUDE.md 규칙 */}
              {targetDisplayName ? (
                <>
                  <span className="font-medium">{targetDisplayName}</span>{" "}
                  さんは今後このサークル・部活動にお問い合わせできなくなります。
                  ブロックはいつでも解除できます。
                </>
              ) : (
                <>
                  このユーザーは今後このサークル・部活動にお問い合わせできなくなります。
                  ブロックはいつでも解除できます。
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending} onClick={(e) => e.stopPropagation()}>
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={(e) => {
                e.stopPropagation();
                handleBlock();
              }}
              className={cn(
                "bg-destructive text-destructive-foreground",
                "hover:bg-destructive/90",
                isPending && "cursor-not-allowed opacity-50"
              )}
            >
              {isPending ? "処理中…" : "ブロックする"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
