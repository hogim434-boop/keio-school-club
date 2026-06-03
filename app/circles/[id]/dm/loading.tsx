/**
 * app/circles/[id]/dm/loading.tsx
 *
 * DM 신규 문의 페이지 진입 시 즉시 표시되는 스켈레톤 로딩 UI.
 *
 * ── 변경사항 ───────────────────────────────────────────────────────────────
 * 이전: 문서형 (카테고리 RadioGroup + Textarea + 전송 버튼)
 * 이후: 풀스크린 메신저형 (헤더 + 빈 메시지 영역 + 하단 Composer)
 *
 * page.tsx의 Suspense fallback과 동일한 레이아웃 구조로 작성해
 * 「loading.tsx → 실제 콘텐츠」 전환 시 레이아웃 점프(CLS)를 방지한다.
 *
 * 구조 (DmChatHeader + NewDmChat 풀스크린 레이아웃과 동일):
 *   ┌─ 채팅 헤더 (뒤로가기 + 아이콘 + 서클명 skeleton)
 *   ├─ 빈 메시지 영역 (가운데 안내 skeleton)
 *   └─ 하단 Composer skeleton
 */

import { Skeleton } from "@/components/ui/skeleton";

export default function DmInquiryLoading() {
  return (
    // 풀스크린 메신저형 — NewDmChat 레이아웃과 동일
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
        {/* 평균 응답 시간 배지 자리 */}
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>

      {/* ── 빈 메시지 영역 skeleton ──────────────────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6">
        {/* MessageCircle 아이콘 자리 */}
        <Skeleton className="size-14 rounded-full" />
        {/* 안내 텍스트 자리 */}
        <div className="flex flex-col items-center gap-2">
          <Skeleton className="h-4 w-40 rounded" />
          <Skeleton className="h-3 w-52 rounded" />
        </div>
        <Skeleton className="h-3 w-32 rounded" />
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
