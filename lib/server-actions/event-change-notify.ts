"use server";

/**
 * lib/server-actions/event-change-notify.ts
 *
 * イベント変更通知 Server Action (T-026 산출물).
 *
 * ── 역할 ─────────────────────────────────────────────────────────────────────
 * 이벤트 내용(일시·장소·정원 등)이 변경됐을 때, 신청자 전원에게
 * notifications 테이블에 type='event_changed' 다중 INSERT.
 *
 * ── 흐름 ─────────────────────────────────────────────────────────────────────
 * 1. Defense in Depth: 인증 + 운영자 권한 검증
 * 2. event_change_logs WHERE event_id=$1 AND notified_at IS NULL 조회
 *    → partial index (idx_event_change_logs_unsent) 활용
 * 3. 미발송 0건이면 즉시 반환 (DB 왕복 최소화)
 * 4. 변경 필드 요약 메시지 생성
 * 5. 신청자 전원 조회: event_rsvps (going/pending/waiting) + event_interests (interested/going)
 * 6. 중복 제거 후 notifications 다중 INSERT (type='event_changed')
 * 7. event_change_logs.notified_at = now() 로 갱신 → 재발송 차단
 * 8. 캐시 무효화: revalidateTag("events:public")
 *
 * ── RLS ──────────────────────────────────────────────────────────────────────
 * - notifications INSERT: notifications_insert_circle_staff 정책 (is_circle_staff 참)
 * - event_change_logs UPDATE: 운영자만 가능 (is_circle_staff RPC 검증 후)
 *
 * ── MVP 단순화 ────────────────────────────────────────────────────────────────
 * - Vercel Cron 미사용 (Phase 2/3 에서 검토)
 * - 이메일 발송 미포함 (Phase 2)
 * - 운영자가 manage 페이지 버튼 클릭 시 즉시 발송
 */

import { revalidateTag } from "next/cache";

import { createClient } from "@/lib/supabase/server";

// ─────────────────────────────────────────────────────────────────────────────
//  타입 정의
// ─────────────────────────────────────────────────────────────────────────────

/** sendEventChangeNotifications 반환값 */
export interface EventChangeNotifyResult {
  /** 성공적으로 INSERT 된 알림 수 */
  notifiedCount: number;
  /** 처리된 변경 로그 건수 (notified_at 갱신 수) */
  processedLogCount: number;
  /** 오류 메시지 (성공이면 null) */
  error: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
//  변경 필드 → 일본어 라벨 매핑
// ─────────────────────────────────────────────────────────────────────────────

/** DB field_name → 표시 라벨 변환 테이블 */
const FIELD_LABEL: Record<string, string> = {
  title: "タイトル",
  starts_at: "開始日時",
  ends_at: "終了日時",
  location: "場所",
  capacity: "定員",
  description: "詳細",
  rsvp_deadline: "申込締切",
  rsvp_mode: "申込モード",
};

/**
 * 변경된 필드 이름 배열을 일본어 라벨 문자열로 요약.
 * 예: ["starts_at", "location"] → "開始日時・場所"
 */
function summarizeFields(fieldNames: string[]): string {
  const labels = fieldNames.map((f) => FIELD_LABEL[f] ?? f);
  // 중복 제거 (같은 필드가 여러 번 변경될 수 있음)
  const unique = [...new Set(labels)];
  return unique.join("・");
}

// ─────────────────────────────────────────────────────────────────────────────
//  메인 Server Action
// ─────────────────────────────────────────────────────────────────────────────

/**
 * イベント変更通知を一斉送信 (운영자용 Server Action).
 *
 * @param eventId  - 이벤트 UUID
 * @param circleId - 서클 UUID (권한 검증 + RLS with_check 용)
 * @returns EventChangeNotifyResult
 */
export async function sendEventChangeNotifications(
  eventId: string,
  circleId: string
): Promise<EventChangeNotifyResult> {
  // ── 1. Supabase 클라이언트 생성 (Fluid compute 대응: 매번 새로 생성) ──
  const supabase = await createClient();

  // ── 2-1. Defense in Depth: 인증 확인 ─────────────────────────────────
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) {
    return { notifiedCount: 0, processedLogCount: 0, error: "ログインが必要です" };
  }

  // ── 2-2. Defense in Depth: 운영자 권한 확인 ──────────────────────────
  const { data: isStaff } = await supabase.rpc("is_circle_staff", {
    _circle_id: circleId,
  });
  if (!isStaff) {
    return { notifiedCount: 0, processedLogCount: 0, error: "権限がありません" };
  }

  // ── 3. 미발송 변경 로그 조회 (partial index 활용) ─────────────────────
  const { data: logs, error: logsError } = await supabase
    .from("event_change_logs")
    .select("id, field_name")
    .eq("event_id", eventId)
    .is("notified_at", null);

  if (logsError) {
    console.error("[sendEventChangeNotifications] 변경 로그 조회 오류:", logsError.message);
    return { notifiedCount: 0, processedLogCount: 0, error: logsError.message };
  }

  // 미발송 0건이면 즉시 반환
  if (!logs || logs.length === 0) {
    return { notifiedCount: 0, processedLogCount: 0, error: null };
  }

  const logIds = logs.map((l) => l.id);
  const fieldNames = logs.map((l) => l.field_name).filter(Boolean) as string[];

  // ── 4. 이벤트 정보 조회 (알림 메시지용 제목 + circle_name) ────────────
  const { data: eventData, error: eventError } = await supabase
    .from("events")
    .select("title, circles(name)")
    .eq("id", eventId)
    .eq("circle_id", circleId)
    .maybeSingle();

  if (eventError || !eventData) {
    return {
      notifiedCount: 0,
      processedLogCount: 0,
      error: "イベント情報の取得に失敗しました",
    };
  }

  // circles JOIN 결과는 단일 오브젝트 (1:1 FK)
  const circlesRaw = eventData.circles as { name: string } | { name: string }[] | null;
  const circleName = Array.isArray(circlesRaw)
    ? (circlesRaw[0]?.name ?? "サークル")
    : (circlesRaw?.name ?? "サークル");
  const eventTitle = eventData.title;

  // ── 5. 알림 본문 생성 ─────────────────────────────────────────────────
  const changedSummary = summarizeFields(fieldNames);
  const body = changedSummary
    ? `「${eventTitle}」の${changedSummary}が変更されました。ご確認ください。`
    : `「${eventTitle}」の詳細が変更されました。ご確認ください。`;

  // ── 6. 신청자 전원 조회 (event_rsvps + event_interests) ───────────────
  // strict 모드 신청자: going / pending / waiting (취소·거부 제외)
  const rsvpStatuses = ["going", "pending", "waiting"] as const;

  const [rsvpResult, interestResult] = await Promise.all([
    supabase
      .from("event_rsvps")
      .select("user_id")
      .eq("event_id", eventId)
      .in("status", rsvpStatuses),
    supabase
      .from("event_interests")
      .select("user_id")
      .eq("event_id", eventId)
      .in("status", ["interested", "going"]),
  ]);

  if (rsvpResult.error) {
    console.error("[sendEventChangeNotifications] event_rsvps 조회 오류:", rsvpResult.error.message);
  }
  if (interestResult.error) {
    console.error("[sendEventChangeNotifications] event_interests 조회 오류:", interestResult.error.message);
  }

  // 두 테이블을 합쳐 userId 중복 제거
  const rsvpUserIds = (rsvpResult.data ?? []).map((r) => r.user_id);
  const interestUserIds = (interestResult.data ?? []).map((r) => r.user_id);
  const allUserIds = [...new Set([...rsvpUserIds, ...interestUserIds])];

  // 대상 없으면 로그만 갱신하고 반환
  if (allUserIds.length === 0) {
    // 로그는 처리 완료 표시 (재알림 차단)
    await supabase
      .from("event_change_logs")
      .update({ notified_at: new Date().toISOString() })
      .in("id", logIds);

    revalidateTag("events:public", { expire: 0 });
    return { notifiedCount: 0, processedLogCount: logIds.length, error: null };
  }

  // ── 7. notifications 다중 INSERT (type='event_changed') ───────────────
  const notifRows = allUserIds.map((userId) => ({
    user_id: userId,
    type: "event_changed" as const,
    circle_id: circleId,
    circle_name: circleName,
    body: body,
  }));

  const { data: insertedData, error: insertError } = await supabase
    .from("notifications")
    .insert(notifRows)
    .select("id");

  if (insertError) {
    console.error("[sendEventChangeNotifications] notifications INSERT 오류:", insertError.message);
    return {
      notifiedCount: 0,
      processedLogCount: 0,
      error: `通知の送信に失敗しました: ${insertError.message}`,
    };
  }

  const notifiedCount = insertedData?.length ?? 0;

  // ── 8. event_change_logs.notified_at 갱신 → 재발송 차단 ──────────────
  const { error: updateError } = await supabase
    .from("event_change_logs")
    .update({ notified_at: new Date().toISOString() })
    .in("id", logIds);

  if (updateError) {
    // INSERT 는 성공했지만 갱신 실패 → 재발송 위험이 있으나 치명적이지 않음
    // 로그로 남기고 계속 진행
    console.error("[sendEventChangeNotifications] notified_at 갱신 오류:", updateError.message);
  }

  // ── 9. 캐시 무효화 ───────────────────────────────────────────────────
  // Next.js 15 revalidateTag 는 문자열 1개를 받음
  revalidateTag("events:public", { expire: 0 });

  return {
    notifiedCount,
    processedLogCount: logIds.length,
    error: null,
  };
}
