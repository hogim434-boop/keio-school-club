"use client";

/**
 * components/notifications/notification-list.tsx
 *
 * /notifications 풀페이지에서 사용하는 얇은 래퍼.
 * 실제 렌더(날짜 그룹·すべて既読·안읽음·빈 상태)는 드로어와 공용인 NotificationFeedView 가 담당.
 */

import type { FeedItem } from "@/lib/supabase/queries/notifications";
import { NotificationFeedView } from "@/components/notifications/notification-feed";

export function NotificationList({ items }: { items: FeedItem[] }) {
  return <NotificationFeedView items={items} />;
}
