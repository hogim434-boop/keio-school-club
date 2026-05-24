"use client";

/**
 * components/notifications/notification-feed.tsx
 *
 * 알림 피드 본문(드로어·페이지 공용 프레젠테이션).
 * - 날짜별 그룹 헤더(今日 / 昨日 / それ以前)
 * - 「すべて既読」 버튼
 * - 안읽음 통합 판정: 개인(read_at=null) + 공개(localStorage seen 이후 생성)
 * - 빈 상태
 *
 * 동작:
 * - 마운트 시 안읽음 키를 먼저 계산(표시용 보존)한 뒤, markPersonalRead() + localStorage seen 갱신
 *   → 헤더 종 뱃지가 즉시 사라짐("kc:notif-read" 이벤트로 종에 알림). 표시된 강조는 이번 열람 동안 유지.
 * - 「すべて既読」 클릭 시 강조를 즉시 해제(cleared).
 */

import { useEffect, useState } from "react";
import { BellOff } from "lucide-react";

import { markPersonalRead } from "@/app/notifications/actions";
import type { FeedItem } from "@/lib/supabase/queries/notifications";
import { FeedItemRow } from "@/components/notifications/feed-item";

const SEEN_KEY = "kc:notif-seen";

/** 날짜 버킷 분류 */
type Bucket = "today" | "yesterday" | "earlier";
const BUCKET_LABEL: Record<Bucket, string> = {
  today: "今日",
  yesterday: "昨日",
  earlier: "それ以前",
};

function dateBucket(iso: string): Bucket {
  const d = new Date(iso);
  const now = new Date();
  const toMidnight = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.floor((toMidnight(now) - toMidnight(d)) / 86400000);
  if (diff <= 0) return "today";
  if (diff === 1) return "yesterday";
  return "earlier";
}

export function NotificationFeedView({ items }: { items: FeedItem[] }) {
  // 안읽음 키 집합(개인+공개 통합). 초기 빈 Set → 마운트 후 계산(하이드레이션 안전).
  const [unreadKeys, setUnreadKeys] = useState<Set<string>>(() => new Set());
  // 「すべて既読」 누른 뒤 강조 일괄 해제
  const [cleared, setCleared] = useState(false);

  useEffect(() => {
    // 1) seen 시각을 먼저 읽어 안읽음 계산
    let seenAt: Date | null = null;
    try {
      const raw = localStorage.getItem(SEEN_KEY);
      if (raw) seenAt = new Date(raw);
    } catch {
      /* 프라이빗 모드 등 무시 */
    }

    const next = new Set<string>();
    for (const it of items) {
      const isUnread =
        it.kind === "personal" ? it.unread : !seenAt || new Date(it.created_at) > seenAt;
      if (isUnread) next.add(it.key);
    }
    setUnreadKeys(next);

    // 2) 읽음 처리 + seen 갱신 → 헤더 종 뱃지 클리어
    markPersonalRead().catch(() => {});
    try {
      localStorage.setItem(SEEN_KEY, new Date().toISOString());
    } catch {
      /* 무시 */
    }
    window.dispatchEvent(new Event("kc:notif-read"));
    // items 는 열람 시점 1회 고정이므로 deps 비움
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasUnread = !cleared && unreadKeys.size > 0;

  function handleMarkAllRead() {
    markPersonalRead().catch(() => {});
    try {
      localStorage.setItem(SEEN_KEY, new Date().toISOString());
    } catch {
      /* 무시 */
    }
    setCleared(true);
    window.dispatchEvent(new Event("kc:notif-read"));
  }

  // ── 빈 상태 ──
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
        <BellOff
          className="text-muted-foreground/40 size-12"
          strokeWidth={1.5}
          aria-hidden="true"
        />
        <p className="text-muted-foreground text-sm">お知らせはありません</p>
      </div>
    );
  }

  // 날짜별 그룹(items 는 created_at 내림차순이므로 순서대로 묶으면 됨)
  const groups: { bucket: Bucket; items: FeedItem[] }[] = [];
  for (const it of items) {
    const b = dateBucket(it.created_at);
    const last = groups[groups.length - 1];
    if (last && last.bucket === b) last.items.push(it);
    else groups.push({ bucket: b, items: [it] });
  }

  return (
    <div>
      {/* すべて既読 */}
      {hasUnread && (
        <div className="flex justify-end px-4 pb-1">
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="text-keio-navy text-xs font-medium hover:underline"
          >
            すべて既読
          </button>
        </div>
      )}

      {groups.map((g) => (
        <section key={g.bucket}>
          <h2 className="text-muted-foreground bg-muted/40 px-4 py-1.5 text-xs font-medium">
            {BUCKET_LABEL[g.bucket]}
          </h2>
          <ul>
            {g.items.map((it) => (
              <FeedItemRow key={it.key} item={it} unread={!cleared && unreadKeys.has(it.key)} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
