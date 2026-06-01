/**
 * lib/supabase/queries/event-counts.ts
 *
 * T-016 산출물 — 이벤트 모드별 참가자 카운트 쿼리.
 *
 * 설계 원칙:
 * - 캐시 없음: 정원·대기 카운트는 실시간성이 중요하므로 unstable_cache 미사용.
 * - 인증 사용자 정보가 필요한 경우(본인 waiting 순번)는 createClient() 사용.
 * - 인증 불필요한 집계는 createAnonClient() 사용해도 되나,
 *   본인 waiting_position 조회를 위해 두 함수 모두 server client 사용.
 *
 * ── light 모드 ─────────────────────────────────────────────────────────────
 *   event_interests 테이블에서 status 별 COUNT:
 *   - interested: 気になる 인원
 *   - going:      行く予定 인원
 *
 * ── strict 모드 ────────────────────────────────────────────────────────────
 *   event_rsvps 테이블에서 집계:
 *   - going 카운트: status='going' 행 수 (실제 참석 확정)
 *   - capacity:     events.capacity (null 이면 무제한)
 *   - waiting 카운트: status='waiting' 행 수
 *   - myWaitingPosition: 본인이 waiting 시 waiting_position 값 (null 이면 waiting 아님)
 *
 *   ⚠️ 정원 차감 대상: going + pending 만. maybe·declined·waiting·cancelled 제외.
 *      (T-016 위험 항목 준수)
 */

import { createClient } from "@/lib/supabase/server";

// ─────────────────────────────────────────────────────────────────────────────
// 반환 타입 정의
// ─────────────────────────────────────────────────────────────────────────────

/**
 * light 모드 카운트 결과.
 * 気になる / 行く予定 인원 수.
 */
export interface LightInterestCounts {
  interested: number;
  going: number;
}

/**
 * strict 모드 카운트 결과.
 * 정원 · 잔여석 · 대기열 · 본인 순번.
 */
export interface StrictRsvpCounts {
  /** status='going' 확정 참석 인원 수 */
  going: number;
  /** events.capacity — null 이면 무제한 */
  capacity: number | null;
  /** 잔여석 = capacity - going - pending. capacity null 이면 null */
  remaining: number | null;
  /** status='waiting' 대기 인원 수 */
  waiting: number;
  /** 본인이 waiting 인 경우 순번, 아니면 null */
  myWaitingPosition: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// light 모드 카운트
// ─────────────────────────────────────────────────────────────────────────────

/**
 * light 모드 이벤트의 참가 의사 카운트 조회.
 *
 * event_interests 테이블에서 eventId 로 필터 후 status 별 COUNT.
 * 미로그인/에러 시 { interested: 0, going: 0 } 반환.
 *
 * @param eventId - events.id UUID
 */
export async function getLightInterestCounts(
  eventId: string
): Promise<LightInterestCounts> {
  const supabase = await createClient();

  // status 별 집계: 전체 행을 가져와 JS 에서 집계 (RPC 없이)
  // 테이블 규모가 크지 않으므로 SELECT * 보다 status 컬럼만 취득
  const { data, error } = await supabase
    .from("event_interests")
    .select("status")
    .eq("event_id", eventId);

  if (error) {
    console.error("[getLightInterestCounts]", error.message);
    return { interested: 0, going: 0 };
  }

  // status 별로 집계
  const interested = data?.filter((r) => r.status === "interested").length ?? 0;
  const going = data?.filter((r) => r.status === "going").length ?? 0;

  return { interested, going };
}

// ─────────────────────────────────────────────────────────────────────────────
// strict 모드 카운트
// ─────────────────────────────────────────────────────────────────────────────

/**
 * strict 모드 이벤트의 RSVP 카운트 조회.
 *
 * - event_rsvps: status 별 집계 + 본인 waiting_position
 * - events: capacity 조회 (events 테이블에서 직접)
 *
 * ⚠️ 정원 차감 = going + pending 만 (T-016 정책).
 *
 * @param eventId      - events.id UUID
 * @param currentUserId - 현재 로그인 사용자 UUID (null 이면 myWaitingPosition 항상 null)
 */
export async function getStrictRsvpCounts(
  eventId: string,
  currentUserId: string | null
): Promise<StrictRsvpCounts> {
  const supabase = await createClient();

  // ── 1. capacity 조회 (events 테이블) ──────────────────────────────────────
  const { data: eventData, error: eventError } = await supabase
    .from("events")
    .select("capacity")
    .eq("id", eventId)
    .maybeSingle();

  if (eventError) {
    console.error("[getStrictRsvpCounts] events query error:", eventError.message);
  }

  const capacity = eventData?.capacity ?? null;

  // ── 2. RSVP 행 전체 조회 (status + waiting_position) ─────────────────────
  // waiting_position: waiting 상태에서만 값 존재, 그 외 null
  const { data: rsvpRows, error: rsvpError } = await supabase
    .from("event_rsvps")
    .select("user_id, status, waiting_position")
    .eq("event_id", eventId);

  if (rsvpError) {
    console.error("[getStrictRsvpCounts] rsvps query error:", rsvpError.message);
    return {
      going: 0,
      capacity,
      remaining: capacity != null ? capacity : null,
      waiting: 0,
      myWaitingPosition: null,
    };
  }

  const rows = rsvpRows ?? [];

  // ── 3. status 별 집계 ─────────────────────────────────────────────────────
  const going = rows.filter((r) => r.status === "going").length;
  const pending = rows.filter((r) => r.status === "pending").length;
  const waiting = rows.filter((r) => r.status === "waiting").length;

  // 잔여석 = capacity - (going + pending). capacity null 이면 null (무제한)
  const remaining =
    capacity != null ? Math.max(0, capacity - going - pending) : null;

  // ── 4. 본인 waiting 순번 ──────────────────────────────────────────────────
  let myWaitingPosition: number | null = null;
  if (currentUserId) {
    const myRow = rows.find((r) => r.user_id === currentUserId);
    // waiting 상태일 때만 순번 노출
    if (myRow?.status === "waiting" && myRow.waiting_position != null) {
      myWaitingPosition = myRow.waiting_position;
    }
  }

  return {
    going,
    capacity,
    remaining,
    waiting,
    myWaitingPosition,
  };
}
