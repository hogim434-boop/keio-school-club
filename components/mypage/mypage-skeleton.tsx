/**
 * MyPageSkeleton — 마이페이지 Suspense fallback 스켈레톤.
 *
 * 실제 레이아웃(ProfileHero + 운영 카드 2개)과 동일한 높이를 유지해
 * 데이터 로드 완료 후 레이아웃 점프를 방지한다.
 *
 * 구성:
 * 1. 프로필 줄 — 아바타 원 + 이름 줄 + 인증뱃지 줄
 * 2. 섹션 헤더 줄
 * 3. 카드 1개 — 16:9 커버 + 제목/뱃지 줄 + 메트릭 3분할
 * 4. 카드 2개 (축소) — 커버 + 제목 줄
 */

import { Skeleton } from "@/components/ui/skeleton";

export function MyPageSkeleton() {
  return (
    <div className="container mx-auto max-w-2xl space-y-6 px-4 py-6">
      {/* ── 1. 프로필 줄 ── */}
      <div className="flex items-center gap-3">
        {/* 아바타 원 56px */}
        <Skeleton className="size-14 shrink-0 rounded-full" />
        <div className="space-y-1.5">
          {/* 표시 이름 */}
          <Skeleton className="h-5 w-32" />
          {/* 인증 뱃지 */}
          <Skeleton className="h-4 w-24" />
        </div>
      </div>

      {/* ── 2. 섹션 헤더 (運営中のサークル N件 + + 新規登録) ── */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-5 w-20" />
      </div>

      {/* ── 3. 운영 카드 1 (풀 디테일: 커버 + 메트릭) ── */}
      <div className="space-y-3 overflow-hidden rounded-xl border p-0">
        {/* 커버 이미지 16:9 */}
        <Skeleton className="aspect-video w-full rounded-none" />
        <div className="space-y-3 p-4">
          {/* 서클명 + 뱃지 행 */}
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          {/* 카테고리 라벨 */}
          <Skeleton className="h-4 w-24" />
          {/* 메트릭 3분할 */}
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-1 rounded-md border p-3">
                <Skeleton className="size-5" />
                <Skeleton className="h-5 w-10" />
                <Skeleton className="h-3 w-8" />
              </div>
            ))}
          </div>
          {/* 편집 버튼 */}
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      </div>

      {/* ── 4. 운영 카드 2 (커버 + 제목만) ── */}
      <div className="space-y-3 overflow-hidden rounded-xl border p-0">
        <Skeleton className="aspect-video w-full rounded-none" />
        <div className="space-y-3 p-4">
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      </div>
    </div>
  );
}
