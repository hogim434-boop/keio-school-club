/**
 * app/circles/[id]/dm/page.tsx
 *
 * 운영진 DM 신규 문의 발신 페이지 (Server Component).
 *
 * ── Defense in Depth 권한 검증 (1회차) ────────────────────────────────────
 * Server Component 레벨에서 먼저 인증을 확인한다.
 * → 2회차는 Server Action (actions.ts) 의 sendInquiry 에서 INSERT 직전 재검증.
 *
 * ── 라우팅 ─────────────────────────────────────────────────────────────────
 * /circles/[id]/dm 경로.
 * template.tsx 에서 /dm 포함 경로는 motion 래퍼를 건너뜀 → 풀스크린 붕괴 방지.
 *
 * ── 미로그인 redirect ───────────────────────────────────────────────────────
 * redirect_to 파라미터로 현재 URL 을 보존 → 로그인 후 이 페이지로 복귀.
 * (A-1 안티패턴 회피: redirect_to 보존 필수 — CLAUDE.md 제약)
 *
 * ── 캐시 정책 ──────────────────────────────────────────────────────────────
 * DM 은 개인 데이터 → unstable_cache 절대 금지.
 * 서클명 조회도 cookies() 사용하는 server client 경유 → 캐시 제외.
 */

import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { ShieldBan } from "lucide-react";

import { NewDmChat } from "@/components/dm/new-dm-chat";
import { createClient } from "@/lib/supabase/server";
import { getAvgResponseTime, getActiveInquiryForUser } from "@/lib/supabase/queries/inquiries";
import { MESSAGING_ENABLED } from "@/lib/constants/features";
import DmInquiryLoading from "./loading";

// ── Props ──────────────────────────────────────────────────────────────────
// Next.js 15: params 는 반드시 Promise 타입으로 선언해야 함
interface DmInquiryPageProps {
  params: Promise<{ id: string }>;
}

/**
 * DM 문의 페이지 (Server Component).
 *
 * Suspense 로 감싸서 page 진입 즉시 스켈레톤(loading.tsx)을 보여주고,
 * 서버 데이터 로드 완료 후 실제 콘텐츠로 교체한다.
 */
export default function DmInquiryPage({ params }: DmInquiryPageProps) {
  return (
    <Suspense fallback={<DmInquiryLoading />}>
      <DmInquiryContent params={params} />
    </Suspense>
  );
}

/**
 * 실제 데이터 로드 + 렌더링 담당 내부 Server Component.
 * Suspense 경계 안에서 async 하게 실행된다.
 */
async function DmInquiryContent({ params }: DmInquiryPageProps) {
  // ── Next.js 15 필수: params 를 await 해서 실제 값 획득 ──────────────────
  const { id: circleId } = await params;

  // ── MESSAGING_ENABLED ガード (인증 가드보다 먼저 체크) ───────────────────
  // false の場合: 서클 상세 페이지로 리다이렉트
  if (!MESSAGING_ENABLED) {
    redirect(`/circles/${circleId}`);
  }

  // ── Supabase 클라이언트 (Fluid compute 대응: 함수 내에서 새로 생성) ─────
  const supabase = await createClient();

  // ── 권한 검증 1회차: 인증 확인 (JWT 서명 검증, 네트워크 왕복 없음) ────────
  // getClaims() 는 서명 검증만 수행 — getUser() 와 달리 외부 요청 없이 빠름.
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) {
    // 미인증 → 로그인 페이지, redirect_to 로 현재 URL 보존 (로그인 후 복귀 가능)
    redirect(`/auth/login?next=${encodeURIComponent(`/circles/${circleId}/dm`)}`);
  }

  const currentUserId = claimsData.claims.sub as string;

  // ── 서클 존재 + 이름 조회 ──────────────────────────────────────────────
  // circles.name 만 select — 불필요한 데이터 전송 최소화
  const { data: circle, error: circleError } = await supabase
    .from("circles")
    .select("id, name")
    .eq("id", circleId)
    .maybeSingle();

  if (circleError) {
    console.error("[DmInquiryPage] circle fetch error:", circleError.message);
  }

  // 서클이 존재하지 않으면 404
  if (!circle) {
    notFound();
  }

  // ── T-032: 현재 사용자가 이 서클에서 차단됐는지 확인 ───────────────────
  // user_blocks WHERE blocked_user_id=현재사용자 AND circle_id=circleId
  // 차단된 경우 채팅창 대신 안내 메시지를 표시한다.
  const { count: blockedCount, error: blockCheckError } = await supabase
    .from("user_blocks")
    .select("blocker_user_id", { count: "exact", head: true })
    .eq("blocked_user_id", currentUserId)
    .eq("circle_id", circleId);

  if (blockCheckError) {
    console.error("[DmInquiryPage] user_blocks check error:", blockCheckError.message);
    // 차단 확인 실패 시에는 채팅창을 렌더해 sendInquiry 의 fail-closed 가 방어함
  }

  // 차단 상태 판정
  const isBlocked = !blockCheckError && (blockedCount ?? 0) > 0;

  // ── 기존 활성 대화방 조회 (채팅 개편) ─────────────────────────────────
  // 차단되지 않은 경우에만 조회.
  // 활성 대화방(status: open|resolved)이 있으면 해당 스레드로 redirect.
  // 없으면 NewDmChat(빈 채팅창)을 렌더.
  if (!isBlocked) {
    const activeInquiry = await getActiveInquiryForUser(circleId);
    if (activeInquiry) {
      // 기존 스레드로 직행 (URL: /circles/{circleId}/dm/{inquiryId})
      redirect(`/circles/${circleId}/dm/${activeInquiry.id}`);
    }
  }

  // ── T-034: 평균 응답 시간 조회 ─────────────────────────────────────────
  // 공개·비개인 집계 수치 → unstable_cache(tags:["circles"]) 캐싱됨.
  const avgResponseTime = await getAvgResponseTime(circleId);

  return (
    <>
      {isBlocked ? (
        /* ── T-032: 차단 상태 — 채팅창 대신 안내 표시 ──────────────────── */
        /* 강제·위협 톤 금지 (CLAUDE.md 금지어 규칙) */
        <main className="container mx-auto max-w-2xl px-4 pt-6 pb-24">
          <div className="bg-muted/40 flex flex-col items-center gap-4 rounded-xl border px-6 py-10 text-center">
            <ShieldBan className="text-muted-foreground/50 size-10" aria-hidden />
            <div className="space-y-1.5">
              <p className="text-foreground text-sm font-medium">
                現在お問い合わせを受け付けていません
              </p>
              <p className="text-muted-foreground text-xs">
                このサークル・部活動へのお問い合わせはご利用いただけない状態です。
              </p>
            </div>
          </div>
        </main>
      ) : (
        /* ── 정상 상태 — 빈 채팅창(NewDmChat) 렌더 ─────────────────────── */
        /* 헤더·응답시간 배지는 NewDmChat 내부에 통합 */
        <NewDmChat circleId={circleId} circleName={circle.name} avgResponseTime={avgResponseTime} />
      )}
    </>
  );
}
