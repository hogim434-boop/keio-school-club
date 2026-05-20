import { Suspense } from "react";
import Link from "next/link";
import { CircleCheckBig } from "lucide-react";

import { requireUser } from "@/lib/auth/require-user";
import { getMyProfile, getMyCircles } from "@/lib/supabase/queries/circles";
import { LogoutButton } from "@/components/logout-button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/**
 * マイページ — T-016 실제 구현.
 *
 * cacheComponents 모드에서 cookies() 의존 RSC를 Suspense로 감싸야 한다.
 * → 외부 Page 는 순수 Suspense 경계, 실제 데이터는 MyPageContent 에서 처리.
 */
export default function MyPagePage() {
  return (
    <Suspense fallback={null}>
      <MyPageContent />
    </Suspense>
  );
}

/**
 * 마이페이지 본문 — 서버 컴포넌트.
 * requireUser 가 미인증 시 /auth/login?next=/mypage 로 redirect, 인증이면 userId 반환.
 */
async function MyPageContent() {
  /* 인증 가드 */
  const userId = await requireUser("/mypage");

  /* 프로필·서클 목록 병렬 조회 */
  const [profile, circles] = await Promise.all([getMyProfile(userId), getMyCircles(userId)]);

  return (
    <div className="container mx-auto max-w-2xl space-y-6 px-4 py-6">
      {/* ── 1. 페이지 타이틀 ── */}
      <h1 className="text-2xl font-bold">マイページ</h1>

      {/* ── 2. 프로필 카드 ── */}
      <Card>
        <CardContent className="space-y-2 p-4">
          {/* 닉네임 — display_name 없으면 未設定 표시 */}
          <p className="text-lg font-semibold">{profile?.display_name ?? "未設定"}</p>

          {/* 慶應 인증 뱃지 — keio_verified true 일 때만 표시 */}
          {profile?.keio_verified && (
            <Badge variant="outline" className="flex w-fit items-center gap-1">
              <CircleCheckBig className="h-3.5 w-3.5" />
              慶應生認証済み
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* ── 3. 등록 서클 수 + 관리 버튼 ── */}
      <Card>
        <CardContent className="space-y-3 p-4">
          {/* 서클 수 */}
          <p className="text-base font-medium">登録サークル {circles.length}件</p>

          {/* 서클이 1건 이상: 관리 페이지 링크 버튼 */}
          <Button asChild className="h-12 w-full">
            <Link href="/mypage/circles">登録サークルを管理</Link>
          </Button>

          {/* 서클이 0건일 때 추가로 안내 + 신규 등록 버튼 */}
          {circles.length === 0 && (
            <div className="space-y-3 pt-1">
              <p className="text-muted-foreground text-sm">まだ登録したサークルがありません</p>
              <Button asChild variant="outline" className="h-12 w-full">
                <Link href="/circles/new">+ サークルを登録する</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── 4. 로그아웃 버튼 ── */}
      <div>
        <LogoutButton redirectTo="/circles" />
      </div>
    </div>
  );
}
