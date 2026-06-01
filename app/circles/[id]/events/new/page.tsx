/**
 * app/circles/[id]/events/new/page.tsx
 *
 * イベント登録ページ — 운영자(staff/owner) 전용 Server Component.
 *
 * ── Defense in Depth 권한 검증 (1회차) ────────────────────────────────
 * Server Component 레벨에서 먼저 권한을 검증한다.
 * → 2회차는 Server Action (actions.ts) 의 createEvent 에서 INSERT 직전 재검증.
 *
 * 검증 흐름:
 *   1. getClaims() 로 JWT 서명 검증 (네트워크 왕복 없음)
 *   2. is_circle_staff RPC 로 운영자 여부 확인
 *   3. 조건 미충족 시 적절한 경로로 redirect
 *
 * ── 라우팅 ────────────────────────────────────────────────────────────
 * 이 페이지는 Next.js 15 App Router 의 동적 라우트 세그먼트를 사용한다.
 * params 는 Promise 이므로 반드시 await 해야 한다 (Next.js 15 필수 규칙).
 */

import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { EventForm } from "@/components/event/event-form";
import { createClient } from "@/lib/supabase/server";

// ── Props ──────────────────────────────────────────────────────────────
// Next.js 15: params 는 반드시 Promise 타입으로 선언
interface EventNewPageProps {
  params: Promise<{ id: string }>;
}

/**
 * イベント登録ページ (Server Component).
 *
 * params.id: 서클 UUID.
 * 운영자만 접근 가능 — 비인증 → /auth/login, 비운영자 → /circles/[id] 로 redirect.
 */
export default async function EventNewPage({ params }: EventNewPageProps) {
  // ── Next.js 15 필수: params 를 await 해서 실제 값 획득 ────────────────
  const { id: circleId } = await params;

  // ── Supabase 클라이언트 (Fluid compute 대응: 함수 내에서 새로 생성) ────
  const supabase = await createClient();

  // ── 권한 검증 1-1: 인증 확인 (JWT 서명 검증, 네트워크 왕복 없음) ──────
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) {
    // 비인증 사용자 → 로그인 후 해당 페이지로 돌아오도록 next 파라미터 첨부
    redirect(`/auth/login?next=/circles/${circleId}/events/new`);
  }

  // ── 권한 검증 1-2: 운영자(staff/owner) 여부 확인 ─────────────────────
  // is_circle_staff RPC: circle_members 에서 role IN ('owner','staff') 를 체크한다.
  const { data: isStaff } = await supabase.rpc("is_circle_staff", {
    _circle_id: circleId,
  });
  if (!isStaff) {
    // 권한 없음 → 서클 상세 페이지로 복귀
    redirect(`/circles/${circleId}`);
  }

  // ── 권한 통과: 폼 렌더링 ─────────────────────────────────────────────
  return (
    <main className="container mx-auto max-w-2xl px-4 pb-24 pt-6">
      {/* 뒤로가기 링크 — 서클 상세 페이지로 */}
      <div className="mb-6">
        <Link
          href={`/circles/${circleId}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          aria-label="サークル・部活動ページに戻る"
        >
          <ArrowLeft className="size-4" aria-hidden />
          サークル・部活動ページに戻る
        </Link>
      </div>

      {/* 페이지 헤딩 */}
      <div className="mb-8 flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">イベントを作成</h1>
        <p className="text-sm text-muted-foreground">
          サークル・部活動のイベント情報を登録します
        </p>
      </div>

      {/* 이벤트 등록 폼 (Client Component) */}
      <EventForm circleId={circleId} />
    </main>
  );
}
