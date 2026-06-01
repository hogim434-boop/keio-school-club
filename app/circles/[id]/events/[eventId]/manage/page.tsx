/**
 * app/circles/[id]/events/[eventId]/manage/page.tsx
 *
 * イベント申込者管理ページ (T-024 산출물).
 *
 * ── Defense in Depth 권한 검증 ────────────────────────────────────────────
 * 1회: 인증 확인 — 미로그인 시 /auth/login 으로 redirect.
 * 2회: 운영자 확인 — is_circle_staff RPC 실패 시 서클 상세로 redirect.
 *
 * ── 데이터 로드 ─────────────────────────────────────────────────────────────
 * - events 테이블에서 이벤트 정보 (제목·rsvp_mode·capacity·cancelled_at) 로드.
 * - listEventRsvps() 로 신청자 목록(+ profiles JOIN) 로드.
 * - rsvp_mode='light' 이면 listEventInterests() 도 로드.
 * - getUnsentChangesCount() 로 미발송 변경 수 로드 (T-026).
 *
 * ── T-025 추가 ───────────────────────────────────────────────────────────────
 * EventCancelDialog — 「イベントを中止する」 버튼 + AlertDialog.
 * 이미 취소된 이벤트이면 버튼 비활성화 + 취소 사유 배너 표시.
 *
 * ── 레이아웃 ─────────────────────────────────────────────────────────────────
 * 고정 헤더(뒤로가기·제목) + 필터 탭 + 목록 카드 구조.
 * EventManageList Client Component 에 데이터를 prop 으로 전달한다.
 */

import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Settings } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { listEventRsvps, listEventInterests } from "@/lib/supabase/queries/event-rsvps";
import { getUnsentChangesCount } from "@/lib/supabase/queries/event-change-logs";
import { formatJst } from "@/lib/format/jst";
import EventManageList from "@/components/event/event-manage-list";
import { EventCancelDialog } from "@/components/event/event-cancel-dialog";

// ─────────────────────────────────────────────────────────────────────────────
//  페이지 Props
// ─────────────────────────────────────────────────────────────────────────────

interface PageProps {
  // Next.js 15.5: params 는 Promise
  params: Promise<{ id: string; eventId: string }>;
}

// ─────────────────────────────────────────────────────────────────────────────
//  페이지 컴포넌트
// ─────────────────────────────────────────────────────────────────────────────

export default async function EventManagePage({ params }: PageProps) {
  // ── 0. params 언래핑 (Next.js 15 async request API) ──────────────────────
  const { id: circleId, eventId } = await params;

  // ── 1. Supabase 클라이언트 (매번 새로 생성 — Fluid compute 대응) ──────────
  const supabase = await createClient();

  // ── 2-1. Defense in Depth: 인증 확인 ─────────────────────────────────────
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) {
    redirect(`/auth/login?next=/circles/${circleId}/events/${eventId}/manage`);
  }

  // ── 2-2. Defense in Depth: 운영자 권한 확인 ──────────────────────────────
  const { data: isStaff } = await supabase.rpc("is_circle_staff", {
    _circle_id: circleId,
  });
  if (!isStaff) {
    // 권한 없음 → 서클 상세로
    redirect(`/circles/${circleId}`);
  }

  // ── 3. 이벤트 정보 로드 ───────────────────────────────────────────────────
  // T-025: cancelled_at 외에 cancellation_reason 도 SELECT
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select(
      `
      id,
      title,
      starts_at,
      rsvp_mode,
      capacity,
      requires_approval,
      cancelled_at,
      cancellation_reason
    `
    )
    .eq("id", eventId)
    .eq("circle_id", circleId) // circle_id 일치 확인 (다른 서클 이벤트 접근 방지)
    .maybeSingle();

  if (eventError || !event) {
    notFound();
  }

  // ── 4. 신청자 목록 + 미발송 변경 수 병렬 로드 ───────────────────────────
  const [rsvps, interests, unsentCount] = await Promise.all([
    // strict 모드이면 event_rsvps, light 모드는 빈 배열
    event.rsvp_mode === "strict"
      ? listEventRsvps(eventId)
      : Promise.resolve([]),
    // light 모드이면 event_interests, strict 모드는 빈 배열
    event.rsvp_mode === "light"
      ? listEventInterests(eventId)
      : Promise.resolve([]),
    // T-026: 미발송 변경 로그 수 (변경 통지 버튼 배지 표시용)
    getUnsentChangesCount(eventId),
  ]);

  // ── 5. 이벤트 시작일 포맷 (JST) ──────────────────────────────────────────
  const startsAtDisplay = formatJst(event.starts_at, "yyyy/MM/dd (E) HH:mm");

  // ── 6. CSV 다운로드 URL ────────────────────────────────────────────────────
  const csvUrl = `/circles/${circleId}/events/${eventId}/manage/csv`;

  // ── 7. 취소 여부 플래그 ────────────────────────────────────────────────────
  const isCancelled = Boolean(event.cancelled_at);

  // ─────────────────────────────────────────────────────────────────────────
  //  렌더
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* ── 고정 상단 헤더 ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center gap-3 px-4">
          {/* 뒤로가기 */}
          <Link
            href={`/circles/${circleId}`}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only sm:not-sr-only">戻る</span>
          </Link>

          {/* 페이지 제목 영역 */}
          <div className="flex flex-1 flex-col min-w-0">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 shrink-0 text-muted-foreground" />
              <h1 className="text-sm font-semibold leading-tight truncate">
                申込者一覧
              </h1>
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {event.title}
            </p>
          </div>

          {/* 이벤트 일시 배지 */}
          <time
            dateTime={event.starts_at}
            className="hidden sm:block shrink-0 text-xs text-muted-foreground"
          >
            {startsAtDisplay}
          </time>
        </div>
      </header>

      {/* ── 메인 콘텐츠 ───────────────────────────────────────────────── */}
      <main className="flex-1 px-4 py-4 max-w-2xl w-full mx-auto space-y-4">
        {/* 이벤트 요약 정보 카드 */}
        <div className="rounded-lg border bg-card p-4 text-sm">
          <div className="grid grid-cols-2 gap-2 text-muted-foreground">
            <div>
              <span className="font-medium text-foreground">定員</span>
              <span className="ml-2">
                {event.capacity != null ? `${event.capacity}名` : "制限なし"}
              </span>
            </div>
            <div>
              <span className="font-medium text-foreground">モード</span>
              <span className="ml-2">
                {event.rsvp_mode === "strict" ? "事前承認" : "興味あり"}
              </span>
            </div>
            {event.requires_approval && (
              <div className="col-span-2 text-amber-600 dark:text-amber-400">
                ※ 承認制イベントです
              </div>
            )}
          </div>
        </div>

        {/* T-025: 취소된 이벤트 배너 (cancellation_reason 포함) */}
        {isCancelled && (
          <div
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 space-y-1"
          >
            <p className="text-destructive text-sm font-bold">⚠ このイベントは中止されました</p>
            {event.cancellation_reason && (
              <p className="text-destructive/80 text-xs leading-relaxed">
                理由: {event.cancellation_reason}
              </p>
            )}
          </div>
        )}

        {/* T-025: イベント中止ボタン (AlertDialog) */}
        <div className="flex justify-end">
          <EventCancelDialog
            eventId={eventId}
            circleId={circleId}
            eventTitle={event.title}
            isCancelled={isCancelled}
          />
        </div>

        {/* 申込者管理リスト (Client Component) */}
        <EventManageList
          circleId={circleId}
          eventId={eventId}
          rsvpMode={event.rsvp_mode as "strict" | "light"}
          rsvps={rsvps}
          interests={interests}
          csvUrl={csvUrl}
          unsentCount={unsentCount}
        />
      </main>
    </div>
  );
}

// 동적 렌더링 강제 (신청자 목록은 실시간성 필요)
export const dynamic = "force-dynamic";
