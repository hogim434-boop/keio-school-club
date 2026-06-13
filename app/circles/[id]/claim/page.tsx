import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";

import { ClaimForm } from "@/app/circles/[id]/claim/claim-form";
import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";

/**
 * /circles/[id]/claim — 동아리 권한 이양(claim) 신청 페이지 (RSC).
 *
 * ── 진입 조건 분기 ─────────────────────────────────────────────────────────
 * 1. 미로그인: /auth/login?next=/circles/{id}/claim 으로 redirect
 * 2. 동아리 없음: 404 notFound()
 * 3. is_claimed=true(이미 인수 완료): /circles/{id} 로 redirect
 * 4. 본인이 이미 owner: /mypage 로 redirect (자기 동아리를 다시 신청할 필요 없음)
 * 5. pending 신청이 이미 있음: 「申請中」 안내 화면 표시
 * 6. 정상 진입: ClaimForm (멀티스텝, AuthScreen 풀스크린) 표시
 *
 * ── 레이아웃 변경점 ───────────────────────────────────────────────────────
 * ClaimForm 가 AuthScreen(fixed inset-0) 을 내부에서 사용하므로
 * 정상 진입 시 <main> 래퍼 없이 ClaimForm 을 직접 렌더한다.
 * 헤더(タイトル·サブコピー)와 審査の案内ボックスは ClaimForm step 1 내부로 이동.
 *
 * ── 캐시 정책 ────────────────────────────────────────────────────────────
 * 인증 필수 + 개인 데이터 → unstable_cache 금지.
 *
 * useSearchParams() 를 사용하는 ClaimForm(Client Component)이 있으므로
 * <Suspense> 로 감싼 ClaimContent 가 SSR 경계를 제공한다.
 */
interface ClaimPageProps {
  params: Promise<{ id: string }>;
}

export default function ClaimPage({ params }: ClaimPageProps) {
  return (
    <Suspense fallback={<ClaimPageSkeleton />}>
      <ClaimContent params={params} />
    </Suspense>
  );
}

async function ClaimContent({ params }: ClaimPageProps) {
  // Next.js 15: params는 반드시 await
  const { id: circleId } = await params;

  // ── 1. 인증 확인 (미인증 시 자동 redirect) ────────────────────────────────
  const uid = await requireUser(`/circles/${circleId}/claim`);

  // ── 2. Supabase 클라이언트 (Fluid compute 대응: 함수 내 매번 새로 생성) ──
  const supabase = await createClient();

  // ── 3. 동아리 조회 ────────────────────────────────────────────────────────
  const { data: circle, error: circleError } = await supabase
    .from("circles")
    .select("id, name, is_claimed, owner_id, status")
    .eq("id", circleId)
    .maybeSingle();

  if (circleError) {
    console.error("[ClaimPage] circle fetch error:", circleError.message);
  }

  // 동아리 없음 → 404
  if (!circle) notFound();

  // ── 4. is_claimed=true → 이미 인수 완료, 상세 페이지로 이동 ────────────
  if (circle.is_claimed) {
    redirect(`/circles/${circleId}`);
  }

  // ── 5. 본인이 이미 owner → /mypage 로 이동 ───────────────────────────────
  if (circle.owner_id === uid) {
    redirect("/mypage");
  }

  // ── 6. 본인의 pending 신청이 이미 있는지 확인 ────────────────────────────
  const { data: pendingClaim } = await supabase
    .from("circle_claims")
    .select("id, created_at")
    .eq("circle_id", circleId)
    .eq("requester_id", uid)
    .eq("status", "pending")
    .maybeSingle();

  // ── 렌더 ──────────────────────────────────────────────────────────────────
  // pending 신청이 이미 있으면 안내 화면 표시 (通常レイアウト)
  if (pendingClaim) {
    return (
      <main className="container mx-auto max-w-lg px-4 py-8 pb-24">
        <PendingState circleName={circle.name} circleId={circleId} />
      </main>
    );
  }

  // 정상 진입: ClaimForm (AuthScreen 풀스크린, 래퍼 불필요)
  return <ClaimForm circleId={circleId} circleName={circle.name} />;
}

/**
 * PendingState — 신청이 이미 접수된 경우 표시하는 안내 화면.
 */
function PendingState({ circleName, circleId }: { circleName: string; circleId: string }) {
  return (
    <div className="bg-card flex flex-col items-center gap-4 rounded-2xl border px-6 py-10 text-center shadow-sm">
      {/* 대기 상태 아이콘 (amber) */}
      <span
        className="flex size-12 items-center justify-center rounded-full bg-amber-100 text-2xl dark:bg-amber-500/20"
        aria-hidden
      >
        ⏳
      </span>
      <div className="space-y-1.5">
        <p className="text-base font-semibold">申請を受け付けています</p>
        <p className="text-muted-foreground text-sm leading-relaxed">
          <span className="text-foreground font-medium">{circleName}</span>
          <br />
          の申請を審査中です。確認のうえご連絡します。
        </p>
      </div>
      <a
        href={`/circles/${circleId}`}
        className="text-keio-navy mt-2 text-sm font-medium underline-offset-2 hover:underline"
      >
        {circleName} のページへ戻る
      </a>
    </div>
  );
}

/** 로딩 스켈레톤 — Suspense fallback */
function ClaimPageSkeleton() {
  return (
    <main className="container mx-auto max-w-lg px-4 py-8">
      <div className="mb-6 space-y-2">
        <div className="bg-muted h-6 w-56 animate-pulse rounded" />
        <div className="bg-muted h-4 w-40 animate-pulse rounded" />
      </div>
      <div className="bg-muted h-36 animate-pulse rounded-xl" />
      <div className="mt-6 space-y-4">
        <div className="bg-muted h-12 animate-pulse rounded-xl" />
        <div className="bg-muted h-10 animate-pulse rounded-lg" />
      </div>
    </main>
  );
}
