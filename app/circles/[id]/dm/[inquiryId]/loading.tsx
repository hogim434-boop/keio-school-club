/**
 * app/circles/[id]/dm/[inquiryId]/loading.tsx
 *
 * DM 스레드 페이지 진입 시 즉시 표시되는 스켈레톤 로딩 UI.
 *
 * ── 변경사항 ───────────────────────────────────────────────────────────────
 * 이전: 문서형 (뒤로가기 링크 + 큰 제목 + 카테고리 배지 + 메시지 버블)
 * 이후: 풀스크린 메신저형 (DmChatHeader + 메시지 버블 스켈레톤 + 하단 Composer)
 *
 * page.tsx의 Suspense fallback과 동일한 레이아웃 구조로 작성해
 * 「loading.tsx → 실제 콘텐츠」 전환 시 레이아웃 점프(CLS)를 방지한다.
 *
 * 구조 (DmThread 풀스크린 레이아웃과 동일):
 *   ┌─ 채팅 헤더 (뒤로가기 + 아이콘 + 서클명 skeleton)
 *   ├─ 메시지 버블 N개 (좌/우 교대 skeleton, 그룹핑 반영)
 *   └─ 하단 Composer skeleton
 */

import { Skeleton } from "@/components/ui/skeleton";

export default function DmThreadLoading() {
  return (
    // 풀스크린 메신저형 — DmThread 레이아웃과 동일
    <div className="bg-background fixed inset-0 flex flex-col">
      {/* ── 채팅 헤더 skeleton ────────────────────────────────────────── */}
      <div className="flex items-center gap-3 border-b px-4 py-3">
        {/* 뒤로가기 버튼 자리 */}
        <Skeleton className="size-9 shrink-0 rounded-full" />
        {/* 아이콘 자리 */}
        <Skeleton className="size-9 shrink-0 rounded-full" />
        {/* 서클명 + 부제 자리 */}
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-4 w-28 rounded" />
          <Skeleton className="h-3 w-20 rounded" />
        </div>
      </div>

      {/* ── 메시지 스크롤 영역 skeleton ──────────────────────────────── */}
      <div className="flex-1 overflow-hidden px-4 py-3">
        <div className="flex flex-col gap-3">
          {/* 날짜 구분선 skeleton */}
          <div className="flex items-center justify-center py-2">
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>

          {/* 상대방 메시지 그룹 (좌측) — 2개 버블 */}
          <div className="flex flex-col items-start gap-0.5">
            {/* 발신자 라벨 자리 */}
            <Skeleton className="mb-0.5 ml-10 h-3 w-20 rounded" />
            {/* 버블 1 (그룹 첫 버블 — 아바타 공백 + 버블) */}
            <div className="flex items-end gap-2">
              <div className="size-8 shrink-0" aria-hidden />
              <Skeleton className="h-10 w-52 rounded-2xl rounded-b-lg" />
            </div>
            {/* 버블 2 (그룹 마지막 버블 — 아바타 + 버블 + 시간) */}
            <div className="flex items-end gap-2">
              <Skeleton className="size-8 shrink-0 rounded-full" />
              <Skeleton className="h-14 w-48 rounded-2xl rounded-bl-sm" />
              <Skeleton className="h-3 w-8 rounded" />
            </div>
          </div>

          {/* 내 메시지 그룹 (우측) — 단독 버블 */}
          <div className="flex flex-col items-end gap-0.5">
            <div className="flex items-end gap-2">
              <Skeleton className="h-3 w-8 rounded" />
              <Skeleton className="h-12 w-56 rounded-2xl rounded-br-sm" />
            </div>
          </div>

          {/* 상대방 메시지 그룹 (좌측) — 단독 버블 */}
          <div className="flex flex-col items-start gap-0.5">
            <Skeleton className="mb-0.5 ml-10 h-3 w-20 rounded" />
            <div className="flex items-end gap-2">
              <Skeleton className="size-8 shrink-0 rounded-full" />
              <Skeleton className="h-16 w-60 rounded-2xl rounded-bl-sm" />
              <Skeleton className="h-3 w-8 rounded" />
            </div>
          </div>

          {/* 내 메시지 그룹 (우측) — 2개 버블 */}
          <div className="flex flex-col items-end gap-0.5">
            {/* 버블 1 (그룹 첫 버블) */}
            <div className="flex items-end gap-2">
              <Skeleton className="h-10 w-44 rounded-2xl rounded-b-lg" />
            </div>
            {/* 버블 2 (그룹 마지막 — 시간 포함) */}
            <div className="flex items-end gap-2">
              <Skeleton className="h-3 w-8 rounded" />
              <Skeleton className="h-12 w-48 rounded-2xl rounded-br-sm" />
            </div>
          </div>
        </div>
      </div>

      {/* ── 하단 Composer skeleton ───────────────────────────────────── */}
      <div className="bg-background border-t px-4 py-3">
        <div className="flex items-end gap-2">
          <Skeleton className="h-11 flex-1 rounded-xl" />
          <Skeleton className="size-11 shrink-0 rounded-full" />
        </div>
      </div>
    </div>
  );
}
