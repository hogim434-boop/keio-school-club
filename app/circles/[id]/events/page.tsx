/**
 * app/circles/[id]/events/page.tsx
 *
 * 동아리별 이벤트 관리 목록 — 운영자(staff/owner) 전용 Server Component.
 *
 * 이벤트 생성/편집/신청자 관리 페이지로 들어가는 "허브" 화면이다.
 * 기존에는 이 페이지가 없어 운영자가 이벤트 운영 페이지에 진입할 방법이 없었다.
 *
 * ── Defense in Depth 권한 검증 ────────────────────────────────────────
 *   1. getClaims() — 미인증 시 /auth/login?next=... 로 redirect
 *   2. is_circle_staff RPC — 비운영자 시 /circles/[id] 로 redirect
 *   (events/new/page.tsx 와 동일 패턴)
 *
 * ── 레이아웃 함정 회피 ─────────────────────────────────────────────────
 * 부모 app/circles/[id]/template.tsx 는 /edit·/dm 만 모션 래퍼에서 제외한다.
 * 이 페이지는 모션 래퍼를 거치므로, fixed/풀스크린 sticky 헤더를 쓰면
 * will-change-transform containing block 때문에 0높이로 붕괴될 수 있다.
 * → events/new 와 동일하게 표준 문서 플로우(<main className="container ...">)로 작성한다.
 */

import { Suspense } from "react";
import { redirect } from "next/navigation";
import { CalendarPlus } from "lucide-react";
import Link from "next/link";

import { EventManageBackButton } from "@/components/event/event-manage-back-button";
import { EventManageCard } from "@/components/event/event-manage-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { calcDday } from "@/lib/format/jst";
import { createClient } from "@/lib/supabase/server";
import { getEventsByCircle } from "@/lib/supabase/queries/events-circle";

// 신청 현황 카운트는 실시간성이 중요 — 항상 최신으로 렌더
export const dynamic = "force-dynamic";

interface EventListPageProps {
  params: Promise<{ id: string }>;
}

export default async function EventListPage({ params }: EventListPageProps) {
  const { id: circleId } = await params;

  // ── 권한 검증 (Defense in Depth) ────────────────────────────────────
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) {
    redirect(`/auth/login?next=/circles/${circleId}/events`);
  }
  const { data: isStaff } = await supabase.rpc("is_circle_staff", {
    _circle_id: circleId,
  });
  if (!isStaff) {
    redirect(`/circles/${circleId}`);
  }

  return (
    <main className="container mx-auto max-w-2xl px-4 pt-6 pb-24">
      {/* 뒤로가기 — 직전 화면으로 복귀 (마이페이지/서클 상세 등 들어온 곳).
          히스토리가 없으면(직접 진입) 서클 상세로 fallback. */}
      <div className="mb-6">
        <EventManageBackButton fallbackHref={`/circles/${circleId}`} />
      </div>

      {/* 헤더: 타이틀 + 작성 버튼 */}
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">イベント管理</h1>
          <p className="text-muted-foreground text-sm">
            イベントの作成・編集・申込者管理ができます
          </p>
        </div>
        <Button asChild className="h-10 shrink-0">
          <Link href={`/circles/${circleId}/events/new`}>
            <CalendarPlus className="size-4" aria-hidden="true" />
            作成
          </Link>
        </Button>
      </div>

      <Suspense fallback={<EventListSkeleton />}>
        <EventListContent circleId={circleId} />
      </Suspense>
    </main>
  );
}

/**
 * 이벤트 목록 본문 — getEventsByCircle 결과를 「予定」 / 「終了・中止」 로 구분해 렌더.
 * 상태 분류는 서버에서 calcDday 로 계산(hydration mismatch 없음).
 */
async function EventListContent({ circleId }: { circleId: string }) {
  const events = await getEventsByCircle(circleId);

  // 0건: 작성 유도 빈 상태
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed py-12 text-center">
        <p className="text-muted-foreground text-sm">
          まだイベントがありません。
          <br />
          最初のイベントを作成しましょう。
        </p>
        <Button asChild>
          <Link href={`/circles/${circleId}/events/new`}>
            <CalendarPlus className="size-4" aria-hidden="true" />
            イベントを作成
          </Link>
        </Button>
      </div>
    );
  }

  // 予定(취소 안 됨 + 오늘 이후) / 終了・中止 로 분리
  const upcoming = events.filter((e) => !e.cancelled_at && calcDday(e.starts_at) >= 0);
  const past = events.filter((e) => e.cancelled_at || calcDday(e.starts_at) < 0);

  return (
    <div className="space-y-8">
      {upcoming.length > 0 && (
        <section className="space-y-3" aria-label="予定のイベント">
          <h2 className="text-muted-foreground text-xs font-semibold">予定 ({upcoming.length})</h2>
          <div className="space-y-3">
            {upcoming.map((event) => (
              <EventManageCard key={event.id} event={event} circleId={circleId} />
            ))}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section className="space-y-3" aria-label="終了・中止のイベント">
          <h2 className="text-muted-foreground text-xs font-semibold">
            終了・中止 ({past.length})
          </h2>
          <div className="space-y-3">
            {past.map((event) => (
              <EventManageCard key={event.id} event={event} circleId={circleId} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/** 목록 로딩 스켈레톤 — 카드 높이와 대략 일치 */
function EventListSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-16" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-3 rounded-xl border p-4">
          <div className="flex items-start justify-between gap-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-5 w-12 rounded-full" />
          </div>
          <Skeleton className="h-3 w-48" />
          <Skeleton className="h-3 w-32" />
          <div className="grid grid-cols-2 gap-2">
            <Skeleton className="h-9 w-full rounded-md" />
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}
