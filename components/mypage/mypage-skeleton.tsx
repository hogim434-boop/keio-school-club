/**
 * MyPageSkeleton — 마이페이지 Suspense fallback 스켈레톤.
 *
 * 실제 레이아웃(ProfileHero + 운영 카드 2개)과 동일한 높이를 유지해
 * 데이터 로드 완료 후 레이아웃 점프를 방지한다.
 *
 * 구성(실제 카드 레이아웃과 높이 동기화):
 * 1. 프로필 줄 — 아바타 원 + 이름 줄 + 인증뱃지 줄
 * 2. 섹션 헤더 줄
 * 3. 카드 1개 (approved 풀) — 커버 + 제목/뱃지 + 메트릭 1줄 + 모집 토글 + 完成度 요약 + 2버튼
 * 4. 카드 2개 (축소) — 커버 + 제목 + 버튼
 * 5. お問い合わせ 줄
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

      {/* ── 3. 운영 카드 1 (approved 풀 디테일) ── */}
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
          {/* 메트릭 1줄 (閲覧·問合·部員) */}
          <Skeleton className="h-3 w-48" />
          {/* 모집 상태 토글 */}
          <Skeleton className="h-9 w-full rounded-lg" />
          {/* 完成度 요약 한 줄 + 진행 막대 */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
          {/* 編集 / イベント管理 2버튼 */}
          <div className="grid grid-cols-2 gap-2">
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
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
          <div className="grid grid-cols-2 gap-2">
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        </div>
      </div>

      {/* ── 5. お問い合わせ 줄 ── */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  );
}
