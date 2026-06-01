/**
 * lib/supabase/queries/event-comments.ts
 *
 * 이벤트 댓글 관련 Server-side fetch 함수.
 *
 * 구현 전략:
 * - event_comments + profiles JOIN 으로 작성자 표시명 함께 취득.
 * - DB 에서 flat 목록을 받아 서버에서 parent/children 구조로 nest.
 * - parent_id IS NULL → 최상위 댓글, parent_id NOT NULL → 답글 (1단계 고정).
 * - 최신 순 정렬 (created_at DESC) — 단, 최상위 내부에서 답글은 오름차순 표시.
 *
 * 캐싱 정책:
 * - 댓글은 개인화 데이터 없음 → createAnonClient() + unstable_cache 가능하나
 *   삭제·작성 직후 Server Action 에서 revalidateTag("events:comments") 로 무효화.
 * - TTL 30초 + tag 무효화 조합.
 */

import { unstable_cache } from "next/cache";

import { createAnonClient } from "@/lib/supabase/anon";
import type { EventComment } from "@/lib/types/domain";

// ─────────────────────────────────────────────────────────────────────────────
// 내부 타입 — Supabase JOIN 결과 raw row
// ─────────────────────────────────────────────────────────────────────────────

interface RawCommentRow {
  id: string;
  event_id: string;
  user_id: string;
  parent_id: string | null;
  body: string;
  created_at: string;
  /** profiles 테이블 LEFT JOIN 결과 */
  profiles: { display_name: string | null } | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 매핑 헬퍼
// ─────────────────────────────────────────────────────────────────────────────

/** raw Supabase row → EventComment 도메인 타입 변환 */
function toEventComment(row: RawCommentRow): EventComment {
  return {
    id: row.id,
    event_id: row.event_id,
    user_id: row.user_id,
    parent_id: row.parent_id ?? null,
    body: row.body,
    created_at: row.created_at,
    // profiles JOIN — display_name 없으면 null (익명 표시는 컴포넌트 책임)
    author_display_name: row.profiles?.display_name ?? null,
  };
}

/**
 * flat 배열 → parent/children 2단계 트리 구조 변환.
 *
 * 규칙:
 * - parent_id IS NULL → 최상위 (parents 배열)
 * - parent_id NOT NULL → 해당 parent.children 에 추가
 * - parent 의 parent 는 존재하지 않음 (DB level 1단계 제약 + UI 차단 병행)
 *
 * 최상위 정렬: created_at DESC (최신 먼저).
 * 답글 정렬: created_at ASC (시간순 — 대화 흐름 가독성).
 */
function nestComments(flat: EventComment[]): EventComment[] {
  // parent_id → parent EventComment 인덱스 맵
  const parentMap = new Map<string, EventComment>();

  const parents: EventComment[] = [];

  // 1회차: parent 먼저 수집
  for (const c of flat) {
    if (c.parent_id === null) {
      const node: EventComment = { ...c, children: [] };
      parents.push(node);
      parentMap.set(c.id, node);
    }
  }

  // 2회차: children 을 해당 parent 에 연결
  for (const c of flat) {
    if (c.parent_id !== null) {
      const parent = parentMap.get(c.parent_id);
      if (parent && parent.children) {
        parent.children.push(c);
      }
      // 고아 댓글(parent 미존재) 은 무시 — 방어 로직
    }
  }

  // 최상위: 최신 순 (DESC)
  parents.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // 각 parent 의 자식: 시간 순 (ASC) — 대화 흐름 가독성
  for (const parent of parents) {
    parent.children?.sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }

  return parents;
}

// ─────────────────────────────────────────────────────────────────────────────
// 공개 fetch 함수
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 이벤트별 댓글 목록 — parent + children 2단계 nest 구조.
 *
 * - SELECT: event_comments + profiles(display_name) LEFT JOIN.
 * - 캐싱: unstable_cache, TTL 30초, tags:["events:comments"].
 * - revalidateTag("events:comments") 로 createEventComment / deleteEventComment 시 무효화.
 *
 * @param eventId - 대상 이벤트 UUID
 * @returns         최상위 댓글 배열 (각 항목에 children: EventComment[] 포함)
 */
export const getEventComments = unstable_cache(
  async (eventId: string): Promise<EventComment[]> => {
    const supabase = createAnonClient();

    const { data, error } = await supabase
      .from("event_comments")
      .select(
        `
        id,
        event_id,
        user_id,
        parent_id,
        body,
        created_at,
        profiles ( display_name )
      `
      )
      .eq("event_id", eventId)
      // created_at 오름차순으로 모두 가져온 뒤 nest 함수에서 재정렬
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[getEventComments]", error.message);
      return [];
    }

    // raw row 를 도메인 타입으로 변환 후 nest
    const flat = (data ?? []).map((row) => toEventComment(row as unknown as RawCommentRow));
    return nestComments(flat);
  },
  ["events", "event-comments"],
  { revalidate: 30, tags: ["events:comments"] }
);
