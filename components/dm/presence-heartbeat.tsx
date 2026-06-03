"use client";

/**
 * components/dm/presence-heartbeat.tsx
 *
 * 운영진 presence(온라인 상태) heartbeat 전용 Client Component.
 *
 * ── 동작 개요 ─────────────────────────────────────────────────────────────────
 * 마운트 시점:
 *   1) presence 테이블에 { user_id, circle_id, last_seen_at: now() } upsert.
 *   2) 5분마다 last_seen_at 을 갱신(interval heartbeat).
 *
 * 언마운트(페이지 이탈) 시점:
 *   1) clearInterval 로 heartbeat 해제.
 *   2) { circle_id: null, last_seen_at: now() } upsert — best-effort 오프라인 기록.
 *
 * ── 주의: beforeunload 는 모바일에서 미보장 ───────────────────────────────────
 * beforeunload / visibilitychange 는 모바일 Safari 에서 실행을 보장하지 않음.
 * 따라서 오프라인 판정은 표시측(T-028 dm-thread, T-029 inbox-list 등)에서
 * last_seen_at 이 5분 경과했으면 오프라인으로 간주하는 방식으로 보완한다.
 * 이 컴포넌트의 언마운트 upsert 는 best-effort 처리.
 *
 * ── UI 없음 ───────────────────────────────────────────────────────────────────
 * 부수효과(side-effect) 전용 컴포넌트. 렌더 결과는 null.
 *
 * ── 3-context 패턴 ───────────────────────────────────────────────────────────
 * presence upsert 는 브라우저 클라이언트(lib/supabase/client.ts)를 사용.
 * Server Component 에서 uid 를 받아 props 로 전달 — 클라이언트에서 별도 조회 불필요.
 *
 * @props circleId - presence.circle_id 에 기록할 서클 UUID
 * @props userId   - 현재 로그인한 사용자 UUID (Server Component 에서 getClaims() 로 취득)
 */

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface PresenceHeartbeatProps {
  /** 온라인 상태를 기록할 서클 UUID */
  circleId: string;
  /** 현재 로그인 사용자 UUID (server 에서 props 로 전달) */
  userId: string;
}

/** heartbeat 간격: 5분(밀리초) */
const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000;

export function PresenceHeartbeat({ circleId, userId }: PresenceHeartbeatProps) {
  useEffect(() => {
    // 브라우저 클라이언트 — 3-context 패턴, Realtime/DB 조작은 createBrowserClient 사용
    const supabase = createClient();

    /**
     * presence 테이블에 현재 상태를 upsert하는 헬퍼.
     * onConflict: "user_id" — 이미 행이 있으면 UPDATE, 없으면 INSERT.
     */
    const upsertPresence = async (targetCircleId: string | null) => {
      const { error } = await supabase.from("presence").upsert(
        {
          user_id: userId,
          circle_id: targetCircleId,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

      if (error) {
        // 네트워크 오류 등은 무시 — presence 는 best-effort
        console.warn("[PresenceHeartbeat] upsert 실패:", error.message);
      }
    };

    // ── 마운트: 즉시 온라인 상태 기록 ────────────────────────────────────
    upsertPresence(circleId);

    // ── 5분 간격 heartbeat ─────────────────────────────────────────────
    const intervalId = setInterval(() => {
      upsertPresence(circleId);
    }, HEARTBEAT_INTERVAL_MS);

    // ── 언마운트: 오프라인 기록 + interval 해제 ──────────────────────────
    return () => {
      // interval 먼저 해제 (이후 upsert 의 경쟁 조건 방지)
      clearInterval(intervalId);

      // circle_id = null 로 오프라인 기록 — best-effort
      // 모바일에서는 보장되지 않으므로 표시측에서 5분 경과 판정을 병행한다.
      upsertPresence(null);
    };
  }, [circleId, userId]); // circleId/userId 가 변경되면 재마운트

  // UI 없음 — 부수효과 전용
  return null;
}
