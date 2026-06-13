/**
 * Pager — 미니멀 원형 화살표 페이지네이션 (옵션 A 디자인).
 *
 * 설계 원칙:
 * - 텍스트("前へ/次へ") 없이 아이콘만 — 좁은 화면에서도 1줄 유지
 * - 원형(rounded-full) 버튼 40~44px — 터치 영역 충분히 확보
 * - 순수 CSS 전환만 사용 → 서버 컴포넌트 호환 ('use client' 불필요)
 * - prevHref / nextHref 가 null 이면 비활성(opacity-40, 클릭 불가)
 *
 * 사용 방법:
 *   <Pager
 *     current={currentPage}
 *     totalPages={totalPages}
 *     prevHref={current <= 1 ? null : buildXxxUrl({ ...params, page: current - 1 })}
 *     nextHref={current >= totalPages ? null : buildXxxUrl({ ...params, page: current + 1 })}
 *   />
 */

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

interface PagerProps {
  current: number;
  totalPages: number;
  /** 이전 페이지 URL. null 이면 첫 페이지 → 비활성 처리 */
  prevHref: string | null;
  /** 다음 페이지 URL. null 이면 마지막 페이지 → 비활성 처리 */
  nextHref: string | null;
}

/**
 * 원형 화살표 버튼 공통 클래스.
 *
 * - size-10 (40px 정사각형) — 모바일 터치 영역 충분
 * - rounded-full — 원형
 * - border + bg-background — 뉴욕 스타일 가벼운 테두리
 * - hover:bg-accent — 호버 시 옅은 배경 변환
 * - transition — 색상·transform 등을 한 번에 전환 (transition-colors/-transform 중복 시
 *   transition-property 가 서로 덮어쓰는 문제를 피하려고 통합 유틸 사용)
 * - duration-150 ease-out — 부드러운 전환 (150ms)
 * - active:scale-95 — 탭(클릭) 시 살짝 수축 피드백
 */
const btnBase =
  "inline-flex size-10 items-center justify-center rounded-full border bg-background " +
  "transition duration-150 ease-out hover:bg-accent hover:text-accent-foreground " +
  "active:scale-95 focus-visible:outline-none focus-visible:ring-2 " +
  "focus-visible:ring-ring";

/** 비활성 상태 추가 클래스 */
const btnDisabled = "opacity-40 pointer-events-none cursor-default";

export function Pager({ current, totalPages, prevHref, nextHref }: PagerProps) {
  return (
    <nav aria-label="ページネーション" className="flex items-center justify-center gap-4 pt-6">
      {/* ── 이전 버튼 ────────────────────────────────────── */}
      {prevHref ? (
        <Link href={prevHref} aria-label="前のページ" className={cn(btnBase)}>
          {/* 아이콘 size-5 (20px) — 버튼 대비 적절한 비율 */}
          <ChevronLeft className="size-5" aria-hidden="true" />
        </Link>
      ) : (
        /* 비활성 — 레이아웃 자리는 유지(span), 클릭 불가 */
        <span aria-disabled="true" aria-label="前のページ" className={cn(btnBase, btnDisabled)}>
          <ChevronLeft className="size-5" aria-hidden="true" />
        </span>
      )}

      {/* ── 페이지 카운터 ─────────────────────────────────── */}
      {/* 현재 페이지만 text-foreground font-semibold 로 살짝 강조 */}
      <p className="text-muted-foreground min-w-[3.5rem] text-center text-sm" aria-current="page">
        <span className="text-foreground font-semibold">{current}</span>
        {" / "}
        {totalPages}
      </p>

      {/* ── 다음 버튼 ────────────────────────────────────── */}
      {nextHref ? (
        <Link href={nextHref} aria-label="次のページ" className={cn(btnBase)}>
          <ChevronRight className="size-5" aria-hidden="true" />
        </Link>
      ) : (
        <span aria-disabled="true" aria-label="次のページ" className={cn(btnBase, btnDisabled)}>
          <ChevronRight className="size-5" aria-hidden="true" />
        </span>
      )}
    </nav>
  );
}
