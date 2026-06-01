"use client";

/**
 * components/event/event-cancel-dialog.tsx
 *
 * イベント中止ダイアログ (T-025 산출물).
 *
 * 역할:
 * - 「イベントを中止する」 버튼 클릭 → AlertDialog 표시
 * - 취소 사유 Textarea 입력 (필수, 최대 500자)
 * - 「中止する」 확인 → cancelEvent Server Action 호출
 * - 성공 시 toast + router.refresh()
 * - 실패 시 오류 toast
 *
 * 설계:
 * - shadcn/ui AlertDialog + Textarea 조합
 * - useTransition 으로 pending 상태 관리 (버튼 disabled + Loader2 아이콘)
 * - 이미 취소된 이벤트(isCancelled=true) 이면 버튼 비활성화
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, Loader2 } from "lucide-react";

import { cancelEvent } from "@/app/circles/[id]/events/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// ─────────────────────────────────────────────────────────────────────────────
//  타입
// ─────────────────────────────────────────────────────────────────────────────

interface EventCancelDialogProps {
  eventId: string;
  circleId: string;
  eventTitle: string;
  /** true 이면 이미 취소된 이벤트 — 버튼 비활성화 */
  isCancelled: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
//  컴포넌트
// ─────────────────────────────────────────────────────────────────────────────

/**
 * イベント中止ダイアログ.
 *
 * AlertDialog 내부에 취소 사유 Textarea 를 삽입.
 * AlertDialogAction 의 기본 동작(close)을 막고 Server Action 호출 후 수동으로 닫는다.
 */
export function EventCancelDialog({
  eventId,
  circleId,
  eventTitle,
  isCancelled,
}: EventCancelDialogProps) {
  const router = useRouter();

  // 다이얼로그 열림 상태 (수동 제어 — Action 완료 후 닫기 위해)
  const [open, setOpen] = useState(false);
  // 취소 사유 입력값
  const [reason, setReason] = useState("");
  // Server Action pending 상태
  const [isPending, startTransition] = useTransition();

  // ── 취소 실행 핸들러 ──────────────────────────────────────────────────────
  function handleCancel() {
    // 빈 사유 방어 (AlertDialogAction 클릭 시 실행)
    if (!reason.trim()) {
      toast.error("中止理由を入力してください");
      return;
    }

    startTransition(async () => {
      const result = await cancelEvent(eventId, circleId, reason);

      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      // 성공
      toast.success(
        result.notifiedCount > 0
          ? `イベントを中止しました。${result.notifiedCount}名に通知を送信しました。`
          : "イベントを中止しました。"
      );

      setOpen(false);
      setReason(""); // 사유 초기화
      // 관리 페이지 데이터 최신화 (Server Component 재렌더)
      router.refresh();
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {/* 이미 취소된 이벤트이면 버튼 비활성화 */}
        <Button
          variant="destructive"
          size="sm"
          disabled={isCancelled}
          className="gap-2"
        >
          <AlertTriangle className="size-4" aria-hidden />
          {isCancelled ? "中止済み" : "イベントを中止する"}
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="text-destructive size-5" aria-hidden />
            イベントを中止しますか？
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              {/* 이벤트 제목 강조 */}
              <p>
                <span className="font-semibold text-foreground">「{eventTitle}」</span>
                を中止します。この操作は取り消せません。
              </p>
              <p>
                申込者全員に中止通知が送信されます。
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* 취소 사유 입력 영역 */}
        <div className="space-y-2 py-2">
          <Label htmlFor="cancel-reason" className="text-sm font-medium">
            中止理由
            <span className="text-destructive ml-1">*</span>
          </Label>
          <Textarea
            id="cancel-reason"
            placeholder="例: 会場の都合により中止となりました。"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            rows={3}
            className="resize-none"
            // 처리 중에는 입력 비활성화
            disabled={isPending}
          />
          {/* 글자 수 카운터 */}
          <p className="text-muted-foreground text-right text-xs">
            {reason.length} / 500
          </p>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>キャンセル</AlertDialogCancel>
          {/*
           * AlertDialogAction 의 기본 닫힘 동작을 preventDefault 로 막고
           * Server Action 완료 후 수동으로 setOpen(false) 한다.
           */}
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault(); // 기본 닫힘 방지
              handleCancel();
            }}
            disabled={isPending || !reason.trim()}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
          >
            {isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {isPending ? "処理中..." : "中止する"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
