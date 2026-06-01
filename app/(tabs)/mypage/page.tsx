import { Suspense } from "react";

import { requireUser } from "@/lib/auth/require-user";
import { getMyProfile, getMyCircles } from "@/lib/supabase/queries/circles";
import { MyPageSkeleton } from "@/components/mypage/mypage-skeleton";
import { MyPageView } from "@/components/mypage/mypage-view";

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

  /* 프로필·서클 목록 병렬 조회 */
  const [profile, circles] = await Promise.all([getMyProfile(userId), getMyCircles(userId)]);

  return (
    <MyPageView
      displayName={profile?.display_name ?? null}
      keioVerified={profile?.keio_verified ?? false}
      circles={circles}
    />
  );
}
