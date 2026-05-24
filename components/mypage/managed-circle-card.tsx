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
 * - 카드 루트 press 피드백(whileTap)은 제거됨 — 모바일 스크롤 시작 시 눌림 모션이 과하게
 *   발동하는 문제 때문. 진입 stagger 는 부모 MyPageView 의 enterItem variant 으로 처리.
 *
 * 클릭 구조 (stretched-link 패턴):
 * - 카드 전체를 덮는 absolute inset-0 <Link> 를 깔아 진짜 <a> 로 상세 이동.
 * - 편집 버튼·토글·메뉴 등 인터랙티브 요소는 relative z-10 으로 올려 각자 동작.
 * - 完成度 게이지: 라벨·진행 막대는 stretched-link 로 상세 이동, 「次のおすすめ」 추천 카드만 z-10 으로 편집폼 이동.
 * - 메뉴/다이얼로그 click-through 방지: navGrace 300ms + menuOpen/dialogOpen 가드.
 */

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Construction, Ellipsis, Trash2, Users } from "lucide-react";

import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
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
 * 심사 상태 뱃지 — approved/pending/rejected 별 색 분기.
 * (이 파일 안에 두어 카드와 함께 독립 유지)
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
  /*
   * DropdownMenu + AlertDialog 포커스 충돌 방지를 위해 controlled state 사용.
   * - menuOpen: 드롭다운 열림 여부 / dialogOpen: 삭제 확인 다이얼로그 열림 여부
   */
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  /*
   * 내비게이션 잠금(navGrace):
   * Radix DropdownMenu/AlertDialog(modal)를 닫을 때, 그 click 이 카드 뒤로 "관통"되어
   * stretched-link(<a>)가 잘못 호출되는 click-through 버그를 막는다.
   * (예: ⋯ 메뉴에서 「削除する」 선택 → 메뉴 닫힘 → 클릭이 Link 로 떨어져 상세 페이지로 이동)
   * → 메뉴/다이얼로그가 열려 있는 동안 + 닫힌 직후 300ms 유예 동안 stretched-link 를 pointer-events:none 으로 차단.
   *
   * navGraceActive(state): CSS pointer-events 제어용 (렌더 트리거)
   */
  const graceTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [navGraceActive, setNavGraceActive] = useState(false);
  const startNavGrace = useCallback(() => {
    setNavGraceActive(true);
    if (graceTimerRef.current) clearTimeout(graceTimerRef.current);
    graceTimerRef.current = setTimeout(() => {
      setNavGraceActive(false);
    }, 300);
  }, []);

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
      {/*
       * stretched-link 패턴:
       * - 비링크 컨테이너 div. (press 피드백 whileTap 은 제거 — 모바일에서 스크롤 시작 시에도
       *   눌림 모션이 과하게 발동하는 문제가 있어 카드 전체 press 효과를 뺐다. 버튼·토글은 자체 피드백 유지.)
       * - 내부에 absolute inset-0 <Link> 를 깔아 카드 전체를 클릭 가능하게 만든다.
       *   → 진짜 <a> 이므로 모바일 터치 신뢰성 + prefetch + 접근성 모두 개선.
       * - 편집 버튼·토글·메뉴 등은 relative z-10 으로 링크 위로 올려 각자 동작.
       * - navGraceActive 중에는 stretched-link 를 pointer-events:none 으로 차단해
       *   메뉴/다이얼로그 닫힘 후 첫 클릭이 상세로 관통하는 버그를 막는다.
       */}
      <div className={cn("relative w-full", className)}>
        {/* stretched-link: 카드 전체를 덮는 절대 위치 링크 */}
        <Link
          href={`/circles/${circle.id}`}
          aria-label={`${circle.name} の詳細を見る`}
          className={cn(
            "absolute inset-0 z-0 rounded-[inherit]",
            // navGrace 중에는 클릭 차단 (메뉴/다이얼로그 닫힘 click-through 방지)
            (navGraceActive || menuOpen || dialogOpen) && "pointer-events-none"
          )}
          tabIndex={-1}
          aria-hidden="true"
        />
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
              {/*
               * 서클명: stretched-link 위에 표시되므로 z-0 으로도 클릭 가능.
               * 별도 tabIndex 나 role 불필요 — 접근성은 stretched-link 의 aria-label 로 처리.
               */}
              <h3 className="line-clamp-2 min-w-0 flex-1 text-sm leading-snug font-semibold">
                {circle.name}
              </h3>
              {/* 우상단 뱃지 + ⋯ 메뉴 묶음 — relative z-10 으로 stretched-link 위에 배치 */}
              <div className="relative z-10 flex shrink-0 items-center gap-1">
                <StatusBadge status={circle.status} />
                {/* ⋯ 더보기 메뉴 (삭제 등)
                    modal={false}: Radix 기본 modal=true 이면 닫힐 때 pointer 이벤트 복구가 늦어
                    card stretched-link 첫 클릭을 잡아먹는 현상이 있음.
                    modal=false 로 하면 메뉴 바깥 클릭으로 닫히는 동작은 그대로이고
                    pointer 이벤트 복구가 즉각적이어서 navGrace 가 더 정확하게 작동. */}
                <DropdownMenu
                  modal={false}
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
                편집 버튼·RecruitmentToggle 은 각자 relative z-10 + stopPropagation 적용.
                CircleMetrics·ProfileCompletion 같은 비인터랙티브 영역은 클릭이 stretched-link 로
                전달되어 상세 이동이 정상 작동함. */}
            <div className="space-y-3">
              {circle.status === "approved" && <ApprovedContent circle={circle} />}
              {circle.status === "pending" && <PendingContent circle={circle} />}
              {circle.status === "rejected" && <RejectedContent circle={circle} />}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── 삭제 확인 다이얼로그 (카드 외부에 렌더해 포커스 트랩 충돌 방지) ── */}
      <DeleteConfirmDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          // 다이얼로그 닫힘 시 카드 click-through 방지
          startNavGrace();
        }}
        title={
          <>
            {/* 서클명을 따옴표로 감싸 어떤 서클인지 명확히 표시 */}
            「{circle.name}」を削除しますか?
          </>
        }
        description="この操作は取り消せません。活動レポートなどの関連データもすべて削除されます。"
        onConfirm={() => {
          setDialogOpen(false);
          onRequestDelete();
        }}
      />
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
      {/* 카테고리 라벨 줄 아래에 부원 수 범위 뱃지 — member_band 있을 때만 표시
          비인터랙티브 영역: stretched-link 가 클릭을 받아 상세 이동 */}
      {circle.member_band && (
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="flex items-center gap-1 text-xs font-normal">
            {/* Users 아이콘으로 부원 범위임을 시각적으로 구분 */}
            <Users className="size-3" aria-hidden="true" />
            {MEMBER_BAND_LABELS[circle.member_band]}
          </Badge>
        </div>
      )}

      {/* 운영 지표 2분할 (閲覧 / 問合) — 비인터랙티브, stretched-link 로 상세 이동 */}
      <CircleMetrics viewCount={circle.view_count} inquiryCount={circle.inquiry_count} />

      {/* 모집 상태 빠른 토글 — relative z-10: stretched-link 위에 배치해 토글이 독립 동작
          stopPropagation 은 내부 Switch 에 이미 있으나, wrapper 에도 추가해 이중 보호 */}
      {circle.recruitment_status && (
        <div className="relative z-10" onClick={(e) => e.stopPropagation()}>
          <RecruitmentToggle circleId={circle.id} current={circle.recruitment_status} />
        </div>
      )}

      {/* 프로필 完成度 게이지 — 라벨·%·진행 막대 영역은 stretched-link 로 상세 이동.
          내부 「次のおすすめ」 추천 카드(편집폼 Link)만 자체 relative z-10 으로 분리돼 편집폼으로 이동. */}
      <ProfileCompletion circle={circle} />

      {/* 編集する 버튼 — relative z-10 + stopPropagation: stretched-link 보다 위에서 독립 동작
          내부가 <Link href=".../edit"> 이므로 <a> 중첩 없이 Button asChild + Link 조합 사용 */}
      <div className="relative z-10" onClick={(e) => e.stopPropagation()}>
        <Button asChild className="h-10 w-full">
          <Link href={`/circles/${circle.id}/edit`}>編集する</Link>
        </Button>
      </div>
    </>
  );
}

/** pending: 審査中 안내 박스 + 完成度 게이지 + 編集 링크(재제출) */
function PendingContent({ circle }: { circle: MyCircle }) {
  return (
    <>
      {/* 審査中 안내 박스 — 비인터랙티브, stretched-link 로 상세 이동 */}
      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
        審査中です。公開までお待ちください。
      </div>

      {/* 프로필 完成度 — 라벨·%·진행 막대 영역은 stretched-link 로 상세 이동.
          내부 「次のおすすめ」 추천 카드(편집폼 Link)만 자체 relative z-10 으로 분리됨. */}
      <ProfileCompletion circle={circle} />

      {/* 編集する 버튼 — relative z-10 + stopPropagation: stretched-link 위에서 독립 동작 */}
      <div className="relative z-10" onClick={(e) => e.stopPropagation()}>
        <Button asChild className="h-10 w-full">
          <Link href={`/circles/${circle.id}/edit`}>編集する</Link>
        </Button>
      </div>
    </>
  );
}

/** rejected: 却下理由 박스 + 修正して再申請 링크 */
function RejectedContent({ circle }: { circle: MyCircle }) {
  return (
    <>
      {/* 却下理由 박스 — 비인터랙티브, stretched-link 로 상세 이동 */}
      {circle.rejection_reason && (
        <div className="bg-destructive/10 text-destructive rounded-md px-3 py-2.5 text-sm">
          <span className="font-medium">却下理由: </span>
          {circle.rejection_reason}
        </div>
      )}

      {/* 修正して再申請 버튼 — relative z-10 + stopPropagation: stretched-link 위에서 독립 동작 */}
      <div className="relative z-10" onClick={(e) => e.stopPropagation()}>
        <Button asChild className="h-10 w-full">
          <Link href={`/circles/${circle.id}/edit`}>修正して再申請</Link>
        </Button>
      </div>
    </>
  );
}
