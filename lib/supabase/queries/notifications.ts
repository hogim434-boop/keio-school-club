/**
 * lib/supabase/queries/notifications.ts
 *
 * 알림 관련 RSC fetch 함수 모음.
 *
 * 알림은 2계통:
 * - 개인 알림(notifications): 로그인 본인만 조회(RLS select_own). 承認/却下 결과.
 * - 전체 공개 알림(announcements): 비로그인 포함 누구나 조회(RLS select_all). 공지/이벤트/새 동아리.
 *
 * 페이지는 getFeed()로 둘을 합친 통합 피드(FeedItem[])를 사용하고,
 * 헤더 뱃지는 getBadgeInfo()(개인 미읽음 수 + 최신 공지 시각)를 사용한다.
 *
 * 주의: createClient()는 호출마다 새로 생성(Fluid compute 전역 변수 금지).
 */

import { createClient } from "@/lib/supabase/server";

export type NotificationType = "circle_approved" | "circle_rejected";
export type AnnouncementType = "event" | "notice" | "new_circle";

/** 개인 알림 1건 */
export type AppNotification = {
  id: string;
  type: NotificationType;
  circle_id: string | null;
  circle_name: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
};

/** 전체 공개 알림 1건 */
export type Announcement = {
  id: string;
  type: AnnouncementType;
  title: string;
  body: string | null;
  circle_id: string | null;
  link_url: string | null;
  created_at: string;
};

/**
 * 통합 피드 아이템 — 개인 알림 + 공개 알림을 한 리스트로 렌더하기 위한 정규화 형태.
 * - unread: 개인 알림은 read_at == null. 공개 알림은 서버가 게스트 읽음 상태를 모르므로
 *   항상 false 로 두고, 클라이언트가 localStorage(kc:notif-seen) 와 created_at 비교로 별도 표시.
 */
export type FeedItem = {
  key: string;
  kind: "personal" | "broadcast";
  type: NotificationType | AnnouncementType;
  title: string;
  body: string | null;
  circle_id: string | null;
  link_url: string | null;
  created_at: string;
  unread: boolean;
};

/** 전체 공개 알림 목록 — 최신순. 비로그인도 조회 가능(RLS select_all). */
export async function getAnnouncements(limit = 50): Promise<Announcement[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("announcements")
    .select("id, type, title, body, circle_id, link_url, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[getAnnouncements]", error.message);
    return [];
  }
  return (data ?? []) as Announcement[];
}

/**
 * 내 개인 알림 목록 — 최신순. 비로그인이면 빈 배열.
 * RLS notifications_select_own 이 본인 것만 반환한다.
 */
export async function getMyNotifications(limit = 50): Promise<AppNotification[]> {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) return [];

  const { data, error } = await supabase
    .from("notifications")
    .select("id, type, circle_id, circle_name, body, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[getMyNotifications]", error.message);
    return [];
  }
  return (data ?? []) as AppNotification[];
}

/**
 * 통합 피드 — 개인 알림 + 공개 알림을 합쳐 created_at 내림차순 정렬.
 * 알림 페이지에서 사용. 비로그인은 공개 알림만 포함된다.
 */
export async function getFeed(): Promise<FeedItem[]> {
  const [announcements, personal] = await Promise.all([getAnnouncements(), getMyNotifications()]);

  const broadcastItems: FeedItem[] = announcements.map((a) => ({
    key: `b-${a.id}`,
    kind: "broadcast",
    type: a.type,
    // new_circle 은 title 에 동아리명만 저장돼 있으므로 안내 문장으로 가공
    title: a.type === "new_circle" ? `「${a.title}」が新しく追加されました` : a.title,
    body: a.body,
    circle_id: a.circle_id,
    link_url: a.link_url,
    created_at: a.created_at,
    unread: false,
  }));

  const personalItems: FeedItem[] = personal.map((n) => ({
    key: `p-${n.id}`,
    kind: "personal",
    type: n.type,
    // 개인 알림 제목은 type + 동아리명으로 구성(렌더 측에서 라벨 결합도 가능하나 여기서 완성)
    title:
      n.type === "circle_approved"
        ? `「${n.circle_name}」が承認されました`
        : `「${n.circle_name}」が却下されました`,
    body: n.body,
    circle_id: n.circle_id,
    link_url: null,
    created_at: n.created_at,
    unread: n.read_at === null,
  }));

  return [...broadcastItems, ...personalItems].sort((a, b) =>
    b.created_at.localeCompare(a.created_at)
  );
}

/**
 * 헤더 종 뱃지용 정보.
 * - personalUnread: 내 미읽음 개인 알림 수(비로그인이면 0 — RLS 가 anon 차단).
 * - latestAnnouncementAt: 가장 최근 공개 알림 시각(클라이언트가 localStorage seen 과 비교).
 */
export async function getBadgeInfo(): Promise<{
  personalUnread: number;
  latestAnnouncementAt: string | null;
}> {
  const supabase = await createClient();

  const [{ count }, latest] = await Promise.all([
    supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null),
    supabase
      .from("announcements")
      .select("created_at")
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  return {
    personalUnread: count ?? 0,
    latestAnnouncementAt: latest.data?.[0]?.created_at ?? null,
  };
}
