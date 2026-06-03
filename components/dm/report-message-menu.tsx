"use client";

/**
 * components/dm/report-message-menu.tsx
 *
 * メッセージ通報メニュー (Client Component).
 *
 * ── 用途 ─────────────────────────────────────────────────────────────────────
 * DM スレッド内の各メッセージ（相手メッセージのみ）に付属するドロップダウンメニュー。
 * 「報告する」をクリックすると通報理由入力ダイアログが開き、送信すると
 * inquiry_reports テーブルに INSERT される。
 *
 * ── 表示条件 ─────────────────────────────────────────────────────────────────
 * 本人メッセージには付けない (dm-thread.tsx 側で isMine=true の場合は非表示)。
 * 運営者・一般ユーザー問わず、相手メッセージに対して通報可能。
 *
 * ── UX フロー ─────────────────────────────────────────────────────────────────
 * DropdownMenu「…」ボタン → 「報告する」クリック → Dialog open
 * → Textarea で理由入力 → 送信 → useTransition pending 中は Disabled
 * → 成功: toast「報告を受け付けました」 / 失敗: toast エラー
 *
 * ── カピールール ──────────────────────────────────────────────────────────────
 * 日本語 UI. 禁止語(公認/公式LINEに参加/必ず) 使用禁止.
 * 団体名称はサークル・部活動 併記.
 */

import { useState, useTransition } from "react";
import { Flag } from "lucide-react";
import { toast } from "sonner";

import { reportMessage } from "@/app/circles/[id]/dm/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface ReportMessageMenuProps {
  /** 신고 대상 메시지가 속한 inquiry UUID */
  inquiryId: string;
  /** 신고 대상 메시지 UUID */
  messageId: string;
  /** 추가 스타일 클래스 */
  className?: string;
}

/** 통보 이유 최대 글자수 */
const MAX_REASON_LENGTH = 500;

/**
 * メッセージ通報メニューコンポーネント.
 *
 * 「…」ドロップダウン → 「報告する」 → 通報理由ダイアログ → 送信.
 */
export function ReportMessageMenu({ inquiryId, messageId, className }: ReportMessageMenuProps) {
  // Dialog 개폐 상태
  const [dialogOpen, setDialogOpen] = useState(false);
  // 신고 사유 텍스트
  const [reason, setReason] = useState("");
  // 전송 중 pending 상태 (useTransition)
  const [isPending, startTransition] = useTransition();

  /**
   * 다이얼로그를 닫고 상태를 초기화한다.
   * 전송 중에는 닫기 불가(isPending 시 버튼 비활성화).
   */
  function handleClose() {
    if (isPending) return;
    setDialogOpen(false);
    setReason("");
  }

  /**
   * 신고 제출 핸들러.
   * reportMessage Server Action 을 호출하고 결과에 따라 toast 를 표시한다.
   */
  function handleSubmit() {
    const trimmed = reason.trim();
    if (!trimmed) {
      toast.error("通報理由を入力してください");
      return;
    }

    startTransition(async () => {
      const result = await reportMessage(inquiryId, messageId, trimmed);

      if (result && "error" in result) {
        // 실패: 에러 토스트 표시
        toast.error(result.error);
        return;
      }

      // 성공: 다이얼로그 닫기 + 성공 토스트
      setDialogOpen(false);
      setReason("");
      toast.success("報告を受け付けました");
    });
  }

  return (
    <>
      {/* ── ドロップダウンメニュートリガー「…」ボタン ──────────────────── */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="メッセージオプション"
            className={cn(
              // 通常は透明、hover/focus 時に表示
              "flex size-6 shrink-0 items-center justify-center rounded-full",
              "text-muted-foreground/0 transition-colors",
              "hover:bg-muted hover:text-muted-foreground",
              "focus-visible:bg-muted focus-visible:text-muted-foreground focus-visible:outline-none",
              "group-hover:text-muted-foreground",
              className
            )}
          >
            {/* 点3つ(縦) アイコン代替 — lucide MoreVertical が小さいため text で代用 */}
            <span className="text-[10px] leading-none tracking-tight">•••</span>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-36">
          <DropdownMenuItem
            onSelect={() => setDialogOpen(true)}
            className="text-destructive focus:text-destructive cursor-pointer gap-2"
          >
            <Flag className="size-3.5" aria-hidden />
            報告する
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* ── 通報理由入力ダイアログ ────────────────────────────────────── */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) handleClose();
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>メッセージを報告する</DialogTitle>
            <DialogDescription>
              不適切な内容・迷惑行為と思われる場合はご報告ください。
              内容を確認し、適切に対応いたします。
            </DialogDescription>
          </DialogHeader>

          {/* 신고 사유 입력 영역 */}
          <div className="space-y-2">
            <Label htmlFor="report-reason">
              報告理由
              <span className="text-destructive ml-1" aria-hidden>
                *
              </span>
            </Label>
            <Textarea
              id="report-reason"
              placeholder="どのような問題があるか、具体的にご記入ください（迷惑行為・ハラスメント・スパムなど）"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              maxLength={MAX_REASON_LENGTH}
              disabled={isPending}
              className="resize-none"
              aria-describedby="report-reason-count"
            />
            {/* 글자수 카운터 */}
            <p
              id="report-reason-count"
              className={cn(
                "text-right text-xs",
                reason.length > MAX_REASON_LENGTH * 0.9
                  ? "text-destructive"
                  : "text-muted-foreground"
              )}
            >
              {reason.length} / {MAX_REASON_LENGTH}
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
              キャンセル
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleSubmit}
              disabled={isPending || reason.trim().length === 0}
            >
              {isPending ? "送信中…" : "報告する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
