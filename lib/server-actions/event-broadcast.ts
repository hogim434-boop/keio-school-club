/**
 * lib/server-actions/event-broadcast.ts
 *
 * 이벤트 일괄 알림 헬퍼 (T-024 산출물).
 *
 * 역할:
 * - 이벤트 신청자 전원(status='going' 또는 지정 상태 배열)에게
 *   notifications 테이블에 다중 row INSERT.
 * - 호출처(Server Action)에서 이미 권한 검증이 완료된 후 호출된다.
 *
 * RLS 주의:
 * - notifications INSERT: is_admin() 또는 is_circle_staff(circle_id)
 * - T-024 마이그레이션(024_event_manage_broadcast_rls)에서 circle_staff 정책 추가됨.
 *
 * 설계:
 * - 대상 userId 배열을 받아 bulkInsert — PostgREST 는 배열 INSERT 지원.
 * - 알림 type = "event_broadcast" 로 고정 (notifications.type text 컬럼).
 * - circle_name 은 events JOIN circles 에서 취득.
 */

import { createClient } from "@/lib/supabase/server";

/** 일괄 알림 결과 */
export interface BroadcastResult {
  /** 성공적으로 INSERT 된 알림 수 */
  insertedCount: number;
  /** 오류 메시지 (성공이면 null) */
  error: string | null;
}

/**
 * 이벤트 대상 사용자들에게 일괄 알림 INSERT.
 *
 * @param eventId     - 이벤트 UUID
 * @param circleId    - 서클 UUID (RLS with_check 의 circle_id)
 * @param circleName  - 서클명 (notifications.circle_name 필수 컬럼)
 * @param userIds     - 알림 수신 대상 사용자 UUID 배열
 * @param body        - 알림 본문 메시지
 * @returns           - BroadcastResult
 */
export async function broadcastEventNotification(
  eventId: string,
  circleId: string,
  circleName: string,
  userIds: string[],
  body: string
): Promise<BroadcastResult> {
  // 대상이 없으면 즉시 반환 (DB 왕복 불필요)
  if (userIds.length === 0) {
    return { insertedCount: 0, error: null };
  }

  // Fluid compute 대응: 매번 새로 생성
  const supabase = await createClient();

  // 다중 row INSERT 용 배열 구성
  const rows = userIds.map((userId) => ({
    user_id: userId,
    type: "event_broadcast" as const,
    circle_id: circleId,
    circle_name: circleName,
    body: body,
    // read_at: null (기본값)
    // created_at: now() (DB 기본값)
  }));

  const { data, error } = await supabase
    .from("notifications")
    .insert(rows)
    .select("id");

  if (error) {
    console.error("[broadcastEventNotification] INSERT error:", error.message);
    return { insertedCount: 0, error: error.message };
  }

  return { insertedCount: data?.length ?? 0, error: null };
}

/**
 * 이벤트 변경 알림 — RSVP 상태가 변경된 특정 사용자 1명에게 알림.
 * approveRsvp / rejectRsvp 완료 후 호출.
 *
 * @param userId      - 알림 수신자 UUID
 * @param circleId    - 서클 UUID
 * @param circleName  - 서클명
 * @param body        - 알림 본문 ("承認されました" 등)
 * @returns           - 성공이면 true
 */
export async function notifyRsvpStatusChange(
  userId: string,
  circleId: string,
  circleName: string,
  body: string
): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase.from("notifications").insert({
    user_id: userId,
    type: "event_rsvp_update",
    circle_id: circleId,
    circle_name: circleName,
    body,
  });

  if (error) {
    // 알림 실패는 치명적이지 않으므로 로그만 남기고 계속 진행
    console.error("[notifyRsvpStatusChange] INSERT error:", error.message);
    return false;
  }

  return true;
}
