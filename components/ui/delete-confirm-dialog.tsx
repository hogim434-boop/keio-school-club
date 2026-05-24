"use client";

/**
 * DeleteConfirmDialog — 삭제 확인용 공통 AlertDialog 컴포넌트.
 *
 * 디자인:
 * - 상단 중앙: 원형 옅은 빨강 배경(bg-destructive/10) + TriangleAlert 아이콘(text-destructive)
 * - 제목·설명: 중앙 정렬
 * - 하단 가로 버튼 2개: 취소(outline) | 삭제(destructive 빨강), 각 flex-1 균등 배분
 *
 * 사용처:
 * - components/mypage/managed-circle-card.tsx (동아리 삭제)
 * - components/circles/report-detail-menu.tsx (리포트 삭제 — 상세 헤더)
 * - components/circles/activity-reports-list.tsx (리포트 삭제 — 리스트 row)
 */

import * as React from "react";
import { TriangleAlert } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface DeleteConfirmDialogProps {
  /** 다이얼로그 열림 상태 */
  open: boolean;
  /** 열림 상태 변경 콜백 */
  onOpenChange: (open: boolean) => void;
  /**
   * 다이얼로그 제목.
   * 서클명 등 JSX 를 포함할 수 있도록 ReactNode 허용.
   * 예: <>「{name}」を削除しますか?</>
   */
  title: React.ReactNode;
  /** 다이얼로그 본문 설명 */
  description: string;
  /**
   * 삭제 실행 버튼 클릭 시 호출되는 콜백.
   * 비동기도 가능 (반환값은 사용하지 않음).
   */
  onConfirm: () => void;
  /** 삭제 버튼 라벨 (기본: "削除する") */
  confirmLabel?: string;
  /** 삭제 진행 중 여부 — true 이면 버튼 2개 모두 disabled */
  isLoading?: boolean;
  /** AlertDialogContent 추가 클래스 */
  className?: string;
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  confirmLabel = "削除する",
  isLoading = false,
  className,
}: DeleteConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className={cn("max-w-sm", className)}>
        {/* ── 헤더: 경고 아이콘 + 제목 + 설명 (중앙 정렬) ── */}
        <AlertDialogHeader>
          {/*
           * 경고 아이콘 영역.
           * AlertDialogMedia 기본(bg-muted rounded-md)을 className 으로 덮어써
           * 빨강 원형(bg-destructive/10 rounded-full) 스타일로 변경.
           */}
          <AlertDialogMedia
            className="bg-destructive/10 size-14 rounded-full"
            aria-hidden="true"
          >
            <TriangleAlert className="text-destructive size-7" aria-hidden="true" />
          </AlertDialogMedia>

          {/* 제목 — AlertDialogHeader 의 text-center 를 그대로 이어받음 */}
          <AlertDialogTitle className="text-base font-semibold">
            {title}
          </AlertDialogTitle>

          {/* 설명 — muted, 소문자, 중앙 정렬 */}
          <AlertDialogDescription className="text-center text-sm">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/*
         * 하단 버튼 가로 배치.
         * AlertDialogFooter 기본은 "flex-col-reverse sm:flex-row" 이므로
         * "flex-row" 를 추가해 모바일에서도 항상 가로로 표시.
         */}
        <AlertDialogFooter className="flex-row gap-3 pt-1">
          {/* 취소 버튼 — outline 스타일, flex-1 로 좌우 균등 */}
          <AlertDialogCancel
            className="flex-1"
            disabled={isLoading}
          >
            キャンセル
          </AlertDialogCancel>

          {/*
           * 삭제 실행 버튼.
           * variant="destructive" 를 AlertDialogAction 에 직접 전달해
           * Button 의 bg-destructive(빨강) 가 확실히 적용되도록 함.
           * (className 으로만 덮으면 variant="default" 의 bg-primary 검정이 우선될 수 있음)
           */}
          <AlertDialogAction
            variant="destructive"
            className="flex-1"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? "削除中..." : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
