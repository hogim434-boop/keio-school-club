/**
 * app/events/[id]/page.tsx
 *
 * イベント풀스크린 상세 페이지 — T-014 산출물 (F002 · F032).
 *
 * 아키텍처 원칙:
 * - Server Component only (no 'use client') — 데이터 취득은 모두 서버에서.
 * - [[circle-detail-template-fixed-trap]] 대피: /events/[id] 는 루트에 독립 위치.
 *   /circles/[id] 하위에 두면 circles template.tsx 의 슬라이드 트랜지션이 자식 풀스크린을 깨뜨림.
 * - proxy.ts 에서 /events/* 는 이미 공개 허용 — 추가 인증 처리 불필요.
 * - unstable_cache(tags:["events:public"], revalidate:60) — 1분 캐싱.
 * - visibility="public" 외 이벤트는 notFound() 처리.
 *
 * T-015 (RSVP pill):
 * - 하단 sticky CTA → EventRsvpPill 마운트 (단일 「参加する」 버튼).
 * - 현재 사용자 RSVP 상태는 서버에서 SSR 조회 (인증 쿠키 기반).
 * - 미로그인 → EventRsvpPill 내부에서 /auth/login?next=/events/{id} 리다이렉트.
 *
 * 댓글 섹션 (T-022): 운영 단순화를 위해 본 페이지에서 제외.
 *   필요해지면 EventComments 컴포넌트를 다시 마운트하면 됨.
 *
 * Wave 2 (TODO):
 * - D-day 카운트다운 — T-018
 * - visibility="members" 인증 처리 — T-019
 */

import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ChevronRight } from "lucide-react";

import { EventDetailHero } from "@/components/event/event-detail-hero";
import { EventMetaGrid } from "@/components/event/event-meta-grid";
import { EventDetailSkeleton } from "@/components/event/event-detail-skeleton";
import { CalendarAddButton } from "@/components/event/calendar-add-button";
import { EventCounts } from "@/components/event/event-counts";
import { ExpandableDescription } from "@/components/circles/expandable-description";
import { EventRsvpPill } from "@/components/event/event-rsvp-pill";
import { getEventById } from "@/lib/supabase/queries/events-public";
import { createClient } from "@/lib/supabase/server";
import type { EventDetail } from "@/lib/types/domain";
import type { CurrentRsvpStatus } from "@/components/event/event-rsvp-pill";

// ─────────────────────────────────────────────────────────────────────────────
// 페이지 진입점
// ─────────────────────────────────────────────────────────────────────────────

interface EventDetailPageProps {
  /** Next.js 15: params 는 Promise */
  params: Promise<{ id: string }>;
}

/**
 * イベント상세 페이지.
 *
 * Suspense 로 스켈레톤을 즉시 보여주고, 데이터가 준비되면 실제 콘텐츠로 교체.
 * pb-36: 뷰포트 하단 RSVP pill sticky CTA 영역 확보 (T-015)
 */
export default function EventDetailPage({ params }: EventDetailPageProps) {
  return (
    <main className="pb-36 md:pb-24">
      <Suspense fallback={<EventDetailSkeleton />}>
        <EventDetailContent params={params} />
      </Suspense>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 현재 사용자 RSVP 상태 조회 헬퍼
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 현재 로그인 사용자의 RSVP 상태를 서버에서 조회.
 *
 * - 미로그인 → { userId: null, status: null }
 * - 로그인 + 미등록 → { userId: string, status: null }
 * - 로그인 + 등록됨 → { userId: string, status: "interested" | "going" | ... }
 *
 * 주의: createClient() 는 매번 새로 생성 (Fluid compute 원칙).
 * unstable_cache 내부에서 사용 불가 — 인증 쿠키가 필요하므로 여기서 직접 호출.
 */
async function getCurrentRsvpStatus(
  eventId: string,
  rsvpMode: "light" | "strict"
): Promise<{ userId: string | null; status: CurrentRsvpStatus }> {
  const supabase = await createClient();

  // 현재 사용자 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { userId: null, status: null };
  }

  // rsvp_mode 에 따라 조회할 테이블 결정
  const table = rsvpMode === "light" ? "event_interests" : "event_rsvps";

  const { data } = await supabase
    .from(table)
    .select("status")
    .eq("event_id", eventId)
    .eq("user_id", user.id)
    .maybeSingle();

  return {
    userId: user.id,
    status: (data?.status as CurrentRsvpStatus) ?? null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 데이터 취득 + 렌더 (async Server Component)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * async Server Component — getEventById 호출 후 상세 렌더.
 *
 * - visibility != "public" → null 반환 → notFound()
 * - 이벤트 없음 → null 반환 → notFound()
 * - 취소된 이벤트는 EventMetaGrid 에서 취소 배너 표시 후 정상 렌더
 */
async function EventDetailContent({ params }: EventDetailPageProps) {
  const { id } = await params;

  // 이벤트 정보 + 현재 사용자 RSVP 상태를 병렬 조회
  // - getEventById: unstable_cache (anon, 캐싱)
  // - getCurrentRsvpStatus: 인증 쿠키 필요 → 캐싱 불가, 매번 실행
  const event = await getEventById(id);

  // 이벤트 없거나 비공개 → 404
  if (!event) notFound();

  // 현재 사용자 RSVP 상태 조회 (이벤트 존재 확인 후 실행)
  const { userId, status: initialStatus } = await getCurrentRsvpStatus(
    event.id,
    event.rsvp_mode
  );

  return (
    <article className="space-y-0">
      {/* ── 1. 히어로 영역 (커버 16:9 + 뒤로가기·공유 overlay) ────────────────
       * border-b: 히어로와 본문 사이 시각 구분
       */}
      <div className="border-b">
        <EventDetailHero event={event} />
      </div>

      {/* ── 본문 컨테이너 ─────────────────────────────────────────────────── */}
      <div className="container mx-auto max-w-2xl space-y-6 px-4 pt-6">
        {/* ── 2. 메타 정보 그리드 (일시 JST · 장소 · 정원 · 마감) ──────────── */}
        <EventMetaGrid event={event} />

        {/* ── 2-1. 이벤트 카운트 (T-016) ──────────────────────────────────────
         * light 모드: 気になる·行く予定 인원 수
         * strict 모드: 定員·残り·キャンセル待ち 현황
         * Server Component — 실시간 카운트 (캐시 없음)
         */}
        <EventCounts event={event} currentUserId={userId} />

        {/* ── 2-2. 캘린더 추가 버튼 (T-017) ───────────────────────────────────
         * 메타 그리드 바로 아래 오른쪽 정렬.
         * 취소된 이벤트에도 표시 (과거 이벤트 저장 용도).
         * CalendarAddButton 은 Client Component — 직렬화 가능 event 객체 전달.
         */}
        <div className="flex justify-end">
          <CalendarAddButton event={event} />
        </div>

        {/* ── 3. 이벤트 설명 (もっと見る / 折り畳み 토글) ─────────────────────
         * description 이 null/빈 문자열이면 섹션 미표시
         */}
        {event.description && event.description.trim().length > 0 && (
          <ExpandableDescription text={event.description} />
        )}

        {/* ── 4. 소속 서클 링크 카드 ──────────────────────────────────────── */}
        <CircleLink event={event} />
      </div>

      {/* ── 5. RSVP pill (하단 sticky CTA) ─────────────────────────────────────
       * T-015: EventRsvpPill 은 Client Component — createPortal 로 document.body 마운트.
       * 서버에서 조회한 currentUserId·initialStatus 를 직렬화 가능 props 로 전달.
       */}
      <EventRsvpPill
        event={event}
        currentUserId={userId}
        initialStatus={initialStatus}
      />
    </article>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 서브 컴포넌트
// ─────────────────────────────────────────────────────────────────────────────

/**
 * CircleLink — 「このサークル・部活動を見る」 링크 카드.
 *
 * 소속 서클의 아바타(커버 이미지) + 서클명 + 「›」 화살표.
 * /circles/{circle_id} 로 이동.
 *
 * 보더: 바로 위 ExpandableDescription 에 이미 border-b 가 있으므로 여기는
 *       border-t 를 두지 않는다 (두 줄 중복 방지). 위 섹션이 사라져도
 *       부모 컨테이너의 space-y-6 가 시각 간격을 유지한다.
 *
 * PRD 정책: 동아리를 언급할 때 「サークル」만이 아닌 「サークル・部活動」 포괄 표현 사용 [[avoid-koujin-wording]].
 */
function CircleLink({ event }: { event: EventDetail }) {
  return (
    <section className="pb-2">
      <h2 className="text-muted-foreground mb-3 text-xs font-semibold uppercase tracking-wider">
        主催サークル・部活動
      </h2>
      <Link
        href={`/circles/${event.circle_id}`}
        className="group flex items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        aria-label={`${event.circle_name} のページを見る`}
      >
        {/* 서클 아바타 — 커버 이미지 있으면 표시, 없으면 플레이스홀더 */}
        <div className="bg-muted relative size-12 shrink-0 overflow-hidden rounded-lg">
          {event.circle_cover_image_url ? (
            <Image
              src={event.circle_cover_image_url}
              alt={`${event.circle_name} カバー画像`}
              fill
              sizes="48px"
              className="object-cover"
            />
          ) : (
            /* 커버 없음 — keio-navy/10 그라데이션 플레이스홀더 */
            <div className="h-full w-full bg-gradient-to-br from-keio-navy/20 to-muted" />
          )}
        </div>

        {/* 서클명 + 링크 라벨 */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{event.circle_name}</p>
          <p className="text-muted-foreground text-xs">このサークル・部活動を見る</p>
        </div>

        {/* 화살표 아이콘 */}
        <ChevronRight
          className="text-muted-foreground size-4 shrink-0 transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
      </Link>
    </section>
  );
}
