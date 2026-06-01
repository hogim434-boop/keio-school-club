import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { GalleryUploadForm } from "@/components/circles/gallery-upload-form";
import { createClient } from "@/lib/supabase/server";

// ─────────────────────────────────────────
// 타입
// ─────────────────────────────────────────

interface GalleryUploadPageProps {
  params: Promise<{ id: string }>;
}

// ─────────────────────────────────────────
// Page (외부 — Suspense 경계 담당)
// ─────────────────────────────────────────

/**
 * 갤러리 업로드 페이지 — /circles/{id}/galleries/upload
 *
 * 운영자(circle_members.role = owner | staff)만 접근 가능.
 * template.tsx의 슬라이드 모션 래퍼가 이 경로에도 적용되므로
 * 상단 헤더를 직접 구현한다 (BottomNav는 이 경로에서 숨겨짐).
 *
 * 접근 제어:
 *  1. 미인증 → /auth/login?next=... redirect
 *  2. 비운영자(is_circle_staff=false) → /circles/{id} redirect
 *
 * 설계 메모 (template.tsx 고려):
 *  - /circles/{id}/galleries/upload 는 template.tsx의 `pathname.endsWith("/edit")` 조건에
 *    해당하지 않으므로 슬라이드 모션 래퍼가 적용됨.
 *  - 풀스크린 레이아웃이 필요하므로 `fixed inset-0` 사용.
 *    → template.tsx 주석: "편집 페이지(/circles/{id}/edit)는 fixed 풀스크린 폼이다.
 *       will-change-transform + transform 래퍼가 fixed의 containing block을 만들어 붕괴됨."
 *    → 이를 방지하기 위해 template.tsx 내부의 모션 래퍼 문제를 고려하여
 *       fixed 대신 min-h-svh 로 풀스크린 효과만 적용 (페이지 자체가 스크롤 가능하게 유지).
 */
export default function GalleryUploadPage({ params }: GalleryUploadPageProps) {
  return (
    <Suspense fallback={<GalleryUploadSkeleton />}>
      <GalleryUploadContent params={params} />
    </Suspense>
  );
}

// ─────────────────────────────────────────
// Content (내부 — 실제 데이터 조회 + 권한 검증)
// ─────────────────────────────────────────

/**
 * 업로드 페이지 본문 — async Server Component.
 *
 * 처리 흐름:
 *  1. params 에서 id await (Next.js 15 async params 필수)
 *  2. Supabase 클라이언트 생성 (함수 내부에서 새로 생성)
 *  3. getClaims() 로 인증 확인 → 미인증 시 로그인으로 redirect
 *  4. is_circle_staff RPC 로 운영자 권한 확인 → 비운영자 시 서클 상세로 redirect
 *  5. GalleryUploadForm 렌더
 */
async function GalleryUploadContent({ params }: GalleryUploadPageProps) {
  // ── Next.js 15: params 는 Promise, await 필수 ────────────────────────────
  const { id: circleId } = await params;

  // ── Supabase 클라이언트 (Fluid compute: 함수 내부에서 생성) ──────────────
  const supabase = await createClient();

  // ── 인증 확인 ─────────────────────────────────────────────────────────────
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) {
    // 미인증 → 로그인 페이지로 redirect (next 파라미터로 돌아올 경로 전달)
    redirect(
      `/auth/login?next=${encodeURIComponent(`/circles/${circleId}/galleries/upload`)}`
    );
  }

  // ── 운영자 권한 확인 (is_circle_staff RPC) ──────────────────────────────
  // is_circle_staff: circle_members 에서 role=owner|staff 인지 확인
  const { data: isStaff, error: staffError } = await supabase.rpc("is_circle_staff", {
    _circle_id: circleId,
  });

  if (staffError) {
    // RPC 에러 — 권한 불명이므로 안전하게 redirect
    console.error("[GalleryUploadPage] is_circle_staff エラー:", staffError.message);
    redirect(`/circles/${circleId}`);
  }

  if (!isStaff) {
    // 비운영자 → 서클 상세로 redirect
    redirect(`/circles/${circleId}`);
  }

  // ── 렌더 ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-svh bg-background">
      {/* ── 상단 헤더 ── */}
      <header className="sticky top-0 z-10 flex h-14 items-center border-b bg-background/95 px-4 backdrop-blur-sm">
        <Link
          href={`/circles/${circleId}`}
          aria-label="戻る"
          className="text-muted-foreground hover:text-foreground -ml-2 rounded-full p-2 transition-colors"
        >
          <ArrowLeft className="size-5" aria-hidden="true" />
        </Link>
        <h1 className="flex-1 text-center text-base font-semibold">ギャラリーに追加</h1>
        {/* 헤더 우측 여백 (좌우 균형) */}
        <div className="size-9" aria-hidden="true" />
      </header>

      {/* ── 메인 콘텐츠 ── */}
      <main className="pt-4">
        <GalleryUploadForm circleId={circleId} />
      </main>
    </div>
  );
}

// ─────────────────────────────────────────
// 로딩 스켈레톤
// ─────────────────────────────────────────

function GalleryUploadSkeleton() {
  return (
    <div className="min-h-svh bg-background">
      {/* 헤더 스켈레톤 */}
      <div className="sticky top-0 z-10 flex h-14 items-center border-b bg-background/95 px-4">
        <div className="bg-muted size-9 animate-pulse rounded-full" />
        <div className="bg-muted mx-auto h-4 w-24 animate-pulse rounded" />
        <div className="size-9" />
      </div>
      {/* 콘텐츠 스켈레톤 */}
      <div className="mx-auto max-w-lg space-y-6 px-4 pt-8">
        {/* 이미지 영역 */}
        <div className="bg-muted aspect-[4/3] w-full animate-pulse rounded-2xl" />
        {/* 캡션 */}
        <div className="space-y-2">
          <div className="bg-muted h-4 w-16 animate-pulse rounded" />
          <div className="bg-muted h-12 w-full animate-pulse rounded-xl" />
        </div>
        {/* 촬영일 */}
        <div className="space-y-2">
          <div className="bg-muted h-4 w-20 animate-pulse rounded" />
          <div className="bg-muted h-12 w-full animate-pulse rounded-xl" />
        </div>
        {/* 버튼 */}
        <div className="bg-muted h-12 w-full animate-pulse rounded-xl" />
      </div>
    </div>
  );
}
