"use client";

/**
 * components/layout/messages-link.tsx
 *
 * ヘッダーメッセージアイコン (Client Component).
 *
 * ── 動作 ─────────────────────────────────────────────────────────────────────
 * - MessageCircle アイコン + /messages への Link.
 * - 未読件数バッジ: 数値表示 (99+ 上限). 0 件時はバッジ非表示.
 * - データ取得: getMyUnreadInquiriesTotal Server Action.
 *   マウント時 1 回 + 60 秒ポーリング.
 *   失敗時は try/catch でバッジ非表示 (0 に fallback).
 * - 未ログイン: アイコン表示・バッジ 0. クリック → proxy.ts が
 *   /auth/login?next=/messages に誘導.
 * - (選択) kc:dm-read イベント listen → 即時再取得でバッジ更新.
 *
 * ── NotificationBell との共通パターン ────────────────────────────────────────
 * iconButton クラス (40×40 hit target + focus ring) を共用.
 * ドロワーではなく Link 移動 (要件 1).
 *
 * ── A-5 準拠 ────────────────────────────────────────────────────────────────
 * バッジは数値のみ. 「既読」文字列は表示しない.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { MessageCircle } from "lucide-react";

import { getMyUnreadInquiriesTotal } from "@/app/messages/actions";
import { cn } from "@/lib/utils";

/** ヘッダーアイコンボタン共通クラス — 40×40 hit target + focus ring */
const iconButton =
  "hover:bg-muted focus-visible:ring-ring inline-flex size-10 items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:outline-none";

/** バッジポーリング間隔 (ms) — 60 秒 */
const BADGE_POLL_INTERVAL = 60_000;

/** バッジ数値の上限 */
const BADGE_MAX = 99;

export function MessagesLink() {
  // 未読件数 (0 = バッジ非表示)
  const [unreadCount, setUnreadCount] = useState(0);

  /** 未読件数を取得・更新する */
  const refreshBadge = useCallback(async () => {
    try {
      const count = await getMyUnreadInquiriesTotal();
      setUnreadCount(count);
    } catch {
      // エラー時はバッジ非表示 (0 に fallback)
      setUnreadCount(0);
    }
  }, []);

  // マウント時 1 回 + 60 秒ポーリング
  useEffect(() => {
    refreshBadge();

    const timerId = setInterval(refreshBadge, BADGE_POLL_INTERVAL);
    return () => clearInterval(timerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // kc:dm-read イベント: スレッド既読後にバッジを即時更新
  useEffect(() => {
    const handler = () => refreshBadge();
    window.addEventListener("kc:dm-read", handler);
    return () => window.removeEventListener("kc:dm-read", handler);
  }, [refreshBadge]);

  const hasUnread = unreadCount > 0;
  const ariaLabel = hasUnread ? `メッセージ (未読${unreadCount}件)` : "メッセージ";

  return (
    <Link href="/messages" aria-label={ariaLabel} className={cn(iconButton, "relative")}>
      <MessageCircle className="size-5" aria-hidden="true" />

      {/* 未読バッジ — A-5: 「既読」テキスト禁止, 数値のみ */}
      {hasUnread && (
        <span
          aria-hidden="true"
          className={cn(
            "absolute top-0.5 right-0.5 flex min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] leading-4 font-bold text-white tabular-nums",
            // 1 桁 (4×4), 2 桁以上 (横に伸びる)
            unreadCount <= 9 ? "size-4" : "h-4"
          )}
        >
          {unreadCount > BADGE_MAX ? `${BADGE_MAX}+` : unreadCount}
        </span>
      )}
    </Link>
  );
}
