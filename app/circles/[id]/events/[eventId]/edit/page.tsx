/**
 * app/circles/[id]/events/[eventId]/edit/page.tsx
 *
 * イベント編集ページ — 운영자(staff/owner) 전용 Server Component.
 *
 * ── Defense in Depth 권한 검증 (1회차) ────────────────────────────────
 * Server Component 레벨에서 먼저 권한을 검증한다.
 * → 2회차는 Server Action (actions.ts) 의 updateEvent 에서 UPDATE 직전 재검증.
 *
 * 검증 흐름:
 *   1. getClaims() 로 JWT 서명 검증 (네트워크 왕복 없음)
 *   2. is_circle_staff RPC 로 운영자 여부 확인
 *   3. 조건 미충족 시 적절한 경로로 redirect
 *
 * ── 기존 이벤트 데이터 로드 및 폼 초기값 변환 ─────────────────────────
 * DB 의 timestamptz(UTC) 컬럼을 <input type="datetime-local"> 가 요구하는
 * "YYYY-MM-DDTHH:mm" 형식(JST)으로 변환 후 EventForm 에 initialValues 로 전달.
 *
 * ── 라우팅 ────────────────────────────────────────────────────────────
 * Next.js 15 App Router: params 는 Promise 이므로 반드시 await 해야 한다.
 * 경로: /circles/[id]/events/[eventId]/edit
 */

import { redirect, notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";

import { EventForm } from "@/components/event/event-form";
import { createClient } from "@/lib/supabase/server";
import type { EventFormValues } from "@/lib/events/event-schema";

// JST 타임존 식별자
const JST_TIMEZONE = "Asia/Tokyo";

// ── 이벤트 row 타입 (select 컬럼에 맞게 명시 선언) ──────────────────────
// Supabase 자동 생성 타입 대신 명시 선언 — select() 반환 타입 추론 실패 방지.
type EventRow = {
  id: string;
  circle_id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  cover_image_url: string | null;
  category: string | null;
  visibility: string;
  is_all_day: boolean;
  rsvp_mode: string;
  capacity: number | null;
  rsvp_deadline: string | null;
  requires_approval: boolean;
  cancelled_at: string | null;
};

// ── Props ──────────────────────────────────────────────────────────────
// Next.js 15: params 는 반드시 Promise 타입으로 선언
interface EventEditPageProps {
  params: Promise<{ id: string; eventId: string }>;
}

/**
 * UTC ISO 문자열 → JST datetime-local 문자열 변환 헬퍼.
 *
 * DB 에 저장된 UTC timestamptz 를 <input type="datetime-local"> 형식인
 * "YYYY-MM-DDTHH:mm"(JST) 으로 변환한다.
 * null / undefined 는 빈 문자열로 반환 (폼의 선택 필드 기본값 대응).
 *
 * @param utcIso - UTC ISO 8601 문자열 (예: "2026-06-07T05:00:00+00:00")
 * @returns      - JST datetime-local 문자열 (예: "2026-06-07T14:00")
 *               - 입력이 없으면 ""
 */
function utcToJstDatetimeLocal(utcIso: string | null | undefined): string {
  if (!utcIso) return "";
  try {
    const d = new Date(utcIso);
    // "YYYY-MM-DDTHH:mm" 형식으로 출력 (datetime-local 필드 형식과 일치)
    return formatInTimeZone(d, JST_TIMEZONE, "yyyy-MM-dd'T'HH:mm");
  } catch {
    return "";
  }
}

/**
 * イベント編集ページ (Server Component).
 *
 * params.id:      서클 UUID.
 * params.eventId: 수정 대상 이벤트 UUID.
 * 운영자만 접근 가능 — 비인증 → /auth/login, 비운영자 → /circles/[id] 로 redirect.
 * 이벤트 미존재 → notFound().
 */
export default async function EventEditPage({ params }: EventEditPageProps) {
  // ── Next.js 15 필수: params 를 await 해서 실제 값 획득 ────────────────
  const { id: circleId, eventId } = await params;

  // ── Supabase 클라이언트 (Fluid compute 대응: 함수 내에서 새로 생성) ────
  const supabase = await createClient();

  // ── 권한 검증 1-1: 인증 확인 (JWT 서명 검증, 네트워크 왕복 없음) ──────
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) {
    // 비인증 사용자 → 로그인 후 수정 페이지로 돌아오도록 next 파라미터 첨부
    redirect(
      `/auth/login?next=/circles/${circleId}/events/${eventId}/edit`
    );
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

  // ── 기존 이벤트 데이터 로드 ──────────────────────────────────────────
  // 폼 초기값(initialValues)을 채우기 위해 기존 이벤트 row 를 읽는다.
  const { data: event, error: fetchError } = await supabase
    .from("events")
    .select(
      [
        "id",
        "circle_id",
        "title",
        "description",
        "starts_at",
        "ends_at",
        "location",
        "cover_image_url",
        "category",
        "visibility",
        "is_all_day",
        "rsvp_mode",
        "capacity",
        "rsvp_deadline",
        "requires_approval",
        "cancelled_at",
      ].join(", ")
    )
    .eq("id", eventId)
    .single<EventRow>();

  if (fetchError || !event) {
    // 이벤트가 존재하지 않거나 접근 불가 → 404
    notFound();
  }

  // circle_id 소속 검증 (URL 변조 방어)
  if (event.circle_id !== circleId) {
    notFound();
  }

  // 취소된 이벤트는 수정 불가 → 이벤트 상세로 redirect
  if (event.cancelled_at) {
    redirect(`/events/${eventId}`);
  }

  // ── UTC timestamptz → JST datetime-local 변환 ────────────────────────
  // DB 에서 읽은 UTC 값을 <input type="datetime-local"> 가 기대하는
  // "YYYY-MM-DDTHH:mm" 형식(JST)으로 변환한다.
  const initialValues: Partial<EventFormValues> = {
    title: event.title ?? "",
    description: event.description ?? "",
    // UTC → JST datetime-local 변환
    starts_at: utcToJstDatetimeLocal(event.starts_at),
    ends_at: utcToJstDatetimeLocal(event.ends_at),
    rsvp_deadline: utcToJstDatetimeLocal(event.rsvp_deadline),
    location: event.location ?? "",
    cover_image_url: event.cover_image_url ?? "",
    category: event.category ?? "",
    visibility: (event.visibility as "public" | "members") ?? "public",
    is_all_day: event.is_all_day ?? false,
    // rsvp_mode: 수정 모드에서 disabled 이지만 폼에 기존 값 표시용으로 전달
    rsvp_mode: (event.rsvp_mode as "light" | "strict") ?? "light",
    capacity: event.capacity ?? null,
    requires_approval: event.requires_approval ?? false,
  };

  // ── 권한 통과: 수정 폼 렌더링 ────────────────────────────────────────
  return (
    <main className="container mx-auto max-w-2xl px-4 pb-24 pt-6">
      {/* 뒤로가기 링크 — 이벤트 상세 페이지로 */}
      <div className="mb-6">
        <Link
          href={`/events/${eventId}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          aria-label="イベント詳細に戻る"
        >
          <ArrowLeft className="size-4" aria-hidden />
          イベント詳細に戻る
        </Link>
      </div>

      {/* 페이지 헤딩 */}
      <div className="mb-8 flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">イベントを編集</h1>
        <p className="text-sm text-muted-foreground">
          イベント情報を変更します。変更内容は参加者に通知されます。
        </p>
      </div>

      {/* 이벤트 수정 폼 (Client Component) — mode="edit" 로 updateEvent 호출 */}
      <EventForm
        circleId={circleId}
        mode="edit"
        eventId={eventId}
        initialValues={initialValues}
      />
    </main>
  );
}
