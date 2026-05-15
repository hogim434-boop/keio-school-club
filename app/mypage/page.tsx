import { Suspense } from "react";
import { redirect } from "next/navigation";

import { ComingSoon } from "@/components/layout/coming-soon";
import { createClient } from "@/lib/supabase/server";
import { hasEnvVars } from "@/lib/utils";

/**
 * マイページ — Phase 1.3 T-016 에서 프로필·verified 뱃지·등록 서클 수 카드로 실제 구현 예정.
 *
 * 로그인 가드: 미인증 사용자는 `/auth/login?next=/mypage` 로 리다이렉트.
 * - middleware(proxy.ts) 의 isPublicPath 가 1차 가드 (`/mypage` fallthrough → 인증 필수)
 * - 본 페이지의 supabase.auth.getClaims() 가 2차 안전망 (RSC fetch / 환경변수 변경 케이스 대비)
 *
 * cacheComponents 모드 호환을 위해 cookies() 의존 영역은 Suspense 로 감쌈.
 * 본 패턴은 app/protected/page.tsx, app/circles/[id]/page.tsx 에서 일관되게 사용됨.
 */
export default function MyPagePage() {
  return (
    <Suspense fallback={null}>
      <MyPageContent />
    </Suspense>
  );
}

async function MyPageContent() {
  // hasEnvVars false 시 supabase 호출 skip — landing 에서 EnvVarWarning 안내됨
  if (hasEnvVars) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    if (!data?.claims) {
      redirect("/auth/login?next=/mypage");
    }
  }

  return (
    <ComingSoon
      title="マイページ"
      description="プロフィールと keio_verified バッジを確認するアカウントハブ"
      plannedPhase="Phase 1.3 (T-016)"
    />
  );
}
