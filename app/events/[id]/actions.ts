"use server";

/**
 * app/events/[id]/actions.ts
 *
 * 이벤트 RSVP + 댓글 관련 Server Actions.
 *
 * - setLightInterest:    light 모드 — event_interests 테이블에 upsert/delete (T-015)
 * - setStrictRsvp:      strict 모드 — event_rsvps 테이블에 upsert (T-015)
 * - createEventComment: 댓글 투고 (T-022)
 * - deleteEventComment: 댓글 삭제 (T-022)
 *
 * 공통 원칙:
 * - 미로그인 시 에러 반환 (클라이언트에서 /auth/login?next=/events/{id} 로 redirect)
 * - show_profile DEFAULT false 유지 (PRD 안티패턴 A-3)
 * - revalidateTag 로 캐시 무효화
 *
 * [Next.js 16 호환] revalidateTag 두 번째 인수 profile 필수 — "max" 사용 (즉시 무효화).
 */

import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// ─────────────────────────────────────────────────────────────────────────────
// 반환 타입
// ─────────────────────────────────────────────────────────────────────────────

export interface RsvpActionResult {
  /** 성공 여부 */
  ok: boolean;
  /** 오류 메시지 (ok=false 일 때) */
  error?: string;
  /** 변경 후 상태 (ok=true 일 때, null=삭제됨) */
  status?: string | null;
}

/** 댓글 작성·삭제 액션의 공통 반환 타입 */
export interface CommentActionResult {
  ok: boolean;
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// light 모드 — event_interests
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 気軽に参加モード (light) の参加意思表明 — event_interests upsert/delete.
 *
 * 동작 규칙:
 * - nextStatus 가 현재와 같으면 → DELETE (토글 해제)
 * - 다르면 → UPSERT (status 변경 또는 신규 등록)
 *
 * status 허용값: "interested" (気になる) / "going" (行く予定)
 *
 * @param eventId   - 대상 이벤트 UUID
 * @param nextStatus - 사용자가 선택한 status ("interested" | "going" | null = 해제)
 */
export async function setLightInterest(
  eventId: string,
  nextStatus: "interested" | "going" | null
): Promise<RsvpActionResult> {
  const supabase = await createClient();

  // 로그인 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "unauthenticated" };
  }

  // nextStatus=null → 행 삭제 (참가 의사 취소)
  if (nextStatus === null) {
    const { error } = await supabase
      .from("event_interests")
      .delete()
      .eq("event_id", eventId)
      .eq("user_id", user.id);

    if (error) {
      console.error("[setLightInterest] delete error:", error.message);
      return { ok: false, error: error.message };
    }

    // Next.js 16: revalidateTag 두 번째 인수 profile 필수
    revalidateTag("events:public", "max");
    return { ok: true, status: null };
  }

  // UPSERT — 이미 같은 status 면 클라이언트에서 null 로 호출하므로 여기선 항상 변경
  const { error } = await supabase.from("event_interests").upsert(
    {
      event_id: eventId,
      user_id: user.id,
      status: nextStatus,
      show_profile: false, // DEFAULT false 유지
    },
    {
      onConflict: "event_id,user_id",
    }
  );

  if (error) {
    console.error("[setLightInterest] upsert error:", error.message);
    return { ok: false, error: error.message };
  }

  revalidateTag("events:public", "max");
  return { ok: true, status: nextStatus };
}

// ─────────────────────────────────────────────────────────────────────────────
// strict 모드 — event_rsvps
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 定員制モード (strict) の RSVP — event_rsvps upsert/delete.
 *
 * 동작 규칙:
 * - nextStatus=null → DELETE (참가 취소)
 * - requires_approval=true + nextStatus="going" → status="pending" 으로 저장
 *   (DB BEFORE 트리거가 pending→going 승인 시 정원 초과면 waiting 으로 변경)
 * - requires_approval=false + nextStatus="going" → status="going" 직접 저장
 *   (T-023 트리거가 정원 초과 시 자동으로 waiting 으로 변경)
 * - "maybe" / "declined" → 그대로 저장
 *
 * status 허용값: "going" | "maybe" | "declined" | "pending"
 *
 * @param eventId          - 대상 이벤트 UUID
 * @param nextStatus        - 사용자가 선택한 status (null=취소)
 * @param requiresApproval  - 사전 승인 필요 여부
 */
export async function setStrictRsvp(
  eventId: string,
  nextStatus: "going" | "maybe" | "declined" | null,
  requiresApproval: boolean
): Promise<RsvpActionResult> {
  const supabase = await createClient();

  // 로그인 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "unauthenticated" };
  }

  // nextStatus=null → 행 삭제 (RSVP 취소)
  if (nextStatus === null) {
    const { error } = await supabase
      .from("event_rsvps")
      .delete()
      .eq("event_id", eventId)
      .eq("user_id", user.id);

    if (error) {
      console.error("[setStrictRsvp] delete error:", error.message);
      return { ok: false, error: error.message };
    }

    revalidateTag("events:public", "max");
    return { ok: true, status: null };
  }

  // requires_approval=true 이고 "going" 선택 시 → pending 으로 저장
  // 나머지는 그대로 (maybe, declined)
  const actualStatus =
    nextStatus === "going" && requiresApproval ? "pending" : nextStatus;

  const { error } = await supabase.from("event_rsvps").upsert(
    {
      event_id: eventId,
      user_id: user.id,
      status: actualStatus,
      show_profile: false, // DEFAULT false 유지
    },
    {
      onConflict: "event_id,user_id",
    }
  );

  if (error) {
    console.error("[setStrictRsvp] upsert error:", error.message);
    return { ok: false, error: error.message };
  }

  revalidateTag("events:public", "max");
  return { ok: true, status: actualStatus };
}

// ─────────────────────────────────────────────────────────────────────────────
// 이벤트 댓글 (T-022)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * コメント投稿 — event_comments INSERT.
 *
 * 규칙:
 * - 미로그인 시: /auth/login?next=/events/{eventId} 로 redirect (next 보존).
 * - body 빈 문자열 / 공백 전용 → 에러 반환.
 * - parentId 있는 경우: parent 자체가 이미 답글이면 거부 (2단계 중첩 차단).
 * - 성공 시 revalidateTag("events:comments", "max") 로 캐시 무효화.
 *
 * @param eventId   - 대상 이벤트 UUID
 * @param body      - 댓글 본문 (1~1000자)
 * @param parentId  - 답글 대상 댓글 UUID (null 이면 최상위 댓글)
 */
export async function createEventComment(
  eventId: string,
  body: string,
  parentId: string | null = null
): Promise<CommentActionResult> {
  const supabase = await createClient();

  // ── 로그인 확인 ───────────────────────────────────────────────────────────
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) {
    // redirect_to 보존 — 서버에서 직접 redirect
    redirect(`/auth/login?next=${encodeURIComponent(`/events/${eventId}`)}`);
  }
  const userId = claimsData.claims.sub as string;

  // ── 본문 검증 ─────────────────────────────────────────────────────────────
  const trimmed = body.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: "コメントを入力してください" };
  }
  if (trimmed.length > 1000) {
    return { ok: false, error: "コメントは1000文字以内で入力してください" };
  }

  // ── 2단계 이상 답글 차단 ──────────────────────────────────────────────────
  // parentId 가 있을 때 해당 댓글 자신이 이미 답글인지 확인.
  if (parentId) {
    const { data: parentRow, error: parentErr } = await supabase
      .from("event_comments")
      .select("parent_id")
      .eq("id", parentId)
      .maybeSingle();

    if (parentErr) {
      console.error("[createEventComment] parent check error:", parentErr.message);
      return { ok: false, error: "サーバーエラーが発生しました" };
    }

    // parent 자체가 이미 답글 → 2단계 중첩 → 거부
    if (parentRow?.parent_id !== null && parentRow?.parent_id !== undefined) {
      return { ok: false, error: "返信は1段階までしかできません" };
    }
  }

  // ── INSERT ────────────────────────────────────────────────────────────────
  const { error } = await supabase.from("event_comments").insert({
    event_id: eventId,
    user_id: userId,
    parent_id: parentId,
    body: trimmed,
  });

  if (error) {
    console.error("[createEventComment] insert error:", error.message);
    return { ok: false, error: "コメントの投稿に失敗しました" };
  }

  revalidateTag("events:comments", "max");
  return { ok: true };
}

/**
 * コメント削除 — event_comments DELETE.
 *
 * 규칙:
 * - 미로그인 시 에러 반환.
 * - RLS: 본인(user_id = auth.uid()) 또는 admin 만 삭제 가능 (DB 레벨 보장).
 *
 * @param commentId - 삭제할 댓글 UUID
 */
export async function deleteEventComment(
  commentId: string
): Promise<CommentActionResult> {
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) {
    return { ok: false, error: "unauthenticated" };
  }

  const { error } = await supabase
    .from("event_comments")
    .delete()
    .eq("id", commentId);

  if (error) {
    console.error("[deleteEventComment] delete error:", error.message);
    return { ok: false, error: "削除に失敗しました" };
  }

  revalidateTag("events:comments", "max");
  return { ok: true };
}
