/**
 * CircleMetrics — 運営 카드의 지표 표시 (approved 전용).
 *
 * 표시 항목:
 * 1. 閲覧数 (view_count)   — Eye 아이콘
 * 2. 問合数 (inquiry_count) — Mail 아이콘
 * 3. (compact 한정) 部員数 범위 — memberBandLabel 이 있을 때만
 *
 * variant:
 * - "grid"(기본): 2분할 박스 그리드 (큰 카드)
 * - "compact": 한 줄 텍스트 (閲覧 N・問合 N・部員band) — 카드 세로 길이 절감용 (2026-06 개편)
 *
 * 숫자는 toLocaleString() 으로 천 단위 구분 처리.
 * 서버 컴포넌트 — 모션 없음 (부모 stagger variant 에서 처리).
 */

import { Eye, Mail, Users } from "lucide-react";

import { cn } from "@/lib/utils";
import { MESSAGING_ENABLED } from "@/lib/constants/features";

interface CircleMetricsProps {
  /** 총 조회수 */
  viewCount: number;
  /** 문의 수 */
  inquiryCount: number;
  /** compact 변형에서만 사용 — 부원 수 범위 라벨(있을 때만 표시) */
  memberBandLabel?: string | null;
  /** 표시 변형 */
  variant?: "grid" | "compact";
  /** 외부에서 추가할 클래스명 */
  className?: string;
}

/** grid 변형: 메트릭 1개 셀 — 아이콘 + 숫자 + 라벨 */
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
      <span className="text-muted-foreground" aria-hidden="true">
        {icon}
      </span>
      <span className="text-sm leading-none font-semibold tabular-nums">
        {value.toLocaleString()}
      </span>
      <span className="text-muted-foreground text-[11px] leading-none">{label}</span>
    </div>
  );
}

/** compact 변형: 한 줄 텍스트 지표 (아이콘 + 라벨 + 숫자) */
function CompactStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <span className="flex items-center gap-1">
      <span className="text-muted-foreground/70" aria-hidden="true">
        {icon}
      </span>
      <span>{label}</span>
      <span className="text-foreground font-semibold tabular-nums">{value}</span>
    </span>
  );
}

export function CircleMetrics({
  viewCount,
  inquiryCount,
  memberBandLabel,
  variant = "grid",
  className,
}: CircleMetricsProps) {
  if (variant === "compact") {
    return (
      <div
        className={cn(
          "text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs",
          className
        )}
        aria-label="サークル運営指標"
      >
        <CompactStat
          icon={<Eye className="size-3.5" />}
          label="閲覧"
          value={viewCount.toLocaleString()}
        />
        {/* 問合(문의 수) — MESSAGING_ENABLED=false(시드 단계) 동안 숨김.
            문의를 받을 수 없는 상태이므로 지표 자체를 노출하지 않는다. */}
        {MESSAGING_ENABLED && (
          <CompactStat
            icon={<Mail className="size-3.5" />}
            label="問合"
            value={inquiryCount.toLocaleString()}
          />
        )}
        {memberBandLabel && (
          <CompactStat icon={<Users className="size-3.5" />} label="部員" value={memberBandLabel} />
        )}
      </div>
    );
  }

  return (
    <div
      className={cn("grid gap-2", MESSAGING_ENABLED ? "grid-cols-2" : "grid-cols-1", className)}
      aria-label="サークル運営指標"
    >
      <MetricCell icon={<Eye className="size-4" />} value={viewCount} label="閲覧" />
      {/* 問合 — MESSAGING_ENABLED=false 동안 숨김 (셀이 빠지면 1열) */}
      {MESSAGING_ENABLED && (
        <MetricCell icon={<Mail className="size-4" />} value={inquiryCount} label="問合" />
      )}
    </div>
  );
}
