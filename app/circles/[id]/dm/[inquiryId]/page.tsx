/**
 * app/circles/[id]/dm/[inquiryId]/page.tsx
 *
 * DM 스레드 페이지 (Server Component).
 *
 * ── Defense in Depth 권한 검증 (1회차) ──────────────────────────────────────
 * 1회: 이 Server Component 에서 인증 + 데이터 존재 여부 검증.
 * 2회: 메시지 발송 Server Action(replyToInquiry) 에서 INSERT 직전 재검증.
 *
 * ── 접근 제어 ────────────────────────────────────────────────────────────────
 * - 미인증 → redirect to /auth/login?redirect_to=...
 * - 미참여자(발신자도 운영진도 아님) → RLS 가 null 반환 → notFound()
 * - URL circleId != inquiry.circle_id → notFound() (URL 변조 방어)
 *
 * ── 라우팅 ───────────────────────────────────────────────────────────────────
 * /circles/[id]/dm/[inquiryId]
 * template.tsx 의 pathname?.includes("/dm") 조건으로 motion 래퍼를 회피.
 * → fixed 레이아웃(composer)이 containing block 에 갇히지 않음.
 *
 * ── 캐시 정책 ────────────────────────────────────────────────────────────────
 * DM 은 개인 데이터 → unstable_cache 절대 금지.
 */

import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getInquiryWithMessages } from "@/lib/supabase/queries/inquiries";
import { DmThread } from "@/components/dm/dm-thread";
import DmThreadLoading from "./loading";

// ── Props ──────────────────────────────────────────────────────────────────────
// Next.js 15 필수: params 는 Promise 타입으로 선언
interface DmThreadPageProps {
  params: Promise<{ id: string; inquiryId: string }>;
}

/**
 * DM 스레드 페이지 — Suspense 로 감싸 loading.tsx 즉시 표시 후 교체.
 */
export default function DmThreadPage({ params }: DmThreadPageProps) {
  return (
    <Suspense fallback={<DmThreadLoading />}>
      <DmThreadContent params={params} />
    </Suspense>
  );
}

/**
 * 실제 데이터 로드 + 렌더링 담당 내부 Server Component.
 * Suspense 경계 안에서 async 하게 실행된다.
 */
async function DmThreadContent({ params }: DmThreadPageProps) {
  // ── Next.js 15 필수: params 를 await 해서 실제 값 획득 ──────────────────────
  const { id: circleId, inquiryId } = await params;

  // ── Supabase 클라이언트 (Fluid compute 대응: 함수 내에서 새로 생성) ───────────
  const supabase = await createClient();

  // ── 권한 검증 1회차: 인증 확인 (JWT 서명 검증, 네트워크 왕복 없음) ─────────────
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) {
    // 미인증 → 로그인 후 이 스레드 페이지로 복귀
    redirect(`/auth/login?next=${encodeURIComponent(`/circles/${circleId}/dm/${inquiryId}`)}`);
  }

  const currentUserId = claimsData.claims.sub as string;

  // ── inquiry + 메시지 조회 ─────────────────────────────────────────────────────
  // getInquiryWithMessages 내부에서 새 client 를 생성하므로 현재 supabase 와 중복이지만,
  // queries 레이어는 독립적으로 동작하는 것이 원칙 (Fluid compute 대응).
  const inquiry = await getInquiryWithMessages(inquiryId);

  // null = 존재하지 않거나 RLS 로 차단(미참여자)
  if (!inquiry) {
    notFound();
  }

  // URL 변조 방어: URL 의 circleId 와 inquiry 의 circle_id 가 일치해야 함
  if (inquiry.circle_id !== circleId) {
    notFound();
  }

  // ── 현재 사용자가 운영진인지 판별 ─────────────────────────────────────────────
  // is_circle_staff RPC: 운영진이면 true, 아니면 false
  const { data: isStaff } = await supabase.rpc("is_circle_staff", {
    _circle_id: circleId,
  });
  const viewerIsStaff = isStaff === true;

  // ── 자동 읽음 처리 ─────────────────────────────────────────────────────────
  // 읽음 처리는 Server Component 렌더 중에 하지 않는다.
  // (렌더 중 mutation/revalidate 는 Next.js 가 금지 — "used revalidatePath during render" 에러)
  // → 대신 client 인 dm-thread.tsx 의 마운트 effect 에서 markInquiryMessagesRead 를 호출하고
  //   kc:dm-read 이벤트로 헤더 배지를 즉시 갱신한다 (A-5: 화면엔 읽음 표시 안 함).

  return (
    <DmThread
      inquiry={inquiry}
      circleName={inquiry.circle_name}
      currentUserId={currentUserId}
      viewerIsStaff={viewerIsStaff}
    />
  );
}
