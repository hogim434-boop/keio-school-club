import { Suspense } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { hasEnvVars } from "@/lib/utils";

/**
 * /admin/* 영역 공통 가드 레이아웃.
 *
 * 2단계 가드:
 * 1) proxy.ts isPublicPath — `/admin` 은 인증 필수로 명시 (미로그인 차단)
 * 2) 본 layout 의 AdminGuard — is_admin() RPC 로 role='admin' 검증 (일반 로그인 사용자 차단)
 *
 * 미로그인 사용자: `/auth/login?next=<원래 admin 경로>` 로 보내 로그인 후 복귀 가능.
 * 일반 로그인 사용자(admin 아님): `/circles` 로 조용히 리다이렉트 — 관리자 페이지 존재 자체를 노출하지 않음.
 *
 * cacheComponents 모드 호환을 위해 cookies()/RPC 의존 영역은 Suspense 로 감쌈.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <AdminGuard>{children}</AdminGuard>
    </Suspense>
  );
}

async function AdminGuard({ children }: { children: React.ReactNode }) {
  // hasEnvVars false 시 supabase 호출 skip — landing 에서 EnvVarWarning 안내됨
  if (!hasEnvVars) {
    return <>{children}</>;
  }

  // proxy.ts 가 forward 해 둔 x-pathname 으로 정확한 복귀 경로 보존
  // (/admin/circles, /admin/users 등 어디서 차단됐는지 그대로 next 에 넣기 위함)
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "/admin/circles";

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  // 1차: 미로그인 — proxy.ts 가 막아주지만 RSC fetch / env 변경 등 엣지 케이스 대비
  if (!data?.claims) {
    redirect(`/auth/login?next=${encodeURIComponent(pathname)}`);
  }

  // 2차: role='admin' 검증 — is_admin() RPC 는 SECURITY DEFINER + profiles.role 조회 (T-006)
  const { data: isAdmin, error } = await supabase.rpc("is_admin");
  if (error || !isAdmin) {
    // 관리자 페이지 존재 노출 방지 — 일반 사용자 동선인 /circles 로 조용히 이동
    redirect("/circles");
  }

  return <>{children}</>;
}
