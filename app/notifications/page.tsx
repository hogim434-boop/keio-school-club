import { getFeed } from "@/lib/supabase/queries/notifications";
import { NotificationList } from "@/components/notifications/notification-list";

/**
 * /notifications — お知らせ 페이지.
 *
 * 공개 페이지(비로그인 허용). proxy.ts 에서 미인증 통과 경로이므로 권한 가드 없음.
 * - 로그인 사용자: 개인 알림(승인/거절) + 전체 공개 알림을 합친 피드
 * - 비로그인: 전체 공개 알림만
 *
 * 데이터는 서버에서 한 번 가져오고 클라이언트로 직렬화.
 * 읽음 처리(markPersonalRead)와 localStorage seen 갱신은
 * 클라이언트 NotificationList 의 useEffect 에서 수행.
 */
export default async function NotificationsPage() {
  const feed = await getFeed();

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6">
      <header className="mb-5">
        <h1 className="text-xl font-bold tracking-tight">お知らせ</h1>
      </header>

      <NotificationList items={feed} />
    </main>
  );
}
