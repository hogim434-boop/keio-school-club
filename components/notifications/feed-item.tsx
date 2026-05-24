"use client";

/**
 * components/notifications/feed-item.tsx
 *
 * 알림 피드의 단일 항목을 렌더하는 컴포넌트.
 * - 타입별로 다른 아이콘과 색상을 표시
 * - 안읽음 상태(부모가 통합 계산해 내려주는 unread prop)에 따라 좌측 점·굵게 표시
 * - 링크: type + circle_id/link_url 조합으로 이동 대상 결정
 */

import Link from "next/link";
import { CheckCircle2, XCircle, Sparkles, CalendarDays, Megaphone } from "lucide-react";

import { cn } from "@/lib/utils";
import type { FeedItem } from "@/lib/supabase/queries/notifications";

// ─────────────────────────────────────────────
// 타입별 아이콘 메타데이터
// ─────────────────────────────────────────────
const TYPE_META: Record<
  FeedItem["type"],
  {
    Icon: React.ElementType;
    /** 아이콘 wrapper 배경색 */
    bgClass: string;
    /** 아이콘 자체 색상 */
    iconClass: string;
  }
> = {
  circle_approved: {
    Icon: CheckCircle2,
    bgClass: "bg-emerald-50 dark:bg-emerald-950",
    iconClass: "text-emerald-500",
  },
  circle_rejected: {
    Icon: XCircle,
    bgClass: "bg-destructive/10",
    iconClass: "text-destructive",
  },
  new_circle: {
    Icon: Sparkles,
    // keio-navy 는 Tailwind 커스텀 색상이므로 없을 경우 blue-800 로 대체
    bgClass: "bg-blue-50 dark:bg-blue-950",
    iconClass: "text-blue-800 dark:text-blue-300",
  },
  event: {
    Icon: CalendarDays,
    bgClass: "bg-orange-50 dark:bg-orange-950",
    iconClass: "text-orange-500",
  },
  notice: {
    Icon: Megaphone,
    bgClass: "bg-violet-50 dark:bg-violet-950",
    iconClass: "text-violet-500",
  },
};

// ─────────────────────────────────────────────
// 날짜 포맷 헬퍼
// ─────────────────────────────────────────────
/**
 * ISO 문자열 → 일본어 "M月d日" 형식으로 포맷
 * (오늘이면 "今日", 어제면 "昨日"로 표시)
 */
function formatDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();

  const toMidnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

  const diffDays = Math.floor((toMidnight(now) - toMidnight(date)) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "今日";
  if (diffDays === 1) return "昨日";

  return date.toLocaleDateString("ja-JP", { month: "long", day: "numeric" });
}

// ─────────────────────────────────────────────
// 링크 URL 계산 헬퍼
// ─────────────────────────────────────────────
/**
 * FeedItem 내용에 따라 이동할 URL을 반환.
 * - circle_approved / new_circle → /circles/{circle_id}
 * - circle_rejected → /circles/{circle_id}/edit
 * - event / notice → link_url(없으면 null)
 */
function resolveHref(item: FeedItem): string | null {
  if (item.type === "circle_approved" || item.type === "new_circle") {
    return item.circle_id ? `/circles/${item.circle_id}` : null;
  }
  if (item.type === "circle_rejected") {
    return item.circle_id ? `/circles/${item.circle_id}/edit` : null;
  }
  // event / notice
  return item.link_url ?? null;
}

/**
 * href 가 외부 URL인지 판별(http/https 로 시작하면 외부)
 */
function isExternalUrl(href: string): boolean {
  return href.startsWith("http://") || href.startsWith("https://");
}

// ─────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────
interface FeedItemRowProps {
  item: FeedItem;
  /**
   * 안읽음 여부 — 부모(NotificationFeedView)가 개인(read_at)·공개(localStorage seen) 판정을
   * 통합해 계산한 값. 「すべて既読」 후엔 false 로 내려와 시각적으로 읽음 처리된다.
   */
  unread: boolean;
}

// ─────────────────────────────────────────────
// 컴포넌트 본체
// ─────────────────────────────────────────────
export function FeedItemRow({ item, unread }: FeedItemRowProps) {
  const meta = TYPE_META[item.type];
  const { Icon, bgClass, iconClass } = meta;

  const isUnread = unread;

  const href = resolveHref(item);

  // 행 내부 공통 콘텐츠
  const content = (
    <div
      className={cn(
        "flex items-start gap-2.5 px-4 py-3.5 transition-colors",
        // 링크가 있으면 호버 효과
        href && "hover:bg-muted/50 cursor-pointer"
      )}
    >
      {/* 안읽음 점 — 제목 줄 높이에 맞춰 상단 정렬 */}
      <div className="flex w-2 shrink-0 items-center self-start pt-3">
        {isUnread && <span className="bg-primary size-2 rounded-full" aria-label="未読" />}
      </div>

      {/* 본문 영역 */}
      <div className="min-w-0 flex-1">
        {/* 제목 줄: 아이콘 + 타이틀을 세로 중앙 정렬 */}
        <div className="flex items-center gap-3">
          <div
            className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", bgClass)}
            aria-hidden="true"
          >
            <Icon className={cn("size-4.5", iconClass)} strokeWidth={2} />
          </div>
          <p
            className={cn(
              "min-w-0 flex-1 text-sm leading-snug",
              isUnread ? "text-foreground font-semibold" : "text-foreground/80 font-medium"
            )}
          >
            {item.title}
          </p>
        </div>

        {/* 본문 + 날짜: 아이콘 너비(size-9 36px + gap-3 12px = 48px)만큼 들여쓰기해 제목 아래 정렬 */}
        <div className="pl-12">
          {item.body && (
            <p className="text-muted-foreground mt-1 line-clamp-2 text-xs leading-relaxed">
              {item.body}
            </p>
          )}
          <p className="text-muted-foreground mt-1 text-[11px]">{formatDate(item.created_at)}</p>
        </div>
      </div>
    </div>
  );

  // ── 링크 래핑 ──
  if (!href) {
    // 링크 없는 항목은 div 로 렌더
    return <li className="border-b last:border-b-0">{content}</li>;
  }

  if (isExternalUrl(href)) {
    return (
      <li className="border-b last:border-b-0">
        <a href={href} target="_blank" rel="noopener noreferrer">
          {content}
        </a>
      </li>
    );
  }

  return (
    <li className="border-b last:border-b-0">
      <Link href={href}>{content}</Link>
    </li>
  );
}
