import { Suspense } from "react";
import Link from "next/link";

import { requireUser } from "@/lib/auth/require-user";
import { getMyCircles } from "@/lib/supabase/queries/circles";
import { MyCircleCard } from "@/components/mypage/my-circle-card";
import { Button } from "@/components/ui/button";

/**
 * 登録サークル管理ページ — T-016 실제 구현.
 *
 * cacheComponents 모드 호환을 위해 cookies() 의존 RSC를 Suspense로 감싸야 한다.
 * → 외부 Page 는 Suspense 경계, 실제 데이터는 MyCirclesContent 에서 처리.
 */
export default function MyCirclesPage() {
  return (
    <Suspense fallback={null}>
      <MyCirclesContent />
    </Suspense>
  );
}

/**
 * 내 서클 목록 본문 — 서버 컴포넌트.
 * requireUser 가 미인증 시 /auth/login?next=/mypage/circles 로 redirect, 인증이면 userId 반환.
 */
async function MyCirclesContent() {
  /* 인증 가드 */
  const userId = await requireUser("/mypage/circles");

  /* 오너 기준 전체 서클 조회 (status 무관, created_at desc) */
  const circles = await getMyCircles(userId);

  return (
    <div className="container mx-auto max-w-2xl space-y-4 px-4 py-6">
      {/* ── 1. 타이틀 + 부가설명 ── */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">登録サークル管理</h1>
        {/* 심사 상태 확인 안내 */}
        <p className="text-muted-foreground text-sm">
          登録したサークルの審査状況・却下理由をここで確認できます
        </p>
      </div>

      {/* ── 2. 서클 목록 or 빈 상태 ── */}
      {circles.length === 0 ? (
        /* 빈 상태: 안내 메시지 + 신규 등록 버튼 */
        <div className="space-y-3 pt-4">
          <p className="text-muted-foreground text-sm">まだ登録したサークルがありません</p>
          <Button asChild className="h-12 w-full">
            <Link href="/circles/new">+ サークルを登録する</Link>
          </Button>
        </div>
      ) : (
        /* 서클 목록: 1건씩 MyCircleCard 로 표시 */
        <ul className="space-y-3">
          {circles.map((c) => (
            <li key={c.id}>
              <MyCircleCard circle={c} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
