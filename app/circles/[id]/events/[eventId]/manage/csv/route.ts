/**
 * app/circles/[id]/events/[eventId]/manage/csv/route.ts
 *
 * イベント申込者CSV ダウンロード Route Handler (T-024 산출물).
 *
 * ── Defense in Depth 권한 검증 ────────────────────────────────────────────
 * GET 요청 시 server 클라이언트로 인증·운영자 권한 2회 검증.
 * 미인증 또는 비운영자는 401/403 JSON 반환.
 *
 * ── CSV 형식 ─────────────────────────────────────────────────────────────
 * - 인코딩: UTF-8 with BOM (﻿) — Excel 일본어 문자 깨짐 방지
 * - 헤더: 일본어 (氏名, ニックネーム, 申込日, ステータス, 承認日)
 * - 파일명: event-{eventId}-rsvps-{yyyymmdd}.csv
 * - Content-Type: text/csv; charset=utf-8
 * - Content-Disposition: attachment
 *
 * ── 데이터 소스 ─────────────────────────────────────────────────────────
 * listEventRsvps() 로 event_rsvps + profiles JOIN 결과 사용.
 */

import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { listEventRsvps } from "@/lib/supabase/queries/event-rsvps";
import { formatJst } from "@/lib/format/jst";

// ─────────────────────────────────────────────────────────────────────────────
//  헬퍼: CSV 셀 이스케이프
// ─────────────────────────────────────────────────────────────────────────────

/**
 * CSV 셀 값 이스케이프.
 * - 쉼표·쌍따옴표·개행이 포함된 경우 쌍따옴표로 감싸고, 내부 쌍따옴표는 ""로 이스케이프.
 * - null/undefined 는 빈 문자열 처리.
 */
function escapeCsvCell(value: string | null | undefined): string {
  if (value == null) return "";
  const str = String(value);
  // 특수 문자(쉼표·따옴표·개행)가 없으면 그대로 반환
  if (!/[",\n\r]/.test(str)) return str;
  // 쌍따옴표는 두 번 반복하여 이스케이프
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * RSVP 상태 → 일본어 표시 라벨 변환.
 */
function statusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: "審査中",
    going: "参加予定",
    waiting: "キャンセル待ち",
    cancelled: "キャンセル",
    rejected: "拒否",
  };
  return map[status] ?? status;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Route Handler
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; eventId: string }> }
): Promise<NextResponse> {
  // ── 0. params 언래핑 ────────────────────────────────────────────────
  const { id: circleId, eventId } = await params;

  // ── 1. Supabase 클라이언트 생성 ─────────────────────────────────────
  const supabase = await createClient();

  // ── 2-1. Defense in Depth: 인증 확인 ──────────────────────────────
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── 2-2. Defense in Depth: 운영자 권한 확인 ───────────────────────
  const { data: isStaff } = await supabase.rpc("is_circle_staff", {
    _circle_id: circleId,
  });
  if (!isStaff) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ── 3. 신청자 목록 조회 ──────────────────────────────────────────
  const rsvps = await listEventRsvps(eventId);

  // ── 4. CSV 문자열 생성 ───────────────────────────────────────────
  // UTF-8 BOM — Excel でのJapanese文字化け防止
  const BOM = "﻿";

  // 헤더行
  const header = [
    "氏名",
    "ニックネーム",
    "申込日時",
    "ステータス",
    "承認日時",
    "ウェイティング順位",
  ].join(",");

  // データ行
  const rows = rsvps.map((r) => {
    return [
      escapeCsvCell(r.display_name ?? r.user_id),
      // ニックネーム = display_name (本プロジェクトでは表示名 = ニックネーム)
      escapeCsvCell(r.display_name),
      // 申込日時: JST 表示
      escapeCsvCell(formatJst(r.created_at, "yyyy/MM/dd HH:mm")),
      escapeCsvCell(statusLabel(r.status)),
      // 承認日時: null なら空
      escapeCsvCell(r.approved_at ? formatJst(r.approved_at, "yyyy/MM/dd HH:mm") : null),
      // ウェイティング順位: null なら空
      escapeCsvCell(r.waiting_position != null ? String(r.waiting_position) : null),
    ].join(",");
  });

  const csvContent = BOM + [header, ...rows].join("\r\n");

  // ── 5. ファイル名生成 ─────────────────────────────────────────────
  // yyyymmdd 形式 (JST 기준 오늘 날짜)
  const today = formatJst(new Date().toISOString(), "yyyyMMdd");
  const fileName = `event-${eventId}-rsvps-${today}.csv`;

  // ── 6. レスポンス返却 ─────────────────────────────────────────────
  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      // RFC 6266 準拠: filename*=UTF-8'' でファイル名エンコード
      "Content-Disposition": `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    },
  });
}
