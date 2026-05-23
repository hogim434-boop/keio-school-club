"use client";

/**
 * ReportDetailHeader — 활동 리포트 상세 페이지 sticky 스크롤 반응형 헤더.
 *
 * iOS 대표 패턴:
 * - 스크롤 0: 투명 배경, ← · ⋯ 버튼만 표시
 * - 스크롤 60px 초과: 솔리드(bg-background/90 + backdrop-blur + border-b + shadow-sm) 전환
 *   + 게시물 제목이 헤더 가운데 truncate 되어 opacity 0→1 로 등장
 *
 * 레이아웃: ← 뒤로(왼쪽) | 제목(가운데, 숨김→등장) | ⋯(오른쪽, 소유자만)
 *
 * 기술 제약:
 * - position:fixed 금지 → sticky top-0 사용
 *   (template.tsx 의 transform(x:100%) 이탈 애니메이션이 fixed 의 containing block 을 가로채기 때문)
 * - safe-area-inset-top: paddingTop 인라인 스타일로 iPhone notch 회피
 * - z-30: 본문 이미지 및 텍스트 위
 */

import { useContext, useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";

import { ReportSlideOutContext } from "@/app/circles/[id]/reports/[reportId]/template";
import { ReportDetailMenu } from "@/components/circles/report-detail-menu";
import { cn } from "@/lib/utils";
import type { ActivityReport } from "@/lib/types/domain";

interface ReportDetailHeaderProps {
  /** 소속 서클 ID — ReportDetailMenu 에 전달 */
  circleId: string;
  /** 현재 리포트 — 제목 표시 + ReportDetailMenu 에 전달 */
  report: ActivityReport;
  /** 소유자 여부 — true 일 때만 ⋯ 메뉴 표시, false 일 때는 우측 spacer 로 제목 중앙 정렬 유지 */
  isOwner: boolean;
}

export function ReportDetailHeader({ circleId, report, isOwner }: ReportDetailHeaderProps) {
  // template.tsx 의 ReportSlideOutContext 에서 슬라이드 아웃 트리거 취득
  const slideOut = useContext(ReportSlideOutContext);

  // 스크롤 60px 초과 여부 — 헤더 배경 + 제목 opacity 전환에 사용
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    // 마운트 시 현재 스크롤 위치 즉시 평가 (새로고침 시 이미 스크롤된 경우 대응)
    setScrolled(window.scrollY > 60);

    function handleScroll() {
      setScrolled(window.scrollY > 60);
    }

    // passive: true — 스크롤 성능 최적화 (preventDefault 호출하지 않음)
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        // sticky: transform 조상(template.tsx)의 영향 없이 정상 동작,
        //         이탈 애니메이션 시 본문과 함께 자연스럽게 슬라이드됨
        "sticky top-0 z-30 transition-colors duration-200",
        // 스크롤 60px 초과 시: 솔리드 헤더 (배경 + blur + 보더 + 그림자)
        scrolled
          ? "bg-background/90 supports-backdrop-filter:bg-background/80 border-b shadow-sm backdrop-blur"
          : "bg-transparent"
      )}
      // iPhone notch / Dynamic Island 회피 — 헤더 바 상단에 safe-area-inset-top 적용
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="mx-auto flex h-14 max-w-3xl items-center gap-2 px-4">
        {/* 뒤로가기 버튼 — slideOut 호출 시 template.tsx 의 슬라이드 아웃 트랜지션 발동 */}
        <button
          type="button"
          onClick={slideOut}
          aria-label="戻る"
          className={cn(
            // 크기: 터치 영역 확보 (iOS HIG 권장 44×44pt)
            "inline-flex size-10 shrink-0 items-center justify-center rounded-full",
            // ghost 스타일: 배경 없음 → hover 시 muted
            "text-foreground hover:bg-muted transition-colors",
            // 포커스 링
            "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none"
          )}
        >
          <ArrowLeft className="size-5" aria-hidden="true" />
        </button>

        {/* 제목 — 스크롤 60px 초과 시 opacity 0→1 로 등장, 넘치면 truncate */}
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-center text-sm font-semibold transition-opacity duration-200",
            scrolled ? "opacity-100" : "opacity-0"
          )}
        >
          {report.title}
        </span>

        {/* 우측 영역 — 소유자: ⋯ 메뉴 / 비소유자: 빈 spacer (제목 중앙 정렬 유지) */}
        {isOwner ? (
          <ReportDetailMenu circleId={circleId} report={report} isOwner />
        ) : (
          // 비소유자일 때 ← 버튼과 대칭이 되도록 같은 size-10 spacer 배치
          <div className="size-10 shrink-0" aria-hidden="true" />
        )}
      </div>
    </header>
  );
}
