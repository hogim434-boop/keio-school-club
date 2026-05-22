"use client";

/**
 * ManagedCircleCard — 마이페이지 운영 카드 (핵심 컴포넌트).
 *
 * props: circle: MyCircle
 *
 * status 별 분기:
 * - approved: 커버 이미지 + 메트릭 3종 + 모집 상태 뱃지 + "編集する" 링크 (작동)
 * - pending:  커버 이미지 + 審査中 안내 박스(amber) + 편집 버튼 비활성
 * - rejected: 커버 이미지 + 却下理由 박스(destructive) + 편집 버튼 비활성
 *
 * 모션:
 * - 카드 루트: whileTap scale 0.97 + SPRING_PRESS (reduced-motion 시 비활성)
 * - 진입 stagger 는 부모 MyPageView 의 enterItem variant 으로 처리
 *
 * 접근성: useReducedMotion() 으로 whileTap 우회.
 */

import Image from "next/image";
import Link from "next/link";
import { Construction, Users } from "lucide-react";
import { useReducedMotion } from "motion/react";
import * as m from "motion/react-m";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CATEGORY_LABELS } from "@/lib/constants/category";
import { CIRCLE_STATUS_LABELS } from "@/lib/constants/circle-status";
import { MEMBER_BAND_LABELS } from "@/lib/constants/member-band";
import { getOfficialTypeDisplayLabel } from "@/lib/constants/official-type";
import { SPRING_PRESS } from "@/lib/motion/tokens";
import { type MyCircle } from "@/lib/supabase/queries/circles";
import { cn } from "@/lib/utils";

import { CircleMetrics } from "./circle-metrics";
import { RecruitmentToggle } from "./recruitment-toggle";

interface ManagedCircleCardProps {
  circle: MyCircle;
  className?: string;
}

/**
 * 심사 상태 뱃지 — my-circle-card.tsx 의 StatusBadge 로직과 동일.
 * (별도 파일로 분리하지 않고 이 파일 안에 복제 — 두 컴포넌트가 각자 독립적으로 유지)
 */
function StatusBadge({ status }: { status: MyCircle["status"] }) {
  const label = CIRCLE_STATUS_LABELS[status];

  if (status === "approved") {
    return <Badge className="bg-keio-navy text-keio-navy-foreground shrink-0">{label}</Badge>;
  }
  if (status === "pending") {
    return (
      <Badge variant="secondary" className="shrink-0">
        {label}
      </Badge>
    );
  }
  /* rejected */
  return (
    <Badge variant="destructive" className="shrink-0">
      {label}
    </Badge>
  );
}

export function ManagedCircleCard({ circle, className }: ManagedCircleCardProps) {
  /* OS "동작 줄이기" 감지 — true 이면 whileTap 비활성 */
  const shouldReduceMotion = useReducedMotion();

  /* official_type 표시 라벨: athletics/intercollegiate 만 반환, 나머지 null */
  const officialTypeLabel = getOfficialTypeDisplayLabel(circle.official_type);

  return (
    /* m.div: 카드 루트에 press 피드백 (whileTap scale 0.97) */
    <m.div
      whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
      transition={SPRING_PRESS}
      className={cn("w-full", className)}
    >
      <Card className="overflow-hidden p-0">
        {/* ── 커버 이미지 16:9 ── */}
        <div className="bg-muted relative aspect-video w-full">
          {circle.cover_image_url ? (
            <Image
              src={circle.cover_image_url}
              alt={circle.name}
              fill
              sizes="(max-width: 672px) 100vw, 672px"
              className="object-cover"
            />
          ) : (
            /* 커버 없을 때 Construction 아이콘 placeholder */
            <div className="text-muted-foreground flex h-full w-full items-center justify-center">
              <Construction className="size-10" aria-hidden="true" />
            </div>
          )}
        </div>

        <CardContent className="space-y-3 p-4">
          {/* ── 상단 행: 서클명 + 심사 상태 뱃지 ── */}
          <div className="flex items-start justify-between gap-3">
            <h3 className="line-clamp-2 min-w-0 flex-1 text-sm leading-snug font-semibold">
              {circle.name}
            </h3>
            <StatusBadge status={circle.status} />
          </div>

          {/* ── 카테고리 · official_type 라벨 ── */}
          <p className="text-muted-foreground text-sm">
            {CATEGORY_LABELS[circle.category]}
            {/* 体育会 / インカレ 일 때만 가운데점 구분 */}
            {officialTypeLabel && <span> · {officialTypeLabel}</span>}
          </p>

          {/* ── status 별 분기 본문 ── */}
          {circle.status === "approved" && <ApprovedContent circle={circle} />}
          {circle.status === "pending" && <PendingContent />}
          {circle.status === "rejected" && <RejectedContent circle={circle} />}
        </CardContent>
      </Card>
    </m.div>
  );
}

// ──────────────────────────────────────────────────────────────
// 상태별 분기 서브 컴포넌트
// ──────────────────────────────────────────────────────────────

/** approved: 메트릭(閲覧/問合 2분할) + 부원 수 범위 뱃지 + 모집 상태 토글 + 編集する 링크 */
function ApprovedContent({ circle }: { circle: MyCircle }) {
  return (
    <>
      {/* 카테고리 라벨 줄 아래에 부원 수 범위 뱃지 — member_band 있을 때만 표시 */}
      {circle.member_band && (
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="flex items-center gap-1 text-xs font-normal">
            {/* Users 아이콘으로 부원 범위임을 시각적으로 구분 */}
            <Users className="size-3" aria-hidden="true" />
            {MEMBER_BAND_LABELS[circle.member_band]}
          </Badge>
        </div>
      )}

      {/* 운영 지표 2분할 (閲覧 / 問合) — 部員 수 제거, member_band 뱃지로 대체 */}
      <CircleMetrics viewCount={circle.view_count} inquiryCount={circle.inquiry_count} />

      {/* 모집 상태 빠른 토글 (新歓シーズン ↔ 通年募集) — 별도 편집 없이 즉시 전환 */}
      {circle.recruitment_status && (
        <RecruitmentToggle circleId={circle.id} current={circle.recruitment_status} />
      )}

      {/* 編集する — 상세 페이지(/circles/[id]) 로 이동. 실제 작동하는 링크. */}
      <Button asChild className="h-10 w-full">
        <Link href={`/circles/${circle.id}`}>編集する</Link>
      </Button>
    </>
  );
}

/** pending: 審査中 안내 박스 + 편집 버튼 비활성 */
function PendingContent() {
  return (
    <>
      {/* 審査中 안내 — amber 톤 */}
      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-300">
        審査中です。公開までお待ちください。
      </div>

      {/* 편집 버튼 비활성 + 보조 텍스트 */}
      <div className="space-y-1.5">
        <Button disabled className="h-10 w-full" aria-disabled="true">
          編集する
        </Button>
        <p className="text-muted-foreground text-center text-xs">公開後に編集できます</p>
      </div>
    </>
  );
}

/** rejected: 却下理由 박스 + 편집 버튼 비활성 */
function RejectedContent({ circle }: { circle: MyCircle }) {
  return (
    <>
      {/* 却下理由 박스 — rejection_reason 있을 때만 표시 */}
      {circle.rejection_reason && (
        <div className="bg-destructive/10 text-destructive rounded-md px-3 py-2.5 text-sm">
          <span className="font-medium">却下理由: </span>
          {circle.rejection_reason}
        </div>
      )}

      {/* 편집 버튼 비활성 + 보조 텍스트 */}
      <div className="space-y-1.5">
        <Button disabled className="h-10 w-full" aria-disabled="true">
          編集する
        </Button>
        <p className="text-muted-foreground text-center text-xs">修正は近日対応</p>
      </div>
    </>
  );
}
