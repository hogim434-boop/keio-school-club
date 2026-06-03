"use server";

/**
 * app/circles/[id]/dm/actions.ts
 *
 * 운영진 DM 문의 발신 Server Action.
 *
 * ── Defense in Depth: 권한 검증 2회 ─────────────────────────────────────
 * 1회: Server Component (page.tsx) 진입 시 → 미인증이면 /auth/login 으로 redirect.
 * 2회: 본 Server Action 에서 INSERT 직전 재검증 → 클라이언트 우회 공격 방어.
 *
 * ── INSERT 흐름 ───────────────────────────────────────────────────────────
 * 1. inquiries 테이블에 헤더 행(circle_id, sender_user_id, category, status) 생성.
 * 2. inquiry_messages 테이블에 첫 번째 메시지(body) 생성.
 * 3. redirect → T-028 스레드 페이지 (/circles/{circleId}/dm/{inquiryId}).
 *
 * ── 후속 Task placeholder ────────────────────────────────────────────────
 * T-032: user_blocks 차단 검증
 * T-033: cooldown(1시간 N건) + respect_agreed_at NULL 검증
 *
 * ── 캐시 정책 ────────────────────────────────────────────────────────────
 * DM 은 개인 데이터 → unstable_cache 절대 금지.
 */

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { bodySchema } from "@/lib/dm/inquiry-schema";
import { COOLDOWN_MAX_PER_HOUR } from "@/lib/dm/constants";

/**
 * sendInquiry 에러 코드.
 *
 * 클라이언트(inquiry-form.tsx)는 이 코드를 보고 동작을 분기한다:
 * - "REQUIRE_RESPECT_AGREEMENT": 他者尊重 동의 모달을 표시
 * - 그 외 문자열: 인라인 에러 메시지로 표시
 */
export type SendInquiryError = { error: "REQUIRE_RESPECT_AGREEMENT" } | { error: string };

/**
 * sendInquiry — 운영진에게 1:1 DM 문의를 발신한다.
 *
 * ── 채팅 개편 변경점 ─────────────────────────────────────────────────────
 * - 시그니처: (circleId, formData) → (circleId, body: string)
 *   FormData 파싱 제거. body 를 직접 문자열로 받음.
 * - category: INSERT 시 제거(NULL 저장). DB는 이미 nullable.
 * - 23505 unique 위반 폴백: race 조건으로 중복 INSERT 시 기존 스레드로 redirect.
 *
 * ── 보존된 로직 ────────────────────────────────────────────────────────────
 * - T-032: user_blocks 차단 검사 (85–100행)
 * - T-033: respect_agreed_at NULL + cooldown 검사 (102–140행)
 * - 마지막 성공 redirect (스레드 페이지)
 *
 * @param circleId - 문의 대상 서클 UUID
 * @param body     - 첫 메시지 본문 (문자열 직접 전달)
 * @returns 성공 시 redirect(리턴 없음) / 실패 시 SendInquiryError
 */
export async function sendInquiry(
  circleId: string,
  body: string
): Promise<SendInquiryError | void> {
  // ── 1. Supabase 클라이언트 생성 (Fluid compute 대응: 매번 새로 생성) ───
  const supabase = await createClient();

  // ── 3-1. Defense in Depth (2회차): 인증 재확인 ────────────────────────
  // page.tsx 에서 1회 검증 후, Server Action 에서 다시 검증 (클라이언트 우회 방어)
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) {
    // 미인증 → 로그인 페이지 (redirect_to 보존)
    redirect(`/auth/login?next=${encodeURIComponent(`/circles/${circleId}/dm`)}`);
  }

  const senderUserId = claimsData.claims.sub as string;

  // ── 3-2. T-032: user_blocks 차단 검증 — 차단 시 거부 ─────────────────
  // 발신자(senderUserId)가 이 서클(circleId)에서 차단됐는지 확인.
  // user_blocks 복합PK: (blocker_user_id, blocked_user_id, circle_id).
  // 차단 행이 1건 이상 존재하면 거부. 에러가 아닌 count=0/1 로 판정.
  const { count: blockCount, error: blockCheckError } = await supabase
    .from("user_blocks")
    .select("blocker_user_id", { count: "exact", head: true })
    .eq("blocked_user_id", senderUserId)
    .eq("circle_id", circleId);

  if (blockCheckError) {
    console.error("[sendInquiry] user_blocks check error:", blockCheckError.message);
    // 차단 확인 실패 시 안전하게 거부 (fail-closed 원칙)
    return { error: "お問い合わせを受け付けられませんでした。もう一度お試しください。" };
  }

  if ((blockCount ?? 0) > 0) {
    // 차단된 사용자 → 일본어 안내 (강제·위협 톤 금지)
    return { error: "現在お問い合わせを受け付けていません" };
  }

  // ── 3-3. T-033: respect_agreed_at NULL 검증 + cooldown 검증 ─────────────
  // 검증 순서: 동의 미완료 → 쿨다운 초과 순으로 확인.
  // 동의 미완료는 클라이언트가 동의 모달을 띄워 해소할 수 있는 에러이므로 먼저 반환.

  // (a) profiles.respect_agreed_at 확인 — NULL 이면 他者尊重 미동의 → 모달 표시 신호
  const { data: profile, error: profileFetchError } = await supabase
    .from("profiles")
    .select("respect_agreed_at")
    .eq("id", senderUserId)
    .maybeSingle();

  if (profileFetchError) {
    console.error("[sendInquiry] profiles fetch error:", profileFetchError.message);
    return { error: "プロフィールの取得に失敗しました。もう一度お試しください。" };
  }

  if (!profile?.respect_agreed_at) {
    // 他者尊重 미동의 → 클라이언트가 이 코드를 받아 동의 모달을 표시
    return { error: "REQUIRE_RESPECT_AGREEMENT" };
  }

  // (b) cooldown 검증 — 1시간 이내 발송 건수가 상한(COOLDOWN_MAX_PER_HOUR)에 도달하면 거부
  const { count: recentCount, error: countError } = await supabase
    .from("inquiries")
    .select("id", { count: "exact", head: true })
    .eq("sender_user_id", senderUserId)
    .gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());

  if (countError) {
    console.error("[sendInquiry] cooldown count error:", countError.message);
    return { error: "お問い合わせ件数の確認に失敗しました。もう一度お試しください。" };
  }

  if ((recentCount ?? 0) >= COOLDOWN_MAX_PER_HOUR) {
    return {
      error: "短時間に多くのお問い合わせを送信しました。しばらくしてから再度お試しください。",
    };
  }

  // ── 4. Zod body 검증 ──────────────────────────────────────────────────
  const parseResult = bodySchema.safeParse(body);

  if (!parseResult.success) {
    // 검증 실패: 첫 번째 에러 메시지 반환
    const firstError = parseResult.error.issues[0]?.message ?? "入力内容を確認してください";
    return { error: firstError };
  }

  const validatedBody = parseResult.data;

  // ── 5. inquiries INSERT ───────────────────────────────────────────────
  // 헤더 행 생성 — category 는 NULL 저장(채팅 개편: 카테고리 UI 제거).
  // DB는 이미 nullable 이므로 마이그레이션 불필요.
  const { data: newInquiry, error: inquiryInsertError } = await supabase
    .from("inquiries")
    .insert({
      circle_id: circleId,
      sender_user_id: senderUserId,
      // category 는 의도적으로 생략 → NULL 저장
      status: "open",
      last_message_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (inquiryInsertError || !newInquiry) {
    // ── 23505 unique 위반 폴백: race 조건으로 중복 INSERT 시 기존 스레드로 redirect
    // uq_inquiries_circle_sender_active(circle_id, sender_user_id WHERE status<>'blocked')
    if (inquiryInsertError?.code === "23505") {
      console.warn(
        "[sendInquiry] unique 위반 — 기존 활성 스레드 재조회 (race 폴백):",
        circleId,
        senderUserId
      );
      // 기존 활성 inquiry(status<>'blocked') 중 최신 1건 조회
      const { data: existingInquiry } = await supabase
        .from("inquiries")
        .select("id")
        .eq("circle_id", circleId)
        .eq("sender_user_id", senderUserId)
        .neq("status", "blocked")
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingInquiry?.id) {
        redirect(`/circles/${circleId}/dm/${existingInquiry.id}`);
      }
    }

    console.error("[sendInquiry] inquiries insert error:", inquiryInsertError?.message);
    return { error: "お問い合わせの送信に失敗しました。もう一度お試しください。" };
  }

  const inquiryId = newInquiry.id;

  // ── 6. inquiry_messages INSERT ────────────────────────────────────────
  // 첫 번째 메시지(문의 본문) 생성 — sender_role='inquirer' (발신자 = 신입생)
  const { error: messageInsertError } = await supabase.from("inquiry_messages").insert({
    inquiry_id: inquiryId,
    sender_user_id: senderUserId,
    sender_role: "inquirer",
    body: validatedBody.trim(),
  });

  if (messageInsertError) {
    console.error("[sendInquiry] inquiry_messages insert error:", messageInsertError.message);
    // 메시지 INSERT 실패 시 이미 생성된 inquiry 는 남아있지만,
    // 사용자에게는 실패로 안내 (불완전한 스레드 방지)
    return { error: "お問い合わせの送信に失敗しました。もう一度お試しください。" };
  }

  // ── 7. 성공 → T-028 스레드 페이지로 redirect ──────────────────────────
  redirect(`/circles/${circleId}/dm/${inquiryId}`);
}

// ══════════════════════════════════════════════════════════════════════════════
//  replyToInquiry — 스레드 내 답장 (T-028)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * replyToInquiry — 기존 inquiry 스레드에 답장 메시지를 추가한다.
 *
 * ── Defense in Depth ──────────────────────────────────────────────────────
 * 1회: DM 스레드 페이지(page.tsx) 진입 시 → 미인증이면 /auth/login redirect.
 * 2회: 본 Server Action 에서 INSERT 직전 재검증 → 클라이언트 우회 공격 방어.
 *
 * ── 권한 판별 로직 ─────────────────────────────────────────────────────────
 * is_circle_staff(circle_id) RPC → true 면 sender_role='circle_staff'
 * 아니면 → sender_role='inquirer'
 * 단, inquiry 참여자(발신자 본인 or 운영진)인지도 검증한다.
 * RLS 가 INSERT 를 차단하지만 Defense in Depth 로 명시 확인.
 *
 * ── 동작 순서 ─────────────────────────────────────────────────────────────
 * 1. 인증 재확인
 * 2. inquiry 조회 (circle_id, sender_user_id 취득 — 참여자 검증용)
 * 3. is_circle_staff RPC → sender_role 결정
 * 4. 참여자 검증 (본인 OR 운영진)
 * 5. inquiry_messages INSERT
 * 6. inquiries.last_message_at UPDATE
 *
 * @param inquiryId - 답장 대상 inquiry UUID
 * @param circleId  - 서클 UUID (권한 검증용)
 * @param body      - 메시지 본문 (클라이언트에서 trim 완료 가정)
 * @returns 성공 시 void / 실패 시 { error: string }
 */
export async function replyToInquiry(
  inquiryId: string,
  circleId: string,
  body: string
): Promise<{ error: string } | void> {
  // ── 1. 기본 유효성 검사 ────────────────────────────────────────────────
  const trimmedBody = body.trim();
  if (!trimmedBody) {
    return { error: "メッセージを入力してください" };
  }
  if (trimmedBody.length > 2000) {
    return { error: "メッセージは2000文字以内で入力してください" };
  }

  // ── 2. Supabase 클라이언트 생성 (Fluid compute 대응: 매번 새로 생성) ────
  const supabase = await createClient();

  // ── 3. Defense in Depth (2회차): 인증 재확인 ──────────────────────────
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) {
    return { error: "ログインが必要です" };
  }

  const currentUserId = claimsData.claims.sub as string;

  // ── 4. inquiry 조회 (참여자 검증 + circle_id 확인) ────────────────────
  const { data: inquiry, error: inquiryFetchError } = await supabase
    .from("inquiries")
    .select("id, circle_id, sender_user_id, status")
    .eq("id", inquiryId)
    .maybeSingle();

  if (inquiryFetchError) {
    console.error("[replyToInquiry] inquiry fetch error:", inquiryFetchError.message);
    return { error: "お問い合わせの取得に失敗しました" };
  }

  // inquiry が存在しない (RLS に弾かれた場合も含む)
  if (!inquiry) {
    return { error: "お問い合わせが見つかりません" };
  }

  // URL 변조 방어: circleId 일치 검증
  if (inquiry.circle_id !== circleId) {
    return { error: "アクセス権限がありません" };
  }

  // ── 5. is_circle_staff RPC → sender_role 결정 ─────────────────────────
  const { data: isStaff } = await supabase.rpc("is_circle_staff", {
    _circle_id: circleId,
  });
  const senderRole: "circle_staff" | "inquirer" = isStaff === true ? "circle_staff" : "inquirer";

  // ── 6. 참여자 검증 (Defense in Depth — RLS 도 막지만 명시 확인) ─────────
  // 참여자 조건: 발신자 본인 OR 운영진
  const isParticipant = inquiry.sender_user_id === currentUserId || isStaff === true;
  if (!isParticipant) {
    return { error: "このお問い合わせに返信する権限がありません" };
  }

  // ── 7. inquiry_messages INSERT ────────────────────────────────────────
  const { error: insertError } = await supabase.from("inquiry_messages").insert({
    inquiry_id: inquiryId,
    sender_user_id: currentUserId,
    sender_role: senderRole,
    body: trimmedBody,
  });

  if (insertError) {
    console.error("[replyToInquiry] inquiry_messages insert error:", insertError.message);
    return { error: "メッセージの送信に失敗しました。もう一度お試しください。" };
  }

  // ── 8. inquiries.last_message_at UPDATE ──────────────────────────────
  // 인박스 목록(T-029)의 最終メッセージ時刻 表示 用
  const { error: updateError } = await supabase
    .from("inquiries")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", inquiryId);

  if (updateError) {
    // last_message_at 업데이트 실패는 치명적이지 않음 (메시지 자체는 이미 저장됨)
    console.error("[replyToInquiry] last_message_at update error:", updateError.message);
  }

  // 성공 — void 반환 (redirect 없음, Realtime 으로 메시지가 클라이언트에 표시됨)
}

// ══════════════════════════════════════════════════════════════════════════════
//  agreeRespect — 他者尊重 동의 기록 (T-033, F056)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * agreeRespect — 현재 사용자의 profiles.respect_agreed_at 을 now() 로 UPDATE 한다.
 *
 * ── 호출 시점 ──────────────────────────────────────────────────────────────
 * 1. 회원가입 3단계(닉네임 저장) 직후 — respect 체크박스 동의 시
 * 2. inquiry-form.tsx 의 동의 모달에서 "同意する" 버튼 클릭 시
 *
 * ── Defense in Depth ────────────────────────────────────────────────────────
 * 미인증 사용자는 early return. RLS profiles_update_own 이 2차 방어.
 *
 * @returns 성공 시 void / 실패 시 { error: string }
 */
export async function agreeRespect(): Promise<{ error: string } | void> {
  // ── 1. Supabase 클라이언트 생성 (Fluid compute 대응: 매번 새로 생성) ───
  const supabase = await createClient();

  // ── 2. Defense in Depth: 인증 재확인 ─────────────────────────────────────
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) {
    return { error: "ログインが必要です" };
  }

  const userId = claimsData.claims.sub as string;

  // ── 3. profiles.respect_agreed_at = now() UPDATE ──────────────────────────
  // RLS: profiles_update_own 정책(id = auth.uid())으로 본인 행만 갱신 가능.
  // .select("id") 로 실제 갱신된 행 수를 확인 → 0행이면 실패로 처리.
  const { data: updated, error: updateError } = await supabase
    .from("profiles")
    .update({ respect_agreed_at: new Date().toISOString() })
    .eq("id", userId)
    .select("id")
    .maybeSingle();

  if (updateError) {
    console.error("[agreeRespect] profiles update error:", updateError.message);
    return { error: "同意の記録に失敗しました。もう一度お試しください。" };
  }

  if (!updated) {
    // 갱신된 행 없음 — profiles 행 미생성(onboarding 미완료 등) 가능성
    console.error("[agreeRespect] profiles row not found for user:", userId);
    return { error: "プロフィールが見つかりません。もう一度お試しください。" };
  }

  // 성공 — void 반환
}

// ══════════════════════════════════════════════════════════════════════════════
//  reportMessage — 메시지 신고 (T-031)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * reportMessage — 메시지를 신고하고 inquiry_reports 에 기록한다.
 *
 * ── Defense in Depth ────────────────────────────────────────────────────────
 * 1회: DM 스레드 페이지(page.tsx) 진입 시 → 미인증이면 /auth/login redirect.
 * 2회: 본 Server Action 에서 getClaims() 재검증 → 클라이언트 우회 공격 방어.
 * RLS inquiry_reports_insert: reporter_user_id = auth.uid() 강제 → DB 레벨 방어.
 *
 * ── 중복 신고 ────────────────────────────────────────────────────────────────
 * Phase 1 에서는 단순 INSERT. 동일 메시지를 같은 사용자가 재신고해도
 * 복수 레코드가 쌓이지 않도록 onConflict 처리(Phase 1 범위).
 * 복합 unique index (reporter_user_id, message_id) 가 없으면 onConflict는 무시되고
 * 그냥 INSERT 됨 → 관리자가 중복 신고를 보게 되는 정도. 치명적이지 않음.
 *
 * ── 캐시 정책 ────────────────────────────────────────────────────────────────
 * DM 는 개인 데이터 → unstable_cache 절대 금지.
 *
 * @param inquiryId - 신고 대상 메시지가 속한 inquiry UUID
 * @param messageId - 신고 대상 inquiry_messages UUID (nullable: 메시지 특정 불가 시 null)
 * @param reason    - 신고 사유 (클라이언트에서 trim 완료 가정)
 * @returns 성공 시 void / 실패 시 { error: string }
 */
export async function reportMessage(
  inquiryId: string,
  messageId: string | null,
  reason: string
): Promise<{ error: string } | void> {
  // ── 1. 입력 유효성 검사 ────────────────────────────────────────────────────
  const trimmedReason = reason.trim();
  if (!trimmedReason) {
    return { error: "通報理由を入力してください" };
  }
  if (trimmedReason.length > 500) {
    return { error: "通報理由は500文字以内で入力してください" };
  }

  // ── 2. Supabase 클라이언트 생성 (Fluid compute 대응: 매번 새로 생성) ────
  const supabase = await createClient();

  // ── 3. Defense in Depth (2회차): 인증 재확인 ──────────────────────────────
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) {
    return { error: "ログインが必要です" };
  }

  const reporterUserId = claimsData.claims.sub as string;

  // ── 4. inquiry_reports INSERT ─────────────────────────────────────────────
  // RLS inquiry_reports_insert: reporter_user_id = auth.uid() 강제 (DB 레벨 방어)
  // message_id null 허용(nullable 컬럼): 메시지 단위 특정이 어려운 경우를 포함
  const { error: insertError } = await supabase.from("inquiry_reports").insert({
    inquiry_id: inquiryId,
    message_id: messageId,
    reporter_user_id: reporterUserId,
    reason: trimmedReason,
  });

  if (insertError) {
    console.error("[reportMessage] inquiry_reports insert error:", insertError.message);
    return { error: "通報の送信に失敗しました。もう一度お試しください。" };
  }

  // 성공 — void 반환
  // 캐시 재검증: 관리자 신고 목록 페이지를 즉시 갱신
  revalidatePath("/admin/inquiry-reports");
}

// ══════════════════════════════════════════════════════════════════════════════
//  blockUser — 검토자 차단 (T-032)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * blockUser — 운영진이 특정 사용자를 해당 서클에서 차단한다.
 *
 * ── Defense in Depth ────────────────────────────────────────────────────────
 * 1회: 클라이언트(block-user-menu.tsx) UI 레벨 비활성화
 * 2회: 본 Server Action 에서 getClaims() + is_circle_staff RPC 재검증
 *
 * ── 동작 ─────────────────────────────────────────────────────────────────────
 * user_blocks INSERT (blocker=currentUser, blocked=blockedUserId, circle=circleId).
 * 이미 차단 행이 존재하면 onConflict do nothing(upsert) 으로 멱등 처리.
 *
 * @param circleId      - 차단을 적용할 서클 UUID
 * @param blockedUserId - 차단 대상 사용자 UUID
 * @returns 성공 시 void / 실패 시 { error: string }
 */
export async function blockUser(
  circleId: string,
  blockedUserId: string
): Promise<{ error: string } | void> {
  // ── 1. Supabase 클라이언트 생성 (Fluid compute 대응: 매번 새로 생성) ───
  const supabase = await createClient();

  // ── 2. Defense in Depth: 인증 재확인 ────────────────────────────────────
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) {
    return { error: "ログインが必要です" };
  }

  const currentUserId = claimsData.claims.sub as string;

  // ── 3. Defense in Depth: 운영진 여부 재검증 (RLS 에 더해 Server Action 에서도 확인) ──
  // 비운영진이 이 Action 을 직접 호출하는 경우를 방어한다.
  const { data: isStaff, error: staffError } = await supabase.rpc("is_circle_staff", {
    _circle_id: circleId,
  });

  if (staffError) {
    console.error("[blockUser] is_circle_staff RPC error:", staffError.message);
    return { error: "権限の確認に失敗しました。もう一度お試しください。" };
  }

  if (isStaff !== true) {
    // 운영진이 아닌 사람은 차단 불가
    return { error: "この操作を行う権限がありません" };
  }

  // ── 4. 자기 자신 차단 방지 ────────────────────────────────────────────
  if (currentUserId === blockedUserId) {
    return { error: "自分自身をブロックすることはできません" };
  }

  // ── 5. user_blocks INSERT (이미 존재하면 무시) ──────────────────────────
  // onConflict: 복합PK(blocker_user_id, blocked_user_id, circle_id) 충돌 시 아무것도 하지 않음
  const { error: insertError } = await supabase.from("user_blocks").upsert(
    {
      blocker_user_id: currentUserId,
      blocked_user_id: blockedUserId,
      circle_id: circleId,
    },
    {
      // 복합PK 충돌 시 업데이트 없이 무시
      onConflict: "blocker_user_id,blocked_user_id,circle_id",
      ignoreDuplicates: true,
    }
  );

  if (insertError) {
    console.error("[blockUser] user_blocks insert error:", insertError.message);
    return { error: "ブロックに失敗しました。もう一度お試しください。" };
  }

  // ── 6. 인박스 페이지 재검증 (차단 상태 즉시 반영) ───────────────────────
  revalidatePath(`/circles/${circleId}/dm/inbox`);
}

// ══════════════════════════════════════════════════════════════════════════════
//  unblockUser — 검토자 차단 해제 (T-032)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * unblockUser — 운영진이 차단한 사용자를 해제한다.
 *
 * ── Defense in Depth ────────────────────────────────────────────────────────
 * blockUser 와 동일한 가드 (getClaims + is_circle_staff RPC).
 *
 * ── 동작 ─────────────────────────────────────────────────────────────────────
 * user_blocks DELETE WHERE blocker=currentUser AND blocked=blockedUserId AND circle=circleId.
 * 행이 없어도 에러로 처리하지 않음 (멱등 처리).
 *
 * @param circleId      - 차단 해제할 서클 UUID
 * @param blockedUserId - 차단 해제 대상 사용자 UUID
 * @returns 성공 시 void / 실패 시 { error: string }
 */
export async function unblockUser(
  circleId: string,
  blockedUserId: string
): Promise<{ error: string } | void> {
  // ── 1. Supabase 클라이언트 생성 (Fluid compute 대응: 매번 새로 생성) ───
  const supabase = await createClient();

  // ── 2. Defense in Depth: 인증 재확인 ────────────────────────────────────
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) {
    return { error: "ログインが必要です" };
  }

  const currentUserId = claimsData.claims.sub as string;

  // ── 3. Defense in Depth: 운영진 여부 재검증 ────────────────────────────
  const { data: isStaff, error: staffError } = await supabase.rpc("is_circle_staff", {
    _circle_id: circleId,
  });

  if (staffError) {
    console.error("[unblockUser] is_circle_staff RPC error:", staffError.message);
    return { error: "権限の確認に失敗しました。もう一度お試しください。" };
  }

  if (isStaff !== true) {
    return { error: "この操作を行う権限がありません" };
  }

  // ── 4. user_blocks DELETE WHERE 복합PK 3개 ─────────────────────────────
  // 행이 존재하지 않더라도 에러 없이 처리됨 (멱등)
  const { error: deleteError } = await supabase
    .from("user_blocks")
    .delete()
    .eq("blocker_user_id", currentUserId)
    .eq("blocked_user_id", blockedUserId)
    .eq("circle_id", circleId);

  if (deleteError) {
    console.error("[unblockUser] user_blocks delete error:", deleteError.message);
    return { error: "ブロック解除に失敗しました。もう一度お試しください。" };
  }

  // ── 5. 인박스 페이지 재검증 (차단 해제 상태 즉시 반영) ──────────────────
  revalidatePath(`/circles/${circleId}/dm/inbox`);
}
