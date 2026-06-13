import { cn } from "@/lib/utils";

interface SkeletonProps extends React.ComponentProps<"div"> {
  /**
   * true: globals.css 의 .skeleton-shimmer (좌→우 광택 sweep 효과) 적용.
   *       큰 커버 카드 스켈레톤 전용 — 로딩 진행감을 시각적으로 강조.
   * false(기본): 기존 animate-pulse (페이드 인·아웃 반복) 유지.
   *              텍스트·칩·작은 요소처럼 시각적 비중이 낮은 곳에 적합.
   */
  shimmer?: boolean;
}

function Skeleton({ className, shimmer = false, ...props }: SkeletonProps) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        // 배경색과 radius는 공통
        "bg-accent rounded-md",
        // shimmer: globals.css .skeleton-shimmer (::after 로 sweep 레이어 생성)
        // 기본: Tailwind 내장 animate-pulse (opacity 0.5 ↔ 1 반복)
        shimmer ? "skeleton-shimmer" : "animate-pulse",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
