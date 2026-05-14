"use client";

import { cn } from "@/lib/utils";

/**
 * 토스 스타일 세그먼트 버튼 — 필터 패널의 각 선택지 한 셀.
 *
 * 특징:
 * - h-12(48px) — WCAG 터치 타깃 기준 준수 + 여유 있는 터치 영역
 * - shrink-0 — flex 가로 스크롤 컨테이너 안에서 폭 줄어들지 않음
 * - whitespace-nowrap — 한자 라벨 줄바꿈 방지 안전망
 * - border-2 — 토스 스타일 굵은 테두리
 * - 활성 시: border-foreground(다크 모드 자동 반전) + font-semibold
 * - 비활성 시: border-border + text-muted-foreground
 * - aria-pressed 로 다중 선택 접근성 지원
 */
interface SegmentedOptionProps {
  /** 버튼에 표시할 라벨 */
  label: string;
  /** 현재 선택(활성) 여부 */
  active: boolean;
  /** 클릭 핸들러 */
  onClick: () => void;
  /** 추가 Tailwind 클래스 (rounded-full 등 override 용) */
  className?: string;
}

export function SegmentedOption({ label, active, onClick, className }: SegmentedOptionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        // 기본 스타일: 세그먼트 사각 버튼 (가로 스크롤 컨테이너 대응)
        "flex h-12 shrink-0 items-center justify-center rounded-md border-2 px-4 text-sm whitespace-nowrap transition-colors",
        // 활성 상태: 검은 굵은 테두리 + 굵은 글자
        active
          ? "border-foreground text-foreground font-semibold"
          : "border-border text-muted-foreground hover:border-muted-foreground",
        className
      )}
    >
      {label}
    </button>
  );
}
