"use client";

/**
 * components/event/event-comment-reply-toggle.tsx
 *
 * 「返信」 버튼 토글 Client Component (T-022).
 *
 * - 버튼 클릭 → 인라인 EventCommentCompose (답글 모드) 표시.
 * - 「キャンセル」 또는 투고 성공 → 폼 닫힘.
 * - 이 컴포넌트는 최상위 댓글(parent_id===null) 카드에만 마운트된다.
 *   답글(child) 카드에는 마운트하지 않아 2단계 답글 UI 차단.
 *
 * 미로그인 시: EventCommentCompose 내부에서 로그인 유도 링크 표시.
 */

import { useState } from "react";
import { CornerDownRight } from "lucide-react";

import { EventCommentCompose } from "./event-comment-compose";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface ReplyComposeToggleProps {
  /** 답글을 달 이벤트 UUID */
  eventId: string;
  /** 답글 대상 (parent) 댓글 UUID */
  parentId: string;
  /** 답글 대상 작성자 표시명 */
  parentAuthor: string | null;
  /** 현재 로그인 사용자 ID (null=미로그인) */
  currentUserId: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 컴포넌트
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 返信 버튼 + 인라인 폼 토글.
 *
 * 「返信」 버튼 클릭 → EventCommentCompose(답글 모드) 를 바로 아래에 인라인 표시.
 * 투고 성공(router.refresh 트리거) 또는 취소 클릭 시 폼 닫힘.
 */
export function ReplyComposeToggle({
  eventId,
  parentId,
  parentAuthor,
  currentUserId,
}: ReplyComposeToggleProps) {
  const [isOpen, setIsOpen] = useState(false);

  function handleCancel() {
    setIsOpen(false);
  }

  return (
    <div className="w-full">
      {/* 「返信」 버튼 */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-label="返信する"
        className={cn(
          "flex items-center gap-1 text-xs transition-colors",
          "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
          isOpen
            ? "text-keio-navy font-medium"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <CornerDownRight className="size-3.5" aria-hidden="true" />
        返信
      </button>

      {/* 인라인 답글 폼 — 토글 */}
      {isOpen && (
        <div className="mt-2 pl-1">
          <EventCommentCompose
            eventId={eventId}
            parentId={parentId}
            parentAuthor={parentAuthor}
            onCancelReply={handleCancel}
            currentUserId={currentUserId}
          />
        </div>
      )}
    </div>
  );
}
