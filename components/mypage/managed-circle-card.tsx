"use client";

/**
 * ManagedCircleCard — 마이페이지 운영 카드 (핵심 컴포넌트).
 *
 * props: circle: MyCircle, onRequestDelete: () => void
 *
 * status 별 분기:
 * - approved: 커버 이미지 + 메트릭 3종 + 모집 상태 뱃지 + "編集する" 링크 (작동)
 * - pending:  커버 이미지 + 審査中 안내 박스(amber) + 편집 버튼 비활성
 * - rejected: 커버 이미지 + 却下理由 박스(destructive) + 편집 버튼 비활성
 *
 * 삭제 기능:
 * - 카드 우상단 ⋯ (MoreVertical) 버튼 → DropdownMenu → 「削除する」
 * - AlertDialog 로 최종 확인 후 onRequestDelete() 호출
 * - DropdownMenu + AlertDialog 포커스 충돌 방지를 위해 controlled state 사용
 *
 * 모션:
 * - 카드 루트: whileTap scale 0.97 + SPRING_PRESS (reduced-motion 시 비활성)
 * - 진입 stagger 는 부모 MyPageView 의 enterItem variant 으로 처리
 *
 * 접근성: useReducedMotion() 으로 whileTap 우회.
 */

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Construction, Ellipsis, Trash2, Users } from "lucide-react";
import { useReducedMotion } from "motion/react";
import * as m from "motion/react-m";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CATEGORY_LABELS } from "@/lib/constants/category";
import { CIRCLE_STATUS_LABELS } from "@/lib/constants/circle-status";
import { MEMBER_BAND_LABELS } from "@/lib/constants/member-band";
import { getOfficialTypeDisplayLabel } from "@/lib/constants/official-type";
import { SPRING_PRESS } from "@/lib/motion/tokens";
import { type MyCircle } from "@/lib/supabase/queries/circles";
import { cn } from "@/lib/utils";

import { CircleMetrics } from "./circle-metrics";
import { ProfileCompletion } from "./profile-completion";
import { RecruitmentToggle } from "./recruitment-toggle";

interface ManagedCircleCardProps {
  circle: MyCircle;
  /** 삭제 확인 다이얼로그 → OK 시 부모(MyPageView)의 handleDelete 를 호출 */
  onRequestDelete: () => void;
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

export function ManagedCircleCard({ circle, onRequestDelete, className }: ManagedCircleCardProps) {
  /* OS "동작 줄이기" 감지 — true 이면 whileTap 비활성 */
  const shouldReduceMotion = useReducedMotion();

  /* 카드 클릭 시 상세 페이지로 이동시키기 위한 router */
  const router = useRouter();

  /*
   * DropdownMenu + AlertDialog 포커스 충돌 방지를 위해 controlled state 사용.
   * - menuOpen: 드롭다운 열림 여부 / dialogOpen: 삭제 확인 다이얼로그 열림 여부
   * (goToDetail 의 click-through 가드에서 두 상태를 참조하므로 먼저 선언)
   */
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  /*
   * 내비게이션 잠금(navGrace):
   * Radix DropdownMenu/AlertDialog(modal)를 닫을 때, 그 click 이 카드 뒤로 "관통"되어
   * 카드 루트의 onClick(goToDetail)이 잘못 호출되는 click-through 버그가 있다.
   * (예: ⋯ 메뉴에서 「削除する」 선택 → 메뉴 닫힘 → 클릭이 카드로 떨어져 상세 페이지로 이동)
   * → 메뉴/다이얼로그가 열려 있는 동안 + 닫힌 직후 짧은 유예 동안 goToDetail 을 차단한다.
   */
  const navGraceRef = useRef(false);
  const graceTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const startNavGrace = useCallback(() => {
    navGraceRef.current = true;
    if (graceTimerRef.current) clearTimeout(graceTimerRef.current);
    graceTimerRef.current = setTimeout(() => {
      navGraceRef.current = false;
    }, 300);
  }, []);

  /**
   * 카드 클릭/Enter → 상세 페이지 이동.
   * 미승인(審査中·却下) 서클도 소유자는 RLS 로 상세(프리뷰)를 볼 수 있다.
   * 카드 내부의 버튼·토글·메뉴는 stopPropagation 으로 이 이동에서 제외된다.
   * 메뉴/다이얼로그가 열려 있거나 막 닫힌 직후(navGrace)에는 이동을 막아 click-through 를 차단.
   */
  const goToDetail = () => {
    if (menuOpen || dialogOpen || navGraceRef.current) return;
    router.push(`/circles/${circle.id}`);
  };

  /* official_type 표시 라벨: athletics/intercollegiate 만 반환, 나머지 null */
  const officialTypeLabel = getOfficialTypeDisplayLabel(circle.official_type);

  /** 메뉴의 「削除する」 클릭 핸들러 */
  const handleDeleteMenuClick = () => {
    // 메뉴 닫힘 → 카드로의 click-through 방지를 위해 내비게이션 잠금 시작
    startNavGrace();
    // 메뉴를 먼저 닫은 뒤 다이얼로그 열기
    setMenuOpen(false);
    // setTimeout 0: 메뉴 close 애니메이션이 끝나고 포커스가 트리거로 돌아온 뒤 다이얼로그 열림
    setTimeout(() => setDialogOpen(true), 0);
  };

  return (
    <>
      {/* m.div: 카드 루트에 press 피드백 (whileTap scale 0.97) */}
      <m.div
        whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
        transition={SPRING_PRESS}
        onClick={goToDetail}
        role="link"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            goToDetail();
          }
        }}
        aria-label={`${circle.name} の詳細を見る`}
        className={cn("w-full cursor-pointer", className)}
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
            {/* ── 상단 행: 서클명 + 심사 상태 뱃지 + ⋯ 메뉴 ── */}
            <div className="flex items-start justify-between gap-2">
              <h3 className="line-clamp-2 min-w-0 flex-1 text-sm leading-snug font-semibold">
                {circle.name}
              </h3>
              {/* 우상단 뱃지 + ⋯ 메뉴 묶음 */}
              <div className="flex shrink-0 items-center gap-1">
                <StatusBadge status={circle.status} />
                {/* ⋯ 더보기 메뉴 (삭제 등) */}
                <DropdownMenu
                  open={menuOpen}
                  onOpenChange={(open) => {
                    setMenuOpen(open);
                    // 메뉴 열림/닫힘 시 카드 click-through 방지
                    startNavGrace();
                  }}
                >
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-foreground size-7 shrink-0"
                      aria-label="メニューを開く"
                      // 메뉴 버튼 클릭이 카드 전체 클릭(상세 이동)으로 버블링되지 않도록 차단
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Ellipsis className="size-4" aria-hidden="true" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {/* 削除する — destructive variant(빨강) + 휴지통 아이콘 */}
                    <DropdownMenuItem variant="destructive" onSelect={handleDeleteMenuClick}>
                      <Trash2 aria-hidden="true" />
                      削除する
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* ── 카테고리 · official_type 라벨 ── */}
            <p className="text-muted-foreground text-sm">
              {CATEGORY_LABELS[circle.category]}
              {/* 体育会 / インカレ 일 때만 가운데점 구분 */}
              {officialTypeLabel && <span> · {officialTypeLabel}</span>}
            </p>

            {/* ── status 별 분기 본문 ──
                내부 버튼(編集)·모집 토글 클릭이 카드 전체 클릭(상세 이동)으로 버블링되지 않도록
                stopPropagation 래퍼로 감싼다. (메트릭 등 비인터랙티브 영역도 포함되지만,
                상세 이동은 커버·서클명·카테고리 영역 클릭으로 충분히 가능) */}
            <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
              {circle.status === "approved" && <ApprovedContent circle={circle} />}
              {circle.status === "pending" && <PendingContent circle={circle} />}
              {circle.status === "rejected" && <RejectedContent circle={circle} />}
            </div>
          </CardContent>
        </Card>
      </m.div>

      {/* ── 삭제 확인 AlertDialog (카드 외부에 렌더해 포커스 트랩 충돌 방지) ── */}
      <AlertDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          // 다이얼로그 닫힘 시 카드 click-through 방지
          startNavGrace();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {/* 서클명을 따옴표로 감싸 어떤 서클인지 명확히 표시 */}「{circle.name}
              」を削除しますか?
            </AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。活動レポートなどの関連データもすべて削除されます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            {/* 삭제 실행 — destructive 스타일로 위험 동작 강조 */}
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                setDialogOpen(false);
                onRequestDelete();
              }}
            >
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
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

      {/* 프로필 完成度 게이지 + 빠진 항목 — 등록 후 점진 보강 유도(2026-05 A안) */}
      <ProfileCompletion circle={circle} />

      {/* 編集する — 편집 폼(/circles/[id]/edit) 으로 이동. */}
      <Button asChild className="h-10 w-full">
        <Link href={`/circles/${circle.id}/edit`}>編集する</Link>
      </Button>
    </>
  );
}

/** pending: 審査中 안내 박스 + 完成度 게이지 + 編集 링크(재제출) */
function PendingContent({ circle }: { circle: MyCircle }) {
  return (
    <>
      {/* 審査中 안내 — amber 톤 */}
      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-300">
        審査中です。公開までお待ちください。
      </div>

      {/* 프로필 完成度 — 심사 중에도 미리 프로필을 채워둘 수 있게 표시(2026-05) */}
      <ProfileCompletion circle={circle} />

      {/* 編集する — 審査中에도 수정 가능(재제출). 편집 폼으로 이동.
          버튼 색은 approved/rejected 와 동일한 검정(기본 Button)으로 통일. */}
      <Button asChild className="h-10 w-full">
        <Link href={`/circles/${circle.id}/edit`}>編集する</Link>
      </Button>
    </>
  );
}

/** rejected: 却下理由 박스 + 修正して再申請 링크 */
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

      {/* 修正して再申請 — 편집 폼으로 이동. 수정 제출 시 審査中(pending)으로 재신청됨. */}
      <Button asChild className="h-10 w-full">
        <Link href={`/circles/${circle.id}/edit`}>修正して再申請</Link>
      </Button>
    </>
  );
}
