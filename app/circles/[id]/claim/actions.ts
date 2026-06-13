"use server";

/**
 * app/circles/[id]/claim/actions.ts
 *
 * 동아리 권한 이양(claim) 신청 Server Action.
 *
 * ── submitClaimRequest ────────────────────────────────────────────────────────
 * 미claim 동아리에 대해 현재 로그인 사용자가 소유권 인수 신청을 제출한다.
 * circle_claims(status='pending') INSERT.
 *
 * ── 보안 ─────────────────────────────────────────────────────────────────────
 * 1) RLS circle_claims_insert_authenticated — requester_id=auth.uid() 강제 + is_claimed=false 체크
 * 2) 본 Action 에서 getClaims() 로 인증 재확인 (Defense in Depth)
 * 3) 필수 필드 빈값·길이 서버 측 검증 (클라이언트 조작 방어)
 *
 * ── 중복 신청 방지 ─────────────────────────────────────────────────────────
 * DB 에 (circle_id, requester_id) WHERE status='pending' 부분 유니크 인덱스가 있어
 * 동일 동아리에 pending 신청이 2건 이상 INSERT 시 Postgres 에러 발생.
 * Action 에서도 사전 체크로 사용자 친화적 메시지를 반환한다.
 */

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { type ClaimValues, GRADE_OPTIONS } from "@/lib/circles/claim-schema";

/** Server Action 공통 반환 타입 */
type ActionResult = { ok: boolean; error?: string };

/** 각 필드 최대 길이 상수 */
const MAX_NAME = 100;
const MAX_NOTE = 1000;
const MAX_FACULTY = 100;
const MAX_ROLE = 100;

/**
 * 동아리 claim 신청을 제출한다.
 *
 * @param circleId  대상 동아리 UUID
 * @param values    클라이언트 폼에서 전달된 검증 완료 값 (ClaimValues)
 */
export async function submitClaimRequest(
  circleId: string,
  values: ClaimValues
): Promise<ActionResult> {
  // ── 1. 서버 측 입력 검증 (클라이언트 우회 방어) ────────────────────────────

  // 씨명 필수 + 길이
  const name = values.applicant_name?.trim() ?? "";
  if (!name) return { ok: false, error: "お名前を入力してください" };
  if (name.length > MAX_NAME)
    return { ok: false, error: `お名前は${MAX_NAME}文字以内で入力してください` };

  // 학년 필수 + 유효값 확인
  const grade = values.grade;
  if (!grade) return { ok: false, error: "学年を選択してください" };
  if (!(GRADE_OPTIONS as readonly string[]).includes(grade)) {
    return { ok: false, error: "有効な学年を選択してください" };
  }

  // 학부·학과 필수 + 길이 (자유 입력)
  const faculty = values.faculty?.trim() ?? "";
  if (!faculty) return { ok: false, error: "学部・学科を入力してください" };
  if (faculty.length > MAX_FACULTY)
    return { ok: false, error: `学部・学科は${MAX_FACULTY}文字以内で入力してください` };

  // 역직 필수 + 길이
  const applicantRole = values.applicant_role?.trim() ?? "";
  if (!applicantRole) return { ok: false, error: "役職を入力してください" };
  if (applicantRole.length > MAX_ROLE)
    return { ok: false, error: `役職は${MAX_ROLE}文字以内で入力してください` };

  // 메모 필수 + 길이
  const contactNote = values.contact_note?.trim() ?? "";
  if (!contactNote) return { ok: false, error: "担当者へのメモを入力してください" };
  if (contactNote.length > MAX_NOTE)
    return { ok: false, error: `メモは${MAX_NOTE}文字以内で入力してください` };

  // ── 2. Supabase 클라이언트 생성 (Fluid compute 대응: 매번 새로 생성) ──────
  const supabase = await createClient();

  // ── 3. 인증 확인 (Defense in Depth: RLS 가 막지만 명시 검증 + UID 확보) ──
  const { data: claimsData } = await supabase.auth.getClaims();
  const uid = claimsData?.claims?.sub;
  if (!uid) {
    return { ok: false, error: "ログインが必要です" };
  }
  // 연락처: 로그인 계정의 이메일을 그대로 사용 (폼 입력 없음)
  const contact = (claimsData?.claims?.email as string | undefined) ?? null;

  // ── 4. 이미 pending 신청이 있는지 사전 체크 (사용자 친화 에러 메시지 위해) ──
  const { data: existing } = await supabase
    .from("circle_claims")
    .select("id, status")
    .eq("circle_id", circleId)
    .eq("requester_id", uid)
    .eq("status", "pending")
    .maybeSingle();

  if (existing) {
    return { ok: false, error: "すでに申請済みです。審査結果をお待ちください。" };
  }

  // ── 5. INSERT — RLS が requester_id=auth.uid() + is_claimed=false を強制 ──
  const { error: insertError } = await supabase.from("circle_claims").insert({
    circle_id: circleId,
    requester_id: uid,
    // 신규 필드들
    applicant_name: name || null,
    grade: grade || null,
    faculty: faculty || null,
    applicant_role: applicantRole || null,
    // 연락처: 로그인 계정 이메일 (claims.email)
    contact,
    // 담당자 메모: 빈 문자열이면 null 저장
    contact_note: contactNote || null,
    status: "pending",
  });

  if (insertError) {
    console.error("[submitClaimRequest] insert error:", insertError.message);
    // Unique 制約違反 = pending が既にある (事前チェック後の競合)
    if (insertError.code === "23505") {
      return { ok: false, error: "すでに申請済みです。審査結果をお待ちください。" };
    }
    // RLS 拒否 = is_claimed=true (すでに別ユーザーが claim 済み)
    if (insertError.code === "42501") {
      return {
        ok: false,
        error: "このサークル・部活動はすでに管理者が確定しています。",
      };
    }
    return { ok: false, error: "申請に失敗しました。もう一度お試しください。" };
  }

  // ── 6. 재검증 — 신청 후 이 페이지를 새로 고치면 「申請中」 상태가 보이도록 ──
  revalidatePath(`/circles/${circleId}/claim`);

  return { ok: true };
}
