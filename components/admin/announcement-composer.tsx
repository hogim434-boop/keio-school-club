"use client";

/**
 * components/admin/announcement-composer.tsx
 *
 * 관리자 공개 알림 작성 폼 + 목록 행별 삭제 버튼.
 *
 * 이 파일에서 export 하는 컴포넌트:
 * - AnnouncementComposer: 알림 작성 폼 (type 선택, 제목, 본문, 링크 URL)
 * - AnnouncementDeleteButton: 목록 행 삭제 버튼 (DeleteConfirmDialog 재사용)
 *
 * 의존:
 * - createAnnouncement / deleteAnnouncement — app/admin/announcement-actions.ts
 * - shadcn/ui: Input, Textarea, Button, Badge
 * - sonner: toast
 * - lucide-react: Send, Trash2
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { createAnnouncement, deleteAnnouncement } from "@/app/admin/announcement-actions";

// ── native <select> 공통 스타일 ────────────────────────────────────────────
// shadcn/ui の select コンポーネントはインストールされていないため、
// Input コンポーネントと同一ラインの native select で代替する。
const SELECT_CLS =
  "border-input focus-visible:ring-ring flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50";

// ── 타입 라벨 매핑 ──────────────────────────────────────────────────────────
const TYPE_LABEL: Record<string, string> = {
  event: "イベント",
  notice: "お知らせ",
  new_circle: "新サークル",
};

// ─────────────────────────────────────────────────────────────────────────────
// AnnouncementComposer — 알림 작성 폼
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 공개 알림 작성 폼.
 *
 * - type: event | notice (native <select>)
 * - title: 필수, 100자 이내 (Input)
 * - body: 선택, 1000자 이내 (Textarea)
 * - link_url: 선택 (Input)
 *
 * 제출 성공 → toast.success + 폼 리셋 + router.refresh()
 * 제출 실패 → toast.error
 */
export function AnnouncementComposer() {
  const router = useRouter();

  // 폼 상태
  const [type, setType] = useState<"event" | "notice">("notice");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [isPending, setIsPending] = useState(false);

  // 제목이 비어있으면 투고 버튼 비활성
  const canSubmit = title.trim().length > 0 && !isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setIsPending(true);
    try {
      const result = await createAnnouncement({
        type,
        title: title.trim(),
        body: body || undefined,
        link_url: linkUrl || undefined,
      });

      if (!result.ok) {
        toast.error(result.error ?? "投稿に失敗しました");
        return;
      }

      // 성공: 토스트 + 폼 리셋 + RSC 재렌더
      toast.success("お知らせを投稿しました");
      setType("notice");
      setTitle("");
      setBody("");
      setLinkUrl("");
      router.refresh();
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-card space-y-4 rounded-xl border p-4 shadow-sm">
      <h2 className="text-foreground text-sm font-semibold">新規お知らせ作成</h2>

      {/* 타입 선택 — native <select> */}
      <div className="space-y-1.5">
        <Label htmlFor="ann-type">種別</Label>
        <select
          id="ann-type"
          value={type}
          onChange={(e) => setType(e.target.value as "event" | "notice")}
          disabled={isPending}
          className={SELECT_CLS}
        >
          <option value="notice">お知らせ</option>
          <option value="event">イベント</option>
        </select>
      </div>

      {/* 제목 — 필수 */}
      <div className="space-y-1.5">
        <Label htmlFor="ann-title">
          タイトル
          <span className="text-destructive ml-0.5">*</span>
        </Label>
        <Input
          id="ann-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="例: 学園祭の出展についてのお知らせ"
          maxLength={100}
          disabled={isPending}
          aria-required
        />
        {/* 글자 수 카운터 — 80자 초과 시 황색 경고 */}
        <p
          className={cn(
            "text-right text-xs",
            title.length > 80 ? "text-yellow-500" : "text-muted-foreground"
          )}
        >
          {title.length} / 100
        </p>
      </div>

      {/* 본문 — 선택 */}
      <div className="space-y-1.5">
        <Label htmlFor="ann-body">本文（任意）</Label>
        <Textarea
          id="ann-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="詳細を入力してください（省略可）"
          maxLength={1000}
          disabled={isPending}
          className="min-h-24 resize-none"
        />
        {body.length > 0 && (
          <p
            className={cn(
              "text-right text-xs",
              body.length > 900 ? "text-yellow-500" : "text-muted-foreground"
            )}
          >
            {body.length} / 1000
          </p>
        )}
      </div>

      {/* 링크 URL — 선택 */}
      <div className="space-y-1.5">
        <Label htmlFor="ann-link">リンクURL（任意）</Label>
        <Input
          id="ann-link"
          type="url"
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
          placeholder="https://example.com"
          disabled={isPending}
        />
      </div>

      {/* 제출 버튼 */}
      <div className="flex justify-end">
        <Button type="submit" disabled={!canSubmit} className="gap-2">
          <Send className="size-4" aria-hidden />
          {isPending ? "投稿中..." : "投稿する"}
        </Button>
      </div>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AnnouncementDeleteButton — 목록 행 삭제 버튼
// ─────────────────────────────────────────────────────────────────────────────

interface AnnouncementDeleteButtonProps {
  /** 삭제 대상 announcement UUID */
  id: string;
  /** 확인 다이얼로그에 표시할 제목 */
  title: string;
}

/**
 * 목록 행 우측에 배치되는 삭제 버튼.
 * 클릭 → DeleteConfirmDialog 열림 → 확인 → deleteAnnouncement 호출
 * 성공: toast.success + router.refresh()
 * 실패: toast.error
 */
export function AnnouncementDeleteButton({ id, title }: AnnouncementDeleteButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  async function handleConfirm() {
    setIsPending(true);
    try {
      const result = await deleteAnnouncement(id);
      if (!result.ok) {
        toast.error(result.error ?? "削除に失敗しました");
        return;
      }
      toast.success("削除しました");
      setOpen(false);
      router.refresh();
    } finally {
      setIsPending(false);
    }
  }

  return (
    <>
      {/* 삭제 버튼 — 아이콘만, ghost + destructive 색상 */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`「${title}」を削除`}
        className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-md p-1.5 transition-colors"
      >
        <Trash2 className="size-4" aria-hidden />
      </button>

      {/* 삭제 확인 다이얼로그 */}
      <DeleteConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={<>「{title}」を削除しますか?</>}
        description="この操作は取り消せません。削除後は一般ユーザーの通知ページにも表示されなくなります。"
        confirmLabel="削除する"
        isLoading={isPending}
        onConfirm={handleConfirm}
      />
    </>
  );
}

// TYPE_LABEL を外部(page.tsx)からも参照できるようエクスポート
export { TYPE_LABEL };
