"use client";

/**
 * components/event/event-comment-compose.tsx
 *
 * イベントコメント入力 Client Component (T-022).
 *
 * 기능:
 * - textarea + 「投稿する」 버튼으로 구성된 인라인 입력 폼.
 * - parentId 가 있을 경우: 「返信先」 칩을 상단에 표시하고 취소 버튼 제공.
 * - 미로그인 시: 비활성 textarea + 「ログインしてコメントする」 안내 링크 표시.
 * - createEventComment Server Action 호출 후 성공 시 textarea 리셋 + router.refresh().
 *
 * 제약:
 * - 본문 1~1000자 (클라이언트 단 길이 표시 + 서버 단 검증 이중).
 * - 빈 문자열 제출 차단.
 */

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CornerDownRight, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { createEventComment } from "@/app/events/[id]/actions";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// 스타일 상수
// ─────────────────────────────────────────────────────────────────────────────

/** textarea 스타일 — report-compose-sheet.tsx 의 TEXTAREA_CLS 계열 */
const TEXTAREA_CLS =
  "w-full rounded-xl border-0 bg-neutral-100 text-sm resize-none " +
  "px-3 py-2.5 min-h-[80px] transition-colors placeholder:text-muted-foreground " +
  "focus-visible:outline-none focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-keio-navy/40 " +
  "disabled:opacity-50 disabled:cursor-not-allowed";

/** 최대 입력 글자 수 */
const MAX_BODY = 1000;

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface EventCommentComposeProps {
  /** 댓글을 달 이벤트 UUID */
  eventId: string;
  /**
   * 답글 대상 댓글 UUID.
   * - null → 최상위 댓글 작성
   * - UUID → 해당 댓글의 1단계 답글
   */
  parentId: string | null;
  /**
   * 답글 작성자 표시명 (「返信先: ○○さん」 칩에 표시).
   * parentId 가 null 이면 미사용.
   */
  parentAuthor?: string | null;
  /**
   * 답글 모드 취소 콜백 — 부모 컴포넌트에서 parentId 를 null 로 되돌림.
   * parentId 가 null 이면 미사용.
   */
  onCancelReply?: () => void;
  /**
   * 현재 로그인한 사용자 ID.
   * - null 이면 미로그인 → 비활성 폼 + 로그인 유도 링크 표시.
   */
  currentUserId: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 컴포넌트
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 댓글·답글 입력 폼.
 *
 * useTransition 으로 Server Action 호출 중 UI freeze 방지.
 * 성공 시 textarea 리셋 + router.refresh() 로 Server Component 재렌더 트리거.
 */
export function EventCommentCompose({
  eventId,
  parentId,
  parentAuthor,
  onCancelReply,
  currentUserId,
}: EventCommentComposeProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [body, setBody] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /** 미로그인 여부 */
  const isLoggedOut = currentUserId === null;

  /** 제출 버튼 활성 조건: 로그인 + 1자 이상 + pending 아님 */
  const canSubmit = !isLoggedOut && body.trim().length > 0 && !isPending;

  // ── 제출 핸들러 ──────────────────────────────────────────────────────────

  function handleSubmit() {
    if (!canSubmit) return;

    startTransition(async () => {
      const result = await createEventComment(eventId, body, parentId);

      if (!result.ok) {
        toast.error(result.error ?? "投稿に失敗しました");
        return;
      }

      // 성공 — 폼 리셋 + 답글 모드 해제 + 목록 갱신
      setBody("");
      onCancelReply?.();
      router.refresh();
    });
  }

  // ── 키보드 단축키: Cmd/Ctrl+Enter 로 제출 ───────────────────────────────

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 렌더
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-2">
      {/*
       * ── 답글 모드 칩 ───────────────────────────────────────────────────
       * parentId 가 있을 때만 「返信先: ○○さん」 + 취소(×) 버튼 표시.
       */}
      {parentId && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CornerDownRight className="size-3.5 shrink-0" aria-hidden="true" />
          <span>
            返信先: <span className="font-medium">{parentAuthor ?? "コメント"}</span>
          </span>
          {onCancelReply && (
            <button
              type="button"
              onClick={onCancelReply}
              aria-label="返信をキャンセル"
              className={cn(
                "ml-auto flex size-5 items-center justify-center rounded-full",
                "text-muted-foreground hover:bg-muted transition-colors",
                "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none"
              )}
            >
              <X className="size-3" aria-hidden="true" />
            </button>
          )}
        </div>
      )}

      {/*
       * ── textarea ────────────────────────────────────────────────────────
       * 미로그인 시 disabled + placeholder 로 로그인 유도.
       */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={MAX_BODY}
          disabled={isLoggedOut || isPending}
          placeholder={
            isLoggedOut
              ? "コメントするにはログインが必要です"
              : parentId
                ? "返信を入力…（⌘+Enter で投稿）"
                : "コメント・質問を入力…（⌘+Enter で投稿）"
          }
          aria-label={parentId ? "返信を入力" : "コメントを入力"}
          className={cn(TEXTAREA_CLS, isPending && "opacity-60")}
          rows={3}
        />

        {/* 글자 수 카운터 — 입력 시작 후 우하단에 표시 */}
        {body.length > 0 && (
          <span
            className={cn(
              "absolute right-2.5 bottom-2 text-[10px] tabular-nums",
              body.length >= MAX_BODY
                ? "text-red-500"
                : "text-muted-foreground"
            )}
            aria-live="polite"
          >
            {body.length}/{MAX_BODY}
          </span>
        )}
      </div>

      {/*
       * ── 하단 액션 영역 ──────────────────────────────────────────────────
       * 미로그인: 「ログインしてコメントする」 링크
       * 로그인:   「投稿する」 버튼 (우측 정렬)
       */}
      {isLoggedOut ? (
        <a
          href={`/auth/login?next=${encodeURIComponent(`/events/${eventId}`)}`}
          className={cn(
            "w-full rounded-xl py-2.5 text-center text-sm font-medium",
            "bg-keio-navy text-white transition-opacity hover:opacity-90",
            "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none"
          )}
        >
          ログインしてコメントする
        </a>
      ) : (
        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={cn(
              "min-w-[96px] transition-colors",
              canSubmit
                ? "bg-keio-navy hover:bg-keio-navy/90 text-white"
                : "bg-muted text-muted-foreground"
            )}
            aria-label={isPending ? "投稿中..." : "投稿する"}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-1.5 size-3.5 animate-spin" aria-hidden="true" />
                投稿中...
              </>
            ) : (
              "投稿する"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
