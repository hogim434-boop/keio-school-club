/**
 * lib/supabase/queries/events-public.ts
 *
 * 이벤트 공개 단건 조회 쿼리 (T-014 산출물).
 *
 * 설계 원칙:
 * - anon 클라이언트 사용 — unstable_cache 내부에서는 cookies() 호출 금지.
 * - unstable_cache + tags:["events:public"] + revalidate:60 — 1분 캐싱.
 *   (이벤트는 서클 정보보다 변경이 잦을 수 있어 300→60초로 짧게 설정)
 * - circles 테이블 JOIN 으로 서클명·커버 이미지 한 번에 가져옴.
 * - visibility="members" 인 이벤트는 공개 페이지에서 notFound() 처리 — 쿼리 레벨에서 public 만 반환.
 *
 * T-018 이후 (Wave 2):
 * - RSVP 카운트 / 댓글 수 추가 예정 — 현재는 미포함.
 */

import { unstable_cache } from "next/cache";

import { createAnonClient } from "@/lib/supabase/anon";
import type { EventDetail } from "@/lib/types/domain";

/**
 * DB JOIN 결과 row → EventDetail 도메인 타입 변환 헬퍼.
 *
 * Supabase 의 circles 테이블을 inner join 했을 때 반환되는 row 구조:
 * {
 *   ...events 컬럼,
 *   circles: { name: string; cover_image_url: string | null }
 * }
 */
function toEventDetail(row: Record<string, unknown>): EventDetail {
  // circles JOIN 결과 — Supabase 는 단일 JOIN 이면 객체, 복수면 배열
  const circle = (row.circles as { name: string; cover_image_url: string | null } | null) ?? {
    name: "",
    cover_image_url: null,
  };

  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string | null) ?? null,
    cover_image_url: (row.cover_image_url as string | null) ?? null,
    category: (row.category as string | null) ?? null,
    starts_at: row.starts_at as string,
    ends_at: (row.ends_at as string | null) ?? null,
    is_all_day: (row.is_all_day as boolean) ?? false,
    location: (row.location as string | null) ?? null,
    capacity: (row.capacity as number | null) ?? null,
    rsvp_deadline: (row.rsvp_deadline as string | null) ?? null,
    rsvp_mode: (row.rsvp_mode as "light" | "strict") ?? "light",
    requires_approval: (row.requires_approval as boolean) ?? false,
    visibility: (row.visibility as "public" | "members") ?? "public",
    cancelled_at: (row.cancelled_at as string | null) ?? null,
    cancellation_reason: (row.cancellation_reason as string | null) ?? null,
    circle_id: row.circle_id as string,
    circle_name: circle.name,
    circle_cover_image_url: circle.cover_image_url,
    created_at: row.created_at as string,
  };
}

/**
 * unstable_cache 내부 구현 — 실제 DB 쿼리 수행.
 *
 * circles 테이블을 inner join 해서 서클명·커버 이미지를 한 번에 가져온다.
 * visibility != 'public' 인 이벤트는 anon RLS 에 의해 SELECT 불가 → null 반환.
 * cancelled_at IS NOT NULL 인 이벤트도 공개 표시 (취소된 이벤트임을 페이지에서 알림).
 */
const _getEventByIdRaw = unstable_cache(
  async (id: string): Promise<EventDetail | null> => {
    const supabase = createAnonClient();

    const { data, error } = await supabase
      .from("events")
      .select(
        `
        id,
        circle_id,
        created_by,
        title,
        description,
        starts_at,
        ends_at,
        location,
        cover_image_url,
        category,
        visibility,
        is_all_day,
        rsvp_mode,
        capacity,
        rsvp_deadline,
        requires_approval,
        cancelled_at,
        cancellation_reason,
        created_at,
        updated_at,
        circles (
          name,
          cover_image_url
        )
      `
      )
      .eq("id", id)
      .eq("visibility", "public")
      .maybeSingle();

    if (error) {
      console.error("[getEventById]", error.message);
      return null;
    }

    if (!data) return null;

    return toEventDetail(data as Record<string, unknown>);
  },
  // cache key 배열 — id 별로 독립 캐시 엔트리 생성
  // unstable_cache 의 두 번째 인자(keyParts) + 함수 인자(id) 조합으로 캐시 키 결정
  ["events:public:detail"],
  // tags: T-020 운영자 이벤트 등록/수정 완료 시 revalidateTag("events:public") 로 즉시 무효화
  { tags: ["events:public"], revalidate: 60 }
);

/**
 * 이벤트 단건 공개 조회 (public export).
 *
 * - visibility="public" 인 이벤트만 반환. members 전용은 null 반환 → 페이지에서 notFound().
 * - 취소된 이벤트(cancelled_at IS NOT NULL)도 반환 — 취소 배너는 페이지에서 처리.
 * - 캐시: revalidate 60초 + tags:["events:public"]
 *
 * @param id - events.id UUID
 * @returns  - EventDetail | null
 */
export const getEventById = _getEventByIdRaw;

// ─────────────────────────────────────────────
//  캘린더 범위 조회 (T-019)
// ─────────────────────────────────────────────

/**
 * 날짜 범위 이벤트 조회 내부 구현 — unstable_cache 에 전달.
 *
 * from ~ to 는 JST 기준 월 첫째 날 00:00 ~ 마지막 날 23:59 UTC 문자열.
 * 캘린더 월 표시용이므로 starts_at 기준으로 필터링한다.
 * - cancelled_at IS NULL 인 이벤트만 반환 (취소된 이벤트는 캘린더에서 제외).
 * - visibility="public" 만 (anon RLS 와 동일).
 */
const _getUpcomingEventsByRangeRaw = unstable_cache(
  async (from: string, to: string): Promise<EventDetail[]> => {
    const supabase = createAnonClient();

    const { data, error } = await supabase
      .from("events")
      .select(
        `
        id,
        circle_id,
        created_by,
        title,
        description,
        starts_at,
        ends_at,
        location,
        cover_image_url,
        category,
        visibility,
        is_all_day,
        rsvp_mode,
        capacity,
        rsvp_deadline,
        requires_approval,
        cancelled_at,
        cancellation_reason,
        created_at,
        updated_at,
        circles (
          name,
          cover_image_url
        )
      `
      )
      .eq("visibility", "public")
      .is("cancelled_at", null)
      .gte("starts_at", from)
      .lte("starts_at", to)
      .order("starts_at", { ascending: true });

    if (error) {
      console.error("[getUpcomingEventsByRange]", error.message);
      return [];
    }

    if (!data) return [];

    return (data as Record<string, unknown>[]).map(toEventDetail);
  },
  // 캐시 키 배열 — from·to 파라미터가 포함돼 범위별로 독립 캐시 엔트리 생성
  ["events:public:range"],
  // T-020 이벤트 등록/수정 완료 시 revalidateTag("events:public") 로 즉시 무효화
  { tags: ["events:public"], revalidate: 60 }
);

/**
 * 날짜 범위 이벤트 공개 목록 조회 (캘린더·리스트 뷰 공용).
 *
 * @param from - 범위 시작 ISO 문자열 (UTC)  예: "2026-06-01T00:00:00+09:00"
 * @param to   - 범위 종료 ISO 문자열 (UTC)  예: "2026-06-30T23:59:59+09:00"
 * @returns    - EventDetail[] 시작일 오름차순
 */
export const getUpcomingEventsByRange = _getUpcomingEventsByRangeRaw;
