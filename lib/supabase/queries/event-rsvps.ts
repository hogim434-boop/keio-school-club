/**
 * lib/supabase/queries/event-rsvps.ts
 *
 * 이벤트 신청자 관리자용 쿼리 (T-024 산출물).
 *
 * 설계 원칙:
 * - server 클라이언트 사용 — 운영자 RLS(event_rsvps_select: is_circle_staff OR is_admin)로 조회.
 * - unstable_cache 미사용 — 개인정보 포함·실시간성 필요 데이터이므로 캐시 금지.
 * - 호출처(page.tsx / route.ts)에서 is_circle_staff 검증 완료 후 호출됨.
 *
 * 반환 타입:
 * - RsvpRow    : event_rsvps + profiles JOIN 결과 (관리 목록용)
 * - InterestRow: event_interests + profiles JOIN 결과 (흥미 표명 목록용)
 */

import { createClient } from "@/lib/supabase/server";

// ─────────────────────────────────────────────────────────────────────────────
//  타입 정의
// ─────────────────────────────────────────────────────────────────────────────

/** RSVP 상태 — event_rsvps.status 가능 값 */
export type RsvpStatus =
  | "pending"
  | "going"
  | "waiting"
  | "cancelled"
  | "rejected";

/** RSVP 한 건 (신청자 관리 목록 표시용) */
export interface RsvpRow {
  event_id: string;
  user_id: string;
  status: RsvpStatus;
  show_profile: boolean;
  waiting_position: number | null;
  approved_at: string | null;
  approved_by: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  /** profiles JOIN — 표시명 (null 이면 ID 표시) */
  display_name: string | null;
  /** profiles JOIN — 이메일 */
  email: string | null;
}

/** 興味あり (event_interests) 한 건 */
export interface InterestRow {
  event_id: string;
  user_id: string;
  status: string;
  show_profile: boolean;
  created_at: string;
  /** profiles JOIN */
  display_name: string | null;
  email: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
//  쿼리 함수
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 이벤트 신청자 목록 조회 (관리자/운영자 전용).
 *
 * RLS event_rsvps_select: is_circle_staff(events.circle_id) OR is_admin() 로 허용.
 * profiles 테이블을 LEFT JOIN 해 표시명·이메일을 한 번에 가져온다.
 *
 * @param eventId  - 이벤트 UUID
 * @param status   - 필터 상태 (undefined 이면 전체)
 * @returns        - RsvpRow[] (created_at 오름차순)
 */
export async function listEventRsvps(
  eventId: string,
  status?: RsvpStatus
): Promise<RsvpRow[]> {
  // Fluid compute 대응: 매번 새로 생성
  const supabase = await createClient();

  // profiles 를 LEFT JOIN 해 display_name, email 취득
  // Supabase PostgREST: 외래키 없는 테이블은 !inner 대신 수동 힌트 필요.
  // event_rsvps.user_id → profiles.id (FK 없어도 .select 중첩 가능)
  let query = supabase
    .from("event_rsvps")
    .select(
      `
      event_id,
      user_id,
      status,
      show_profile,
      waiting_position,
      approved_at,
      approved_by,
      rejected_at,
      rejection_reason,
      cancelled_at,
      created_at,
      updated_at,
      profiles!event_rsvps_user_id_fkey (
        display_name,
        email
      )
    `
    )
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  // 상태 필터 적용 (undefined 이면 전체 반환)
  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[listEventRsvps]", error.message);
    return [];
  }

  // profiles JOIN 결과를 flat 구조로 변환
  // Supabase FK 힌트 JOIN 은 TypeScript 상 배열로 추론되므로 unknown 을 통해 캐스트
  return (data ?? []).map((row) => {
    const profileRaw = row.profiles as unknown;
    const profile = Array.isArray(profileRaw)
      ? (profileRaw[0] as { display_name: string | null; email: string | null } | undefined) ?? null
      : (profileRaw as { display_name: string | null; email: string | null } | null);
    return {
      event_id: row.event_id,
      user_id: row.user_id,
      status: row.status as RsvpStatus,
      show_profile: row.show_profile,
      waiting_position: row.waiting_position,
      approved_at: row.approved_at,
      approved_by: row.approved_by,
      rejected_at: row.rejected_at,
      rejection_reason: row.rejection_reason,
      cancelled_at: row.cancelled_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
      display_name: profile?.display_name ?? null,
      email: profile?.email ?? null,
    };
  });
}

/**
 * 興味あり (event_interests) 목록 조회 (관리자/운영자 전용).
 *
 * RLS event_interests_select: true (전체 공개) — 운영자도 조회 가능.
 * light 모드 이벤트에서 「興味あり」를 클릭한 사용자 목록.
 *
 * @param eventId - 이벤트 UUID
 * @returns       - InterestRow[] (created_at 오름차순)
 */
export async function listEventInterests(
  eventId: string
): Promise<InterestRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("event_interests")
    .select(
      `
      event_id,
      user_id,
      status,
      show_profile,
      created_at,
      profiles!event_interests_user_id_fkey (
        display_name,
        email
      )
    `
    )
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[listEventInterests]", error.message);
    return [];
  }

  return (data ?? []).map((row) => {
    // Supabase FK 힌트 JOIN 은 TypeScript 상 배열로 추론되므로 unknown 을 통해 캐스트
    const profileRaw = row.profiles as unknown;
    const profile = Array.isArray(profileRaw)
      ? (profileRaw[0] as { display_name: string | null; email: string | null } | undefined) ?? null
      : (profileRaw as { display_name: string | null; email: string | null } | null);
    return {
      event_id: row.event_id,
      user_id: row.user_id,
      status: row.status,
      show_profile: row.show_profile,
      created_at: row.created_at,
      display_name: profile?.display_name ?? null,
      email: profile?.email ?? null,
    };
  });
}
