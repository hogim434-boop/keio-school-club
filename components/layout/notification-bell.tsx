"use client";

/**
 * components/layout/notification-bell.tsx
 *
 * 헤더 종(Bell) 아이콘 = 알림 드로어 토글 + 안읽음 뱃지.
 *
 * - 종 클릭 → 우측 슬라이드 드로어(Sheet) 열림/닫힘. 드로어 밖(오버레이=종 위치 포함) 클릭 시 닫힘.
 * - 드로어가 열릴 때 getFeedAction()으로 통합 피드를 가져와 NotificationFeedView 로 렌더.
 * - 안읽음 뱃지: getBadgeInfoAction() + localStorage("kc:notif-seen") 비교.
 *   갱신 타이밍: 최초 마운트 1회 / 드로어 닫힘 / "kc:notif-read" 이벤트 / 60초 주기 폴링.
 *   (페이지 이동마다 DB 호출하던 pathname 의존 useEffect 는 제거됨)
 * - 하이드레이션 안전: 초기 점 false → 마운트 후 갱신.
 */

import { useCallback, useEffect, useState } from "react";
import { Bell } from "lucide-react";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { getBadgeInfoAction, getFeedAction } from "@/app/notifications/actions";
import { NotificationFeedView } from "@/components/notifications/notification-feed";
import type { FeedItem } from "@/lib/supabase/queries/notifications";
import { cn } from "@/lib/utils";

/** 헤더 아이콘 버튼 공통 클래스 — 40×40 hit target + focus ring */
const iconButton =
  "hover:bg-muted focus-visible:ring-ring inline-flex size-10 items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:outline-none";

const SEEN_KEY = "kc:notif-seen";

/** 뱃지 폴링 간격 (ms) — 60초 */
const BADGE_POLL_INTERVAL = 60_000;

export function NotificationBell() {
  const [hasUnread, setHasUnread] = useState(false);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<FeedItem[] | null>(null);
  const [loading, setLoading] = useState(false);

  /** 뱃지 정보 조회 + localStorage seen 비교 → 점 표시 여부 갱신 */
  const refreshBadge = useCallback(async () => {
    try {
      const info = await getBadgeInfoAction();
      let seen: string | null = null;
      try {
        seen = localStorage.getItem(SEEN_KEY);
      } catch {
        /* 무시 */
      }
      const unread =
        info.personalUnread > 0 ||
        (info.latestAnnouncementAt != null && (seen == null || info.latestAnnouncementAt > seen));
      setHasUnread(unread);
    } catch {
      setHasUnread(false);
    }
  }, []);

  // 마운트 시 1회 호출 + 60초 주기 폴링 (pathname 의존 제거 → 페이지 이동마다 DB 호출 방지)
  useEffect(() => {
    refreshBadge();

    const timerId = setInterval(refreshBadge, BADGE_POLL_INTERVAL);
    return () => clearInterval(timerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 피드 열람·すべて既読 시 NotificationFeedView 가 쏘는 이벤트 → 뱃지 클리어
  useEffect(() => {
    const handler = () => refreshBadge();
    window.addEventListener("kc:notif-read", handler);
    return () => window.removeEventListener("kc:notif-read", handler);
  }, [refreshBadge]);

  /** 드로어 열림/닫힘 핸들러 — 열릴 때 피드 fetch, 닫힐 때 뱃지 재계산 */
  const handleOpenChange = useCallback(
    async (next: boolean) => {
      setOpen(next);
      if (next) {
        setLoading(true);
        try {
          setItems(await getFeedAction());
        } catch {
          setItems([]);
        } finally {
          setLoading(false);
        }
      } else {
        refreshBadge();
      }
    },
    [refreshBadge]
  );

  const ariaLabel = hasUnread ? "お知らせ (未読あり)" : "お知らせ";

  return (
    <>
      <button
        type="button"
        onClick={() => handleOpenChange(!open)}
        aria-label={ariaLabel}
        className={cn(iconButton, "relative")}
      >
        <Bell className="size-5" aria-hidden="true" />
        {hasUnread && (
          <span
            aria-hidden="true"
            className="absolute top-1.5 right-1.5 size-2 rounded-full bg-red-500"
          />
        )}
      </button>

      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 sm:max-w-md">
          <SheetHeader className="border-b px-4 py-3.5">
            <SheetTitle className="text-base">お知らせ</SheetTitle>
          </SheetHeader>

          {loading || items === null ? (
            <p className="text-muted-foreground py-16 text-center text-sm">読み込み中...</p>
          ) : (
            <div className="py-2">
              <NotificationFeedView items={items} />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
