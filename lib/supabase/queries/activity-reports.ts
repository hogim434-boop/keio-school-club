/**
 * lib/supabase/queries/activity-reports.ts
 *
 * RSC에서 호출하는 activity_reports 관련 fetch 함수 모음.
 * Phase 1.2 T-009 와이어업 — lib/dummy/activity-reports.ts의 더미 데이터를 대체.
 *
 * 주의:
 * - createClient()는 함수 내부에서 매번 새로 생성
 * - activity_report_images는 JOIN으로 함께 fetch
 */

import { createClient } from "@/lib/supabase/server";
import type { ActivityReport } from "@/lib/types/domain";

// ============================================================
// 내부 매핑 헬퍼
// ============================================================

/** Supabase JOIN 결과 → ActivityReport 도메인 타입 변환 */
function toActivityReport(row: Record<string, unknown>): ActivityReport {
  // activity_report_images JOIN → images 배열
  const images = ((row.activity_report_images as Record<string, unknown>[]) ?? []).map((img) => ({
    id: img.id as string,
    image_url: img.image_url as string,
    sort_order: (img.sort_order as number) ?? 0,
  }));

  return {
    id: row.id as string,
    circle_id: row.circle_id as string,
    title: row.title as string,
    content: row.content as string,
    body: row.body as string,
    image_url: (row.image_url as string | null) ?? null,
    images,
    location: row.location as string | undefined,
    activity_type: row.activity_type as ActivityReport["activity_type"],
    created_at: row.created_at as string,
  };
}

// ============================================================
// 공개 fetch 함수
// ============================================================

/**
 * 서클별 활동 리포트 목록 — circles/[id] 게시판 탭 + 활동 리포트 미리보기에서 사용.
 * created_at 내림차순 정렬 (최신 순).
 *
 * @param circleId 서클 UUID
 * @param limit 취득 건수 (기본 전체)
 */
export async function getReportsByCircle(
  circleId: string,
  limit?: number
): Promise<ActivityReport[]> {
  const supabase = await createClient();
  let query = supabase
    .from("activity_reports")
    .select("*, activity_report_images(*)")
    .eq("circle_id", circleId)
    .order("created_at", { ascending: false });

  if (limit !== undefined) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[getReportsByCircle]", error.message);
    return [];
  }
  return (data ?? []).map((row) => toActivityReport(row as Record<string, unknown>));
}

/**
 * 활동 리포트 상세 1건 — circles/[id]/reports/[reportId] 페이지에서 사용.
 * activity_report_images 포함.
 *
 * @param reportId 리포트 UUID
 */
export async function getReportById(reportId: string): Promise<ActivityReport | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activity_reports")
    .select("*, activity_report_images(*)")
    .eq("id", reportId)
    .maybeSingle();

  if (error) {
    console.error("[getReportById]", error.message);
    return null;
  }
  if (!data) return null;
  return toActivityReport(data as Record<string, unknown>);
}
