/**
 * CircleMetrics — 運営 카드의 2분할 지표 그리드 (approved 전용).
 *
 * 표시 항목:
 * 1. 閲覧数 (view_count)   — Eye 아이콘
 * 2. 問合数 (inquiry_count) — Mail 아이콘
 *
 * 부원 수(部員数)는 숫자 직접 표시 대신 approved 카드의
 * member_band 뱃지로 표시하므로 메트릭에서 제거 (2026-05 개편).
 *
 * 숫자는 toLocaleString() 으로 천 단위 구분 처리.
 * 서버 컴포넌트 — 모션 없음 (부모 stagger variant 에서 처리).
 */

import { Eye, Mail } from "lucide-react";

import { cn } from "@/lib/utils";

interface CircleMetricsProps {
  /** 총 조회수 */
  viewCount: number;
  /** 문의 수 */
  inquiryCount: number;
  /** 외부에서 추가할 클래스명 */
  className?: string;
}

/** 메트릭 1개 셀 — 아이콘 + 숫자 + 라벨 */
function MetricCell({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-md border px-2 py-3">
      {/* 아이콘 */}
      <span className="text-muted-foreground" aria-hidden="true">
        {icon}
      </span>
      {/* 숫자 — 천 단위 구분 */}
      <span className="text-sm leading-none font-semibold tabular-nums">
        {value.toLocaleString()}
      </span>
      {/* 라벨 */}
      <span className="text-muted-foreground text-[11px] leading-none">{label}</span>
    </div>
  );
}

export function CircleMetrics({ viewCount, inquiryCount, className }: CircleMetricsProps) {
  return (
    <div className={cn("grid grid-cols-2 gap-2", className)} aria-label="サークル運営指標">
      <MetricCell icon={<Eye className="size-4" />} value={viewCount} label="閲覧" />
      <MetricCell icon={<Mail className="size-4" />} value={inquiryCount} label="問合" />
    </div>
  );
}
