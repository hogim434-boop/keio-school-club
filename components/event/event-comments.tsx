/**
 * components/event/event-comments.tsx
 *
 * イベントコメント目録 Server Component (T-022).
 *
 * 렌더 구조:
 *  <section>
 *    <h2> コメント・質問 (n件) </h2>
 *    <EventCommentCompose />  ← 최상위 댓글 작성 폼 (Client)
 *    <ul>
 *      {parents.map(parent =>
 *        <CommentCard parent={parent}>
 *          {parent.children.map(child =>
 *            <ReplyCard child />  ← indent 처리
 *          )}
 *          {isTopLevel && <ReplyComposeInline />}  ← 답글 폼 (Client)
 *        </CommentCard>
 *      )}
 *    </ul>
 *  </section>
 *
 * 데이터 취득:
 * - getEventComments(eventId): unstable_cache, tags:["events:comments"]
 * - createClient(): 현재 로그인 사용자 확인 (삭제 버튼 표시용)
 *
 * 로그인 상태:
 * - getClaims() 로 currentUserId 확인 → EventCommentCompose 에 전달.
 * - 삭제 버튼: user_id === currentUserId 인 댓글만 표시.
 */

import { MessageSquare } from "lucide-react";

import { getEventComments } from "@/lib/supabase/queries/event-comments";
import { createClient } from "@/lib/supabase/server";
import { formatJst } from "@/lib/format/jst";
import type { EventComment } from "@/lib/types/domain";
import { EventCommentCompose } from "./event-comment-compose";
import { CommentDeleteButton } from "./event-comment-delete-button";
import { ReplyComposeToggle } from "./event-comment-reply-toggle";

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface EventCommentsProps {
  /** 댓글을 표시할 이벤트 UUID */
  eventId: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 메인 Server Component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 이벤트 댓글 섹션.
 *
 * - 현재 로그인 사용자 정보 취득 (삭제 버튼 표시 판정)
 * - getEventComments 로 parent/children nest 목록 취득
 * - 0건: 빈 상태 안내 + 작성 폼
 * - n건: 작성 폼 + 댓글 목록
 */
export async function EventComments({ eventId }: EventCommentsProps) {
  // 로그인 사용자 확인 — 에러 시 null 로 처리 (미로그인 취급)
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const currentUserId = (claimsData?.claims?.sub as string | undefined) ?? null;

  // 댓글 목록 취득
  const comments = await getEventComments(eventId);

  // 전체 댓글 수 (parent + children 합산)
  const totalCount = comments.reduce(
    (sum, c) => sum + 1 + (c.children?.length ?? 0),
    0
  );

  return (
    <section className="border-t pt-6 pb-4" aria-label="コメント・質問">
      {/* ── 섹션 헤더 ────────────────────────────────────────────────────── */}
      <div className="mb-4 flex items-center gap-2">
        <MessageSquare className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
        <h2 className="text-sm font-semibold">
          コメント・質問
          {totalCount > 0 && (
            <span className="text-muted-foreground ml-1.5 font-normal">
              ({totalCount}件)
            </span>
          )}
        </h2>
      </div>

      {/* ── 최상위 댓글 작성 폼 ─────────────────────────────────────────── */}
      <div className="mb-5">
        <EventCommentCompose
          eventId={eventId}
          parentId={null}
          currentUserId={currentUserId}
        />
      </div>

      {/* ── 댓글 목록 ───────────────────────────────────────────────────── */}
      {comments.length === 0 ? (
        /* 빈 상태 */
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <MessageSquare className="text-muted-foreground/40 size-10" aria-hidden="true" />
          <p className="text-muted-foreground text-sm">
            まだコメントはありません。
            <br />
            最初のコメントを投稿してみましょう！
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-4" aria-label="コメント一覧">
          {comments.map((parent) => (
            <ParentCommentCard
              key={parent.id}
              comment={parent}
              eventId={eventId}
              currentUserId={currentUserId}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 최상위 댓글 카드
// ─────────────────────────────────────────────────────────────────────────────

interface ParentCommentCardProps {
  comment: EventComment;
  eventId: string;
  currentUserId: string | null;
}

/**
 * 최상위 댓글 카드.
 *
 * 레이아웃:
 * - 아바타 이니셜 원 + 우측 본문 영역
 * - 본문 하단: 작성 시각 + 「返信」 버튼 (답글 1단계만)
 * - children 있을 경우: 좌측 indent (pl-8) 에 답글 카드 렌더
 * - 「返信」 버튼은 parent 댓글(parent_id===null)에만 표시 (1단계 제한)
 */
function ParentCommentCard({ comment, eventId, currentUserId }: ParentCommentCardProps) {
  const initials = getInitials(comment.author_display_name);
  const timeLabel = formatJst(comment.created_at, "M月d日 HH:mm");

  return (
    <li>
      <div className="flex gap-3">
        {/* 아바타 이니셜 원 */}
        <div
          className="bg-keio-navy/10 text-keio-navy flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
          aria-hidden="true"
        >
          {initials}
        </div>

        {/* 우측 콘텐츠 */}
        <div className="min-w-0 flex-1">
          {/* 작성자 + 시각 */}
          <div className="mb-1 flex items-baseline gap-2">
            <span className="text-sm font-semibold">
              {comment.author_display_name ?? "匿名"}
            </span>
            <time
              className="text-muted-foreground text-xs"
              dateTime={comment.created_at}
            >
              {timeLabel}
            </time>
          </div>

          {/* 본문 */}
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {comment.body}
          </p>

          {/* 액션 바: 返信 버튼 + 削除 버튼 */}
          <div className="mt-1.5 flex items-center gap-3">
            {/*
             * 「返信」 버튼 — 이 댓글은 parent (parent_id===null) 이므로 답글 허용.
             * ReplyComposeToggle: Client Component — 클릭 시 인라인 폼 토글.
             */}
            <ReplyComposeToggle
              eventId={eventId}
              parentId={comment.id}
              parentAuthor={comment.author_display_name}
              currentUserId={currentUserId}
            />

            {/* 본인 댓글 삭제 버튼 */}
            {currentUserId && currentUserId === comment.user_id && (
              <CommentDeleteButton commentId={comment.id} />
            )}
          </div>
        </div>
      </div>

      {/* ── 답글 목록 (indent) ─────────────────────────────────────────── */}
      {comment.children && comment.children.length > 0 && (
        <ul
          className="mt-3 flex flex-col gap-3 pl-11"
          aria-label={`${comment.author_display_name ?? "コメント"}への返信`}
        >
          {comment.children.map((child) => (
            <ReplyCard
              key={child.id}
              comment={child}
              currentUserId={currentUserId}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 답글 카드 (children)
// ─────────────────────────────────────────────────────────────────────────────

interface ReplyCardProps {
  comment: EventComment;
  currentUserId: string | null;
}

/**
 * 답글 카드 (1단계).
 *
 * - parent_id 가 있는 댓글 → 「返信」 버튼 없음 (2단계 차단).
 * - 본인 댓글은 삭제 버튼 표시.
 */
function ReplyCard({ comment, currentUserId }: ReplyCardProps) {
  const initials = getInitials(comment.author_display_name);
  const timeLabel = formatJst(comment.created_at, "M月d日 HH:mm");

  return (
    <li className="flex gap-2.5">
      {/* 아바타 (답글용 — 살짝 작게) */}
      <div
        className="bg-muted text-muted-foreground flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
        aria-hidden="true"
      >
        {initials}
      </div>

      {/* 우측 콘텐츠 */}
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 flex items-baseline gap-2">
          <span className="text-sm font-semibold">
            {comment.author_display_name ?? "匿名"}
          </span>
          <time
            className="text-muted-foreground text-xs"
            dateTime={comment.created_at}
          >
            {timeLabel}
          </time>
        </div>

        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
          {comment.body}
        </p>

        {/* 본인 답글 삭제 버튼 */}
        {currentUserId && currentUserId === comment.user_id && (
          <div className="mt-1">
            <CommentDeleteButton commentId={comment.id} />
          </div>
        )}
      </div>
    </li>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 유틸리티
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 표시명에서 아바타 이니셜 추출.
 * - 일본어 이름 → 첫 글자
 * - 영어 이름 → 첫 글자 대문자
 * - null → "?"
 */
function getInitials(name: string | null): string {
  if (!name) return "?";
  return name.charAt(0).toUpperCase();
}
