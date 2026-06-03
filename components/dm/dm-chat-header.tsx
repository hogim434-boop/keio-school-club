"use client";

/**
 * components/dm/dm-chat-header.tsx
 *
 * DM 채팅 공유 헤더 컴포넌트 (Client Component).
 *
 * ── 역할 ──────────────────────────────────────────────────────────────────────
 * NewDmChat / DmThread 두 화면에서 동일한 채팅 헤더를 표시한다.
 *
 * ── 뒤로가기 ──────────────────────────────────────────────────────────────────
 * 동아리 상세로 고정 이동하지 않고, 직전 페이지로 되돌아간다(router.back()).
 * → 메시지 목록(/messages)에서 들어왔으면 목록으로, 동아리 상세에서 들어왔으면 상세로.
 * 공유 링크 등으로 history 없이 직접 진입한 경우에만 /messages 로 fallback.
 *
 * ── 규칙 ──────────────────────────────────────────────────────────────────────
 * - F058: 운영진 개인 이름·개인 아바타 비노출. 서클명 이니셜 + 원형 아이콘.
 * - A-5: 「既読」·「オンライン」 등 실시간 상태 표시 절대 금지.
 * - 카피 규칙: 일본어 UI. 금지어(公認/公式LINEに参加/必ず) 사용 금지.
 */

import { useRouter } from "next/navigation";
import { ArrowLeft, MessageCircle } from "lucide-react";

import { AvgResponseTimeBadge } from "@/components/dm/avg-response-time";
import { cn } from "@/lib/utils";
import type { AvgResponseTime } from "@/lib/supabase/queries/inquiries";

interface DmChatHeaderProps {
  /** 서클명 — 「{circleName}運営」라벨 + 이니셜 아이콘에 사용 */
  circleName: string;
  /**
   * 평균 응답 시간 배지 데이터 (선택).
   * undefined 이면 배지 미표시.
   */
  avgResponseTime?: AvgResponseTime;
  /** 추가 className (선택) */
  className?: string;
}

/**
 * DM 채팅 화면 상단 헤더.
 *
 * NewDmChat / DmThread 두 화면에서 공통 사용.
 * 뒤로가기(← 직전 페이지) + 운영진 아이콘 + 「{circleName}運営」라벨 + 응답시간 배지.
 */
export function DmChatHeader({ circleName, avgResponseTime, className }: DmChatHeaderProps) {
  const router = useRouter();

  /**
   * 직전 페이지로 복귀. history 가 없으면(직접 진입) 메시지 목록으로 fallback.
   */
  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/messages");
    }
  }

  return (
    <header
      className={cn(
        // sticky top-0: 스크롤 시에도 헤더는 상단에 고정
        "bg-background/95 sticky top-0 z-20 flex items-center gap-3 border-b px-4 py-3",
        // backdrop blur 로 메시지가 헤더 아래로 스크롤될 때 부드럽게 가려짐
        "backdrop-blur-sm",
        className
      )}
    >
      {/* ── 뒤로가기 버튼 (직전 페이지로) ──────────────────────────────── */}
      <button
        type="button"
        onClick={handleBack}
        aria-label="前のページに戻る"
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full",
          "text-foreground/70 transition-colors",
          "hover:bg-muted hover:text-foreground",
          "-ml-1" // 왼쪽 여백 최소화 (앱형 패딩)
        )}
      >
        <ArrowLeft className="size-5" aria-hidden />
      </button>

      {/* ── 운영진 아이콘 (F058: 개인 아바타 비노출) ────────────────────── */}
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full",
          "bg-keio-navy/10 text-keio-navy"
        )}
        aria-hidden
      >
        {circleName.charAt(0) ? (
          <span className="text-sm font-bold">{circleName.charAt(0)}</span>
        ) : (
          <MessageCircle className="size-4" />
        )}
      </div>

      {/* ── 서클명 + 보조 텍스트 ───────────────────────────────────────── */}
      <div className="min-w-0 flex-1">
        {/* F058: 「{circleName}運営」형식으로만 표시 — 개인 이름 비노출 */}
        <p className="truncate text-sm leading-tight font-semibold">{circleName}運営</p>
        <p className="text-muted-foreground text-xs leading-tight">サークル・部活動の運営</p>
      </div>

      {/* ── 평균 응답 시간 배지 (있을 때만 표시) ──────────────────────── */}
      {avgResponseTime !== undefined && (
        <AvgResponseTimeBadge value={avgResponseTime} className="shrink-0" />
      )}
    </header>
  );
}
