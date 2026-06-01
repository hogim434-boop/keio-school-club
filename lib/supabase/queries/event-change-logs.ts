/**
 * lib/supabase/queries/event-change-logs.ts
 *
 * event_change_logs 테이블 관련 RSC fetch 함수 모음 (T-026 산출물).
 *
 * partial index: idx_event_change_logs_unsent
 *   → `notified_at IS NULL` 조건에 특화된 인덱스 (T-007 산출물)로 고속 조회.
 *
 * 주의: createClient()는 호출마다 새로 생성 (Fluid compute 전역 변수 금지).
 */

import { createClient } from "@/lib/supabase/server";

/**
 * 미발송 변경 로그 수 조회.
 *
 * 이벤트 관리 페이지의 「変更通知を送信 (N件未送信)」 배지 표시용.
 * partial index (notified_at IS NULL) 를 활용하므로 대규모에서도 고속.
 *
 * @param eventId - 이벤트 UUID
 * @returns 미발송 건수 (오류 시 0)
 */
export async function getUnsentChangesCount(eventId: string): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("event_change_logs")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId)
    .is("notified_at", null);

  if (error) {
    console.error("[getUnsentChangesCount] 조회 오류:", error.message);
    return 0;
  }

  return count ?? 0;
}
