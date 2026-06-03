/**
 * app/circles/[id]/dm/inbox/page.tsx
 *
 * 運営者 DM インボックスページ (Server Component).
 *
 * ── Defense in Depth 権限検証 ────────────────────────────────────────────────
 * 1回目: このページで getClaims() → is_circle_staff RPC によるガード.
 * 2回目: getCircleInbox の内部で RLS が circle_id + is_circle_staff を再確認.
 *
 * ── アクセス制御 ─────────────────────────────────────────────────────────────
 * - 未認証         → /auth/login?redirect_to=... にリダイレクト
 * - 運営でない      → notFound() (存在自体を秘匿)
 *
 * ── ルーティング注意 ──────────────────────────────────────────────────────────
 * /circles/[id]/dm/inbox は静的セグメント.
 * /circles/[id]/dm/[inquiryId] は動的セグメント.
 * 同階層に並んでいるが、Next.js は静的セグメントを優先するので競合しない.
 * (「inbox」という文字列は UUID ではないため [inquiryId] と区別される)
 *
 * ── キャッシュポリシー ────────────────────────────────────────────────────────
 * DM は個人データ → unstable_cache 絶対禁止.
 * Server Component は毎リクエスト最新データを取得する.
 */

import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getCircleInbox } from "@/lib/supabase/queries/inquiries";
import { InboxList } from "@/components/dm/inbox-list";
import { PresenceHeartbeat } from "@/components/dm/presence-heartbeat";
import DmInboxLoading from "./loading";

// ── Props ──────────────────────────────────────────────────────────────────────
// Next.js 15 필수: params 는 Promise 타입으로 선언
interface DmInboxPageProps {
  params: Promise<{ id: string }>;
}

/**
 * DM 인박스 페이지.
 * Suspense 로 감싸서 loading.tsx 스켈레톤을 즉시 표시 후 교체.
 */
export default function DmInboxPage({ params }: DmInboxPageProps) {
  return (
    <Suspense fallback={<DmInboxLoading />}>
      <DmInboxContent params={params} />
    </Suspense>
  );
}

/**
 * 実際のデータロード + レンダリングを担う内部 Server Component.
 * Suspense 境界の内側で async に実行される.
 */
async function DmInboxContent({ params }: DmInboxPageProps) {
  // ── Next.js 15 필수: params 를 await 해서 실제 값 획득 ──────────────────
  const { id: circleId } = await params;

  // ── Supabase 클라이언트 (Fluid compute 대응: 함수 내에서 새로 생성) ─────
  const supabase = await createClient();

  // ── 권한 검증 1회차: 인증 확인 (JWT 서명 검증, 네트워크 왕복 없음) ────────
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) {
    // 미인증 → 로그인 후 이 페이지로 복귀
    redirect(`/auth/login?next=${encodeURIComponent(`/circles/${circleId}/dm/inbox`)}`);
  }

  const currentUserId = claimsData.claims.sub as string;

  // ── 권한 검증 2회차: 운영진 여부 확인 (Defense in Depth) ────────────────
  // is_circle_staff RPC: circle_members WHERE user_id=auth.uid() AND role IN ('owner','staff')
  // 운영진이 아닌 경우 notFound() — 인박스 존재 여부 자체를 비공개로 처리
  const { data: isStaff, error: staffError } = await supabase.rpc("is_circle_staff", {
    _circle_id: circleId,
  });

  if (staffError) {
    console.error("[DmInboxPage] is_circle_staff RPC error:", staffError.message);
    notFound();
  }

  if (isStaff !== true) {
    // 운영진이 아닌 사용자는 인박스에 접근 불가 → 404 (존재 비공개)
    notFound();
  }

  // ── 서클명 조회 (헤딩 표시용) ────────────────────────────────────────
  const { data: circle } = await supabase
    .from("circles")
    .select("id, name")
    .eq("id", circleId)
    .maybeSingle();

  if (!circle) {
    notFound();
  }

  // ── 인박스 목록 SSR 조회 ────────────────────────────────────────────
  const inboxItems = await getCircleInbox(circleId);

  // ── 차단 목록 조회 (N+1 방지: 한 번만 조회해 Set 으로 변환) ─────────────
  // user_blocks WHERE blocker_user_id=현재운영진 AND circle_id=circleId
  // blocked_user_id 목록을 Set 으로 만들어 InboxList 에 전달.
  // 스레드 카드 렌더링 시 O(1) 조회로 차단 여부 확인 가능.
  const { data: blockRows } = await supabase
    .from("user_blocks")
    .select("blocked_user_id")
    .eq("blocker_user_id", currentUserId)
    .eq("circle_id", circleId);

  const blockedUserIds = new Set<string>(
    (blockRows ?? []).map((row) => row.blocked_user_id as string)
  );

  return (
    <main className="container mx-auto max-w-2xl px-4 pt-6 pb-24">
      {/* ── 뒤로가기 링크 ────────────────────────────────────────────── */}
      <div className="mb-6">
        <Link
          href={`/circles/${circleId}`}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
          aria-label="サークル・部活動ページに戻る"
        >
          <ArrowLeft className="size-4" aria-hidden />
          サークル・部活動ページに戻る
        </Link>
      </div>

      {/* ── ページヘッダー ───────────────────────────────────────────── */}
      <div className="mb-6 space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">DM インボックス</h1>
        <p className="text-muted-foreground text-sm">{circle.name} への問い合わせ一覧</p>
      </div>

      {/*
       * presence-heartbeat: 운영진이 인박스를 열어두는 동안 온라인 상태를 갱신한다.
       * UI 없음 — 부수효과 전용. userId を server で取得して props で渡す.
       */}
      <PresenceHeartbeat circleId={circleId} userId={currentUserId} />

      {/* ── インボックス一覧 ──────────────────────────────────────────── */}
      <div className="rounded-xl border">
        <InboxList initialItems={inboxItems} circleId={circleId} blockedUserIds={blockedUserIds} />
      </div>
    </main>
  );
}
