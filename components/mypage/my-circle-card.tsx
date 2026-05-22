/**
 * 내 서클 카드 컴포넌트
 * 마이페이지 /mypage/circles 에서 사용자가 등록한 서클 1건을 표시하는 카드.
 * 서버 컴포넌트 — "use client" 없음. 정적 마크업/스타일 전용.
 *
 * 편집 버튼 정책 (T-018-edit):
 *  - approved: 「編集する」 → /circles/{id}/edit 링크
 *  - pending:  「編集する」 → /circles/{id}/edit 링크 (심사 중에도 수정 가능)
 *  - rejected: 「修正して再申請」 → /circles/{id}/edit 링크 (강조 스타일, 却下理由 박스 유지)
 */

import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CATEGORY_LABELS } from "@/lib/constants/category";
import { getOfficialTypeDisplayLabel } from "@/lib/constants/official-type";
import { CIRCLE_STATUS_LABELS } from "@/lib/constants/circle-status";
import { type MyCircle } from "@/lib/supabase/queries/circles";
import { cn } from "@/lib/utils";

/** 컴포넌트 props 타입 */
interface MyCircleCardProps {
  /** 표시할 내 서클 데이터 */
  circle: MyCircle;
  /** 외부에서 카드 루트에 추가할 클래스명 */
  className?: string;
}

/**
 * status 값에 따른 심사 상태 뱃지를 반환한다.
 * - approved (公開中) → keio-navy 배경의 커스텀 뱃지
 * - pending  (審査中) → secondary 뱃지
 * - rejected (却下)  → destructive 뱃지
 */
function StatusBadge({ status }: { status: MyCircle["status"] }) {
  /* 상태별 뱃지 라벨 텍스트 */
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

/** 내 서클 카드 */
export function MyCircleCard({ circle, className }: MyCircleCardProps) {
  /* official_type 표시 라벨: athletics / intercollegiate 만 반환, 나머지 null */
  const officialTypeLabel = getOfficialTypeDisplayLabel(circle.official_type);

  return (
    <Card className={cn("w-full", className)}>
      <CardContent className="p-4">
        {/* ── 상단 행: 서클명 + 심사 상태 뱃지 ── */}
        <div className="flex items-start justify-between gap-3">
          {/* 서클명: 최대 2줄, 이후 말줄임 */}
          <h3 className="line-clamp-2 min-w-0 flex-1 text-sm leading-snug font-semibold">
            {circle.name}
          </h3>

          {/* 심사 상태 뱃지 */}
          <StatusBadge status={circle.status} />
        </div>

        {/* ── 카테고리 · official_type 라벨 ── */}
        <p className="text-muted-foreground mt-1.5 text-sm">
          {CATEGORY_LABELS[circle.category]}
          {/* 体育会 / インカレ 일 때만 가운데점으로 구분하여 표시 */}
          {officialTypeLabel && <span> · {officialTypeLabel}</span>}
        </p>

        {/* ── 거절 사유 박스: rejected 이고 사유가 있을 때만 표시 ── */}
        {circle.status === "rejected" && circle.rejection_reason && (
          <div className="bg-destructive/10 text-destructive mt-3 rounded-md px-3 py-2 text-sm">
            {/* TODO: 관리자가 입력한 거절 사유를 표시 */}
            却下理由: {circle.rejection_reason}
          </div>
        )}

        {/* ── 하단 구분선 + 편집 버튼 ── */}
        {/* 모든 status 에서 편집 활성. rejected 는 강조 스타일 + 재신청 문구. */}
        <div className="mt-3 border-t pt-3">
          {circle.status === "rejected" ? (
            // 却下: 강조 스타일(keio-navy 배경) + 재신청 문구
            <Button
              asChild
              className="bg-keio-navy text-keio-navy-foreground h-9 w-full rounded-lg text-sm font-semibold hover:opacity-90"
            >
              <Link href={`/circles/${circle.id}/edit`}>修正して再申請</Link>
            </Button>
          ) : (
            // approved / pending: 일반 outline 스타일 편집 버튼
            <Button asChild variant="outline" className="h-9 w-full rounded-lg text-sm">
              <Link href={`/circles/${circle.id}/edit`}>編集する</Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
