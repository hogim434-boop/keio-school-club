"use client";

/**
 * components/admin/claim-review-buttons.tsx
 *
 * 동아리 claim 신청 승인/거부 버튼 (Client Component).
 *
 * ── 동작 ─────────────────────────────────────────────────────────────────────
 * 「承認」 → approveClaimAction RPC 호출 → circles.owner_id 이전 + is_claimed=true
 * 「却下」 → rejectClaimAction RPC 호출 → status='rejected' 기록
 *
 * 각 처리 후 revalidatePath가 /admin/claims 재렌더를 트리거해 목록이 즉시 갱신됨.
 */

import { useTransition } from "react";
import { CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

import { approveClaimAction, rejectClaimAction } from "@/app/admin/claims/actions";
import { Button } from "@/components/ui/button";

interface ClaimReviewButtonsProps {
  /** 처리 대상 circle_claims UUID */
  claimId: string;
}

/**
 * 承認・却下 버튼 쌍.
 * pending 건에만 표시; 이미 처리된 건에는 본 컴포넌트를 렌더하지 않는다.
 */
export function ClaimReviewButtons({ claimId }: ClaimReviewButtonsProps) {
  // useTransition: 각 버튼이 독립적으로 isPending 상태를 가짐
  const [isApprovePending, startApproveTransition] = useTransition();
  const [isRejectPending, startRejectTransition] = useTransition();

  const isAnyPending = isApprovePending || isRejectPending;

  function handleApprove() {
    startApproveTransition(async () => {
      const result = await approveClaimAction(claimId);
      if (!result.ok) {
        toast.error(result.error ?? "承認に失敗しました");
        return;
      }
      toast.success("申請を承認しました。サークル・部活動の管理者が変更されました。");
    });
  }

  function handleReject() {
    startRejectTransition(async () => {
      const result = await rejectClaimAction(claimId);
      if (!result.ok) {
        toast.error(result.error ?? "却下に失敗しました");
        return;
      }
      toast.success("申請を却下しました");
    });
  }

  return (
    <div className="flex items-center gap-2">
      {/* 承認 버튼 */}
      <Button
        type="button"
        size="sm"
        variant="default"
        onClick={handleApprove}
        disabled={isAnyPending}
        className="h-8 gap-1.5 text-xs"
      >
        <CheckCircle className="size-3.5" aria-hidden />
        {isApprovePending ? "処理中…" : "承認"}
      </Button>

      {/* 却下 버튼 */}
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={handleReject}
        disabled={isAnyPending}
        className="text-destructive border-destructive/40 hover:bg-destructive/5 h-8 gap-1.5 text-xs"
      >
        <XCircle className="size-3.5" aria-hidden />
        {isRejectPending ? "処理中…" : "却下"}
      </Button>
    </div>
  );
}
