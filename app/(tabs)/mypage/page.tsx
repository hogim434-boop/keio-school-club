import { Suspense } from "react";

import { requireUser } from "@/lib/auth/require-user";
import { getMyProfile, getMyCircles } from "@/lib/supabase/queries/circles";
import { getMyInquiries, getStaffUnreadTotal } from "@/lib/supabase/queries/inquiries";
import { MyPageSkeleton } from "@/components/mypage/mypage-skeleton";
import { MyPageView } from "@/components/mypage/mypage-view";
import { MESSAGING_ENABLED } from "@/lib/constants/features";

/**
 * マイページ — 동아리 운영 대시보드 (T-018 개편).
 *
 * cacheComponents 모드에서 cookies() 의존 RSC 를 Suspense 로 감싸야 한다.
 * → 외부 Page 는 순수 Suspense 경계만 담당, 실제 데이터는 MyPageContent 에서 처리.
 *
 * 아키텍처:
 * - MyPageContent (서버): requireUser + 병렬 DB 조회 → props 전달
 * - MyPageView (클라이언트): LazyMotion stagger + ManagedCircleCard 목록
 * - MyPageSkeleton: Suspense fallback (실제 레이아웃 높이 일치)
 */
export default function MyPagePage() {
  return (
    /* fallback=null → fallback=<MyPageSkeleton /> 으로 교체: 빈 화면 점프 방지 */
    <Suspense fallback={<MyPageSkeleton />}>
      <MyPageContent />
    </Suspense>
  );
}

/**
 * 마이페이지 본문 — 서버 컴포넌트.
 * requireUser 가 미인증 시 /auth/login?next=/mypage 로 redirect, 인증이면 userId 반환.
 * 조회 완료 후 MyPageView 에 props 로 위임 (인라인 JSX 제거).
 */
async function MyPageContent() {
  /* 인증 가드 */
  const userId = await requireUser("/mypage");

  /* 프로필·서클 목록 병렬 조회.
     MESSAGING_ENABLED が true の場合のみ getMyInquiries も同時取得 (쿼리 절약). */
  const [profile, circles, myInquiries] = await Promise.all([
    getMyProfile(userId),
    getMyCircles(userId),
    // MESSAGING_ENABLED が false の場合: 문의 쿼리 스킵 → 빈 배열로 단락
    MESSAGING_ENABLED ? getMyInquiries() : Promise.resolve([]),
  ]);

  /* お問い合わせ 미읽음 합계:
     MESSAGING_ENABLED が false の場合は 0 固定 (섹션 자체 숨김이므로 계산 불필요).
     - 운영자 수신(내 동아리로 온 문의): 승인된 동아리들의 인박스 미읽음 합산 (circles 의존 → 2단계)
     - 발신자 수신(내 문의의 답장): myInquiries 의 unread_count 합산 */
  let unreadCount = 0;
  if (MESSAGING_ENABLED) {
    const approvedCircleIds = circles.filter((c) => c.status === "approved").map((c) => c.id);
    const staffUnread = await getStaffUnreadTotal(approvedCircleIds);
    const senderUnread = myInquiries.reduce((sum, i) => sum + i.unread_count, 0);
    unreadCount = staffUnread + senderUnread;
  }

  return (
    <MyPageView
      displayName={profile?.display_name ?? null}
      keioVerified={profile?.keio_verified ?? false}
      circles={circles}
      unreadCount={unreadCount}
    />
  );
}
