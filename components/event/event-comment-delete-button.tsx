"use client";

/**
 * components/event/event-comment-delete-button.tsx
 *
 * コメント削除ボタン Client Component (T-022).
 *
 * - 「削除」 텍스트 버튼 → AlertDialog 확인 → deleteEventComment Server Action 호출.
 * - RLS 에서 본인/admin 만 삭제 가능 보장 → 여기선 낙관적으로 호출만.
 * - 삭제 성공 시 router.refresh() 로 Server Component 재렌더.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { deleteEventComment } from "@/app/events/[id]/actions";

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface CommentDeleteButtonProps {
  /** 삭제할 댓글 UUID */
  commentId: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 컴포넌트
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 댓글 삭제 버튼.
 *
 * 사용 패턴 (activity-reports-list.tsx 의 DeleteConfirmDialog 패턴 그대로):
 * - 텍스트 버튼 클릭 → AlertDialog open
 * - 「削除する」 확정 → deleteEventComment() → router.refresh()
 */
export function CommentDeleteButton({ commentId }: CommentDeleteButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const result = await deleteEventComment(commentId);

      if (!result.ok) {
        toast.error(result.error ?? "削除に失敗しました");
        return;
      }

      toast.success("削除しました");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      {/* 削除 텍스트 버튼 */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-muted-foreground hover:text-destructive flex items-center gap-1 text-xs transition-colors focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none"
        aria-label="このコメントを削除"
      >
        <Trash2 className="size-3" aria-hidden="true" />
        削除
      </button>

      {/* 삭제 확인 AlertDialog */}
      <DeleteConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="このコメントを削除しますか？"
        description="この操作は取り消せません。コメントは完全に削除されます。"
        onConfirm={handleConfirm}
        isLoading={isPending}
      />
    </>
  );
}
