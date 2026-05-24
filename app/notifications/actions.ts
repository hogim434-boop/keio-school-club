"use server";

/**
 * app/notifications/actions.ts
 *
 * 알림 페이지/헤더 뱃지에서 사용하는 Server Actions.
 * - markPersonalRead: 로그인 사용자의 미읽음 개인 알림을 모두 읽음 처리(read_at=now()).
 * - getBadgeInfoAction: 헤더 종 뱃지(클라이언트)가 호출하는 뱃지 정보 조회 래퍼.
 */

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getBadgeInfo, getFeed, type FeedItem } from "@/lib/supabase/queries/notifications";

/**
 * 내 미읽음 개인 알림을 모두 읽음 처리.
 * RLS notifications_update_own 이 본인 행만 허용하므로 read_at is null 필터만으로 안전.
 * 비로그인은 무시(no-op).
 */
export async function markPersonalRead(): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) return { ok: true };

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);

  if (error) {
    console.error("[markPersonalRead]", error.message);
    return { ok: false };
  }
  revalidatePath("/notifications");
  return { ok: true };
}

/** 헤더 종 뱃지용 정보 조회(클라이언트 컴포넌트에서 호출). */
export async function getBadgeInfoAction(): Promise<{
  personalUnread: number;
  latestAnnouncementAt: string | null;
}> {
  return getBadgeInfo();
}

/** 통합 피드 조회 — 헤더 종 드로어가 열릴 때 클라이언트에서 호출. */
export async function getFeedAction(): Promise<FeedItem[]> {
  return getFeed();
}
