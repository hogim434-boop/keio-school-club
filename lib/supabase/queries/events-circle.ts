/**
 * lib/supabase/queries/events-circle.ts
 *
 * 동아리별 이벤트 목록 조회 (운영자 전용) — 이벤트 관리 페이지(/circles/[id]/events) 산출물.
 *
 * 설계 원칙:
 * - events-public.ts(anon + public 전용)와 분리한 "운영자용" 쿼리.
 *   운영자는 비공개(visibility="members")·취소(cancelled_at)된 이벤트까지 전부 봐야 하므로,
 *   인증 server client(createClient)로 RLS 를 통과시켜 조회한다.
 * - unstable_cache 금지 — cookies 의존(운영자 세션) + 신청 현황 실시간성.
 * - 신청 현황 카운트는 N+1 을 피하기 위해, 이벤트 id 목록으로 event_rsvps·event_interests 를
 *   각각 한 번씩만 조회한 뒤 JS 에서 그룹 집계한다(event-counts.ts 의 filter 패턴 재사용).
 *
 * 정원 차감 정책(event-counts.ts 와 동일):
 *   strict: going + pending 이 정원을 차지. waiting/maybe/declined/cancelled 제외.
 */

import { createClient } from "@/lib/supabase/server";

/**
 * 동아리 이벤트 관리 카드 1건의 데이터.
 * 신청 현황 카운트는 rsvp_mode 에 따라 의미가 다르다.
 */
export interface CircleEventRow {
  id: string;
  circle_id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  is_all_day: boolean;
  rsvp_mode: "light" | "strict";
  capacity: number | null;
  visibility: "public" | "members";
  cancelled_at: string | null;
  /** strict: 참석 확정(going) 수 / light: 行く予定(going) 수 */
  going_count: number;
  /** light 전용: 気になる(interested) 수 */
  interested_count: number;
  /** strict 전용: 승인 대기(pending) 수 */
  pending_count: number;
}

/**
 * 한 동아리의 모든 이벤트를 시작일 내림차순(최신 우선)으로 조회한다.
 *
 * ⚠️ 호출 전 반드시 페이지에서 is_circle_staff 로 운영자 권한을 확인할 것.
 *    (이 함수 자체는 RLS 에 의존하므로 비운영자가 호출해도 RLS 가 막지만,
 *     Defense in Depth 로 페이지 가드를 둔다.)
 *
 * @param circleId - circles.id UUID
 * @returns CircleEventRow[] — 빈 배열(이벤트 없음/에러) 또는 starts_at DESC 정렬 목록
 */
export async function getEventsByCircle(circleId: string): Promise<CircleEventRow[]> {
  // Fluid compute 대응: 함수 내에서 매번 새로 생성
  const supabase = await createClient();

  // ── 1. events 행 조회 (운영자 RLS — 비공개·취소 포함 전부) ──────────────
  const { data: eventRows, error } = await supabase
    .from("events")
    .select(
      "id, circle_id, title, starts_at, ends_at, is_all_day, rsvp_mode, capacity, visibility, cancelled_at"
    )
    .eq("circle_id", circleId)
    .order("starts_at", { ascending: false });

  if (error) {
    console.error("[getEventsByCircle] events fetch error:", error.message);
    return [];
  }

  if (!eventRows || eventRows.length === 0) {
    return [];
  }

  const eventIds = eventRows.map((e) => e.id as string);

  // ── 2. 신청 현황 집계 (N+1 회피: id 목록으로 한 번씩만 조회) ──────────────
  // strict 모드 → event_rsvps, light 모드 → event_interests.
  // 두 테이블을 각각 .in("event_id", ids) 로 한 번에 가져와 JS 그룹 집계.
  const [rsvpRes, interestRes] = await Promise.all([
    supabase.from("event_rsvps").select("event_id, status").in("event_id", eventIds),
    supabase.from("event_interests").select("event_id, status").in("event_id", eventIds),
  ]);

  if (rsvpRes.error) {
    console.error("[getEventsByCircle] rsvps fetch error:", rsvpRes.error.message);
  }
  if (interestRes.error) {
    console.error("[getEventsByCircle] interests fetch error:", interestRes.error.message);
  }

  const rsvpRows = rsvpRes.data ?? [];
  const interestRows = interestRes.data ?? [];

  // event_id 별 카운트 맵 구성
  const goingMap = new Map<string, number>(); // strict: going / light: going
  const interestedMap = new Map<string, number>(); // light: interested
  const pendingMap = new Map<string, number>(); // strict: pending

  for (const r of rsvpRows) {
    const id = r.event_id as string;
    if (r.status === "going") goingMap.set(id, (goingMap.get(id) ?? 0) + 1);
    else if (r.status === "pending") pendingMap.set(id, (pendingMap.get(id) ?? 0) + 1);
  }
  for (const r of interestRows) {
    const id = r.event_id as string;
    if (r.status === "going") goingMap.set(id, (goingMap.get(id) ?? 0) + 1);
    else if (r.status === "interested") interestedMap.set(id, (interestedMap.get(id) ?? 0) + 1);
  }

  // ── 3. 매핑 ────────────────────────────────────────────────────────────
  return eventRows.map((e) => {
    const id = e.id as string;
    return {
      id,
      circle_id: e.circle_id as string,
      title: e.title as string,
      starts_at: e.starts_at as string,
      ends_at: (e.ends_at as string | null) ?? null,
      is_all_day: (e.is_all_day as boolean) ?? false,
      rsvp_mode: (e.rsvp_mode as "light" | "strict") ?? "light",
      capacity: (e.capacity as number | null) ?? null,
      visibility: (e.visibility as "public" | "members") ?? "public",
      cancelled_at: (e.cancelled_at as string | null) ?? null,
      going_count: goingMap.get(id) ?? 0,
      interested_count: interestedMap.get(id) ?? 0,
      pending_count: pendingMap.get(id) ?? 0,
    };
  });
}
