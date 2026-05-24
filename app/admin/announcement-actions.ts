"use server";

/**
 * app/admin/announcement-actions.ts
 *
 * 관리자 공개 알림(announcements) 작성·삭제 Server Actions.
 *
 * 보안 구조:
 * 1) proxy.ts — /admin/* 인증 필수 (미로그인 차단)
 * 2) app/admin/layout.tsx AdminGuard — is_admin() RPC 로 role 검증 (일반 로그인 차단)
 * 3) RLS announcements_insert_admin / announcements_delete_admin — is_admin() 기반 DB 레벨 게이트
 * 4) 본 액션의 getClaims 인증가드 — published_by UID 주입용 + 명시적 방어
 *
 * 수동 작성 타입은 'event' | 'notice' 만 허용.
 * 'new_circle' 은 approveCircle 액션에서 자동 발행되므로 이 파일에서는 차단한다.
 */

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

/** 제목 최대 길이 */
const MAX_TITLE = 100;
/** 본문 최대 길이 */
const MAX_BODY = 1000;

/** Server Action 공통 반환 타입 (admin/actions.ts 와 동일 시그니처) */
type ActionResult = { ok: boolean; error?: string };

/**
 * 공개 알림 작성.
 * @param input 타입(event|notice), 제목, 본문(선택), 링크 URL(선택)
 */
export async function createAnnouncement(input: {
  type: "event" | "notice";
  title: string;
  body?: string;
  link_url?: string;
}): Promise<ActionResult> {
  // ── 1. 입력값 정규화 ──────────────────────────────────────────────
  const title = input.title?.trim() ?? "";
  const body = input.body?.trim() || null;
  const link_url = input.link_url?.trim() || null;

  // ── 2. 서버 측 유효성 검사 (클라이언트 검증의 2차 방어선) ──────────
  if (!title) {
    return { ok: false, error: "タイトルは必須です" };
  }
  if (title.length > MAX_TITLE) {
    return { ok: false, error: `タイトルは${MAX_TITLE}文字以内で入力してください` };
  }
  if (body && body.length > MAX_BODY) {
    return { ok: false, error: `本文は${MAX_BODY}文字以内で入力してください` };
  }

  // ── 3. 인증 확인 — UID를 published_by 에 주입하기 위해 getClaims ──
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const uid = claimsData?.claims?.sub;
  if (!uid) {
    return { ok: false, error: "unauthenticated" };
  }

  // ── 4. 삽입 — RLS is_admin() 이 비관리자를 DB 레벨에서 추가 차단 ──
  const { error } = await supabase.from("announcements").insert({
    type: input.type,
    title,
    body,
    link_url,
    published_by: uid,
  });

  if (error) {
    console.error("[createAnnouncement]", error.message);
    return { ok: false, error: error.message ?? "投稿に失敗しました" };
  }

  // 성공 시 관리자 목록 + 사용자 알림 페이지 양쪽 재검증
  revalidatePath("/admin/announcements");
  revalidatePath("/notifications");

  return { ok: true };
}

/**
 * 공개 알림 삭제.
 * @param id 삭제할 announcement UUID
 */
export async function deleteAnnouncement(id: string): Promise<ActionResult> {
  // 인증 확인
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const uid = claimsData?.claims?.sub;
  if (!uid) {
    return { ok: false, error: "unauthenticated" };
  }

  // 삭제 — RLS announcements_delete_admin 이 비관리자를 차단(이중 방어)
  const { error } = await supabase.from("announcements").delete().eq("id", id);

  if (error) {
    console.error("[deleteAnnouncement]", error.message);
    return { ok: false, error: error.message ?? "削除に失敗しました" };
  }

  // 성공 시 관리자 목록 + 사용자 알림 페이지 양쪽 재검증
  revalidatePath("/admin/announcements");
  revalidatePath("/notifications");

  return { ok: true };
}
