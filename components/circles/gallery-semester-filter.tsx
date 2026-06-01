"use client";

/**
 * GallerySemesterFilter — 갤러리 アルバム 탭 학기 필터 칩 바.
 *
 * 렌더링:
 * - 「すべて」 + 존재하는 학기 목록을 가로 스크롤 칩으로 표시.
 * - 활성 칩: keio-navy 배경 + 흰 텍스트.
 * - 비활성 칩: muted 배경 + muted-foreground 텍스트.
 *
 * 상태:
 * - selectedFilter (SemesterFilter) 를 부모에서 useState 로 관리해 prop으로 전달.
 * - onFilterChange 콜백으로 부모에 변경 알림.
 *
 * 접근성:
 * - role="tablist" + role="tab" + aria-selected 로 시맨틱 마크업.
 * - 키보드 포커스: focus-visible:ring-2.
 */

import { cn } from "@/lib/utils";
import type { SemesterFilter } from "@/lib/supabase/queries/circle-galleries";
import { semesterLabel } from "@/lib/supabase/queries/circle-galleries";

interface GallerySemesterFilterProps {
  /** 존재하는 학기 목록 (extractSemesters 결과) */
  semesters: SemesterFilter[];
  /** 현재 선택된 필터 */
  selectedFilter: SemesterFilter;
  /** 필터 변경 콜백 */
  onFilterChange: (filter: SemesterFilter) => void;
}

export function GallerySemesterFilter({
  semesters,
  selectedFilter,
  onFilterChange,
}: GallerySemesterFilterProps) {
  // 학기가 하나도 없거나 "all" 하나뿐이면 필터 바 자체를 숨김
  if (semesters.length === 0) return null;

  const filters: SemesterFilter[] = ["all", ...semesters];

  return (
    <div
      role="tablist"
      aria-label="学期フィルター"
      // 가로 스크롤 칩 바 — 탭 내부이므로 음수 마진 없이 w-full 안에서만 스크롤
      className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
      style={{ scrollbarWidth: "none" }}
    >
      {filters.map((filter) => {
        const isActive = selectedFilter === filter;
        return (
          <button
            key={filter}
            role="tab"
            aria-selected={isActive}
            type="button"
            onClick={() => onFilterChange(filter)}
            className={cn(
              // 공통: 칩 모양
              "flex shrink-0 items-center rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
              // 포커스
              "focus-visible:ring-keio-navy focus-visible:outline-none focus-visible:ring-2",
              // 활성/비활성 색상
              isActive
                ? "bg-keio-navy text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {semesterLabel(filter)}
          </button>
        );
      })}
    </div>
  );
}
