/**
 * 활동 종류 5종 — activity_reports.activity_type 컬럼의 enum 값.
 * Phase 1.2 시드 SQL 에 같은 enum 추가 예정.
 */
export const ACTIVITY_REPORT_TYPES = ["practice", "camp", "event", "meeting", "other"] as const;

export type ActivityReportType = (typeof ACTIVITY_REPORT_TYPES)[number];

export const ACTIVITY_REPORT_TYPE_LABELS: Record<ActivityReportType, string> = {
  practice: "練習",
  camp: "合宿",
  event: "イベント",
  meeting: "ミーティング",
  other: "その他",
};
