"use client";

/**
 * components/event/event-rsvp-pill.tsx
 *
 * 이벤트 RSVP CTA — 단일 「参加する」 버튼 형태 (簡素化版).
 *
 * 설계 의도:
 * - 사용자는 「気になる/行く予定」 / 「行く/たぶん行く/行かない」 와 같은
 *   다단계 분기 대신, 단일 「参加する」 액션으로 의사를 표명한다.
 * - 상세 분기(maybe / declined / interested)는 운영자가 정원·로직 측면에서
 *   필요해질 때까지 UI 에 노출하지 않는다 (KISS).
 *
 * 모드별 분기:
 * - light  → event_interests 에 status="going" 저장
 * - strict → event_rsvps 에 status="going" 저장 (requires_approval 일 때는 "pending")
 *
 * 미로그인:
 * - 버튼 라벨: 「ログインして参加する」
 * - 클릭 시 /auth/login?next=/events/{id} 로 이동 → 로그인 성공 후 본 페이지 복귀
 *
 * 취소된 이벤트:
 * - 버튼 비활성 + 상단 안내 「このイベントはキャンセルされました」
 *
 * 공통:
 * - 낙관적 UI: useTransition + 즉시 상태 반영
 * - createPortal 로 document.body 마운트 (template transform 충돌 방지)
 */

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { setLightInterest, setStrictRsvp } from "@/app/events/[id]/actions";
import type { EventDetail } from "@/lib/types/domain";

// ─────────────────────────────────────────────────────────────────────────────
// 타입
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 현재 RSVP 상태 (서버에서 SSR 시 조회한 값).
 * 호환성을 위해 기존 다섯 가지 status 를 그대로 받지만,
 * 본 컴포넌트는 「going 또는 pending = 참가 중」 / 그 외 = 미참가 만 구분한다.
 */
export type CurrentRsvpStatus = "interested" | "going" | "maybe" | "declined" | "pending" | null;

interface EventRsvpPillProps {
  /** 이벤트 상세 정보 (rsvp_mode, requires_approval, id, cancelled_at) */
  event: Pick<EventDetail, "id" | "rsvp_mode" | "requires_approval" | "cancelled_at" | "capacity">;
  /** 로그인한 사용자 UUID (null=미로그인) */
  currentUserId: string | null;
  /** 현재 사용자의 RSVP 상태 (null=미등록) */
  initialStatus: CurrentRsvpStatus;
}

// ─────────────────────────────────────────────────────────────────────────────
// 메인 컴포넌트
// ─────────────────────────────────────────────────────────────────────────────

export function EventRsvpPill({ event, currentUserId, initialStatus }: EventRsvpPillProps) {
  // Portal 마운트 가드 — SSR 단계에서는 document 미존재
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // 낙관적 UI — 서버 응답 전까지 로컬 상태로 즉시 반영
  const [optimisticStatus, setOptimisticStatus] = useState<CurrentRsvpStatus>(initialStatus);
  const [isPending, startTransition] = useTransition();

  const router = useRouter();

  const isCancelled = Boolean(event.cancelled_at);
  // 「参加中」 판정 — going(확정) 또는 pending(승인 대기) 모두 포함
  const isJoined = optimisticStatus === "going" || optimisticStatus === "pending";
  const isPendingApproval = optimisticStatus === "pending";

  // ── 미로그인 처리 ─────────────────────────────────────────────────────────
  // 로그인 페이지로 보내고 next 파라미터에 본 페이지 URL 을 보존하여
  // 로그인 성공 후 자동 복귀하도록 함. 복귀 후 사용자가 다시 「参加する」
  // 를 클릭하면 그제서야 DB 에 반영된다 — 「로그인 성공 시 반영」 요구사항 충족.
  function requireLogin() {
    router.push(`/auth/login?next=/events/${event.id}`);
  }

  // ── 단일 「参加する」 버튼 클릭 핸들러 ─────────────────────────────────────
  function handleClick() {
    if (!currentUserId) {
      requireLogin();
      return;
    }

    // 현재 참가 중이면 취소(null), 아니면 going 으로 등록
    const next: "going" | null = isJoined ? null : "going";

    // 낙관적 반영 — strict + 승인 필요 + going 일 때 화면상 pending 으로 표시
    const optimisticNext =
      next === "going" && event.rsvp_mode === "strict" && event.requires_approval
        ? "pending"
        : next;

    const prevStatus = optimisticStatus;
    setOptimisticStatus(optimisticNext as CurrentRsvpStatus);

    startTransition(async () => {
      const result =
        event.rsvp_mode === "light"
          ? await setLightInterest(event.id, next)
          : await setStrictRsvp(event.id, next, event.requires_approval);

      if (!result.ok) {
        // 실패 시 롤백
        setOptimisticStatus(prevStatus);
        console.error("[EventRsvpPill] error:", result.error);
      }
    });
  }

  // ── 버튼 라벨 결정 ────────────────────────────────────────────────────────
  const buttonLabel = (() => {
    if (isCancelled) return "キャンセル済み";
    if (!currentUserId) return "ログインして参加する";
    if (isPendingApproval) return "申請中（クリックで取消）";
    if (isJoined) return "参加中（クリックで取消）";
    return "参加する";
  })();

  // 활성 상태별 색상 — 참가 중이면 muted, 미참가면 강조색(navy)
  const buttonColor = isJoined
    ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
    : "bg-keio-navy text-keio-navy-foreground hover:bg-keio-navy/90";

  // ─────────────────────────────────────────────────────────────────────────
  // CTA 렌더
  // ─────────────────────────────────────────────────────────────────────────

  const ctaElement = (
    <div className={cn("fixed right-0 bottom-0 left-0 z-30", "pb-[env(safe-area-inset-bottom)]")}>
      <div className="mx-auto max-w-md px-3 pb-3">
        {/* 카드 chrome 없이 단일 액션 버튼만 노출 (심플화).
            상태(申請中/参加中/キャンセル済み 등)는 버튼 라벨로 전달되며,
            버튼 자체 그림자로 콘텐츠 위에서 분리감을 유지한다. */}
        <button
          type="button"
          disabled={isPending || isCancelled}
          onClick={handleClick}
          aria-pressed={isJoined}
          className={cn(
            "w-full rounded-full py-3 text-sm font-semibold shadow-lg transition-colors",
            "focus-visible:ring-keio-navy/50 focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none",
            "disabled:pointer-events-none disabled:opacity-50",
            "touch-manipulation select-none",
            buttonColor
          )}
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  );

  return <>{mounted && createPortal(ctaElement, document.body)}</>;
}
