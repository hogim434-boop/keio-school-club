import { Suspense } from "react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { EnvVarWarning } from "@/components/env-var-warning";
import { AuthButton } from "@/components/auth-button";
import { MainNav } from "@/components/layout/main-nav";
import { hasEnvVars } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";

// KCircle 통합 헤더 (RSC)
// PRD 메뉴 구조를 데스크탑 가로 nav + 모바일 햄버거 패턴으로 노출
// 인증 영역은 Suspense 로 래핑하여 cacheComponents 모드에서 stale 회피
export async function Header() {
  // role 추출 — profiles 테이블 도입(T-006) 전까지는 user.app_metadata?.role 임시 경로 사용
  // 환경 변수 부재 시 supabase 호출 skip
  let role: string | undefined;
  if (hasEnvVars) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    const appMetadata = data?.claims?.app_metadata as { role?: string } | undefined;
    role = appMetadata?.role;
  }

  return (
    <header className="bg-background/80 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40 border-b backdrop-blur">
      <div className="container mx-auto flex h-14 items-center gap-2 px-4">
        {/* 로고 — 모바일에서는 햄버거가 사라지고 BottomNav 가 메뉴를 담당 */}
        <Link href="/" className="text-base font-bold tracking-tight">
          KCircle
        </Link>

        {/* 데스크탑 가로 nav (md 이상 노출) */}
        <MainNav role={role} className="ml-6 hidden md:flex" />

        {/* 우측 영역 — 인증 / 테마 */}
        <div className="ml-auto flex items-center gap-2">
          {!hasEnvVars ? (
            <EnvVarWarning />
          ) : (
            <Suspense fallback={<Skeleton className="h-8 w-20" />}>
              <AuthButton />
            </Suspense>
          )}
          <ThemeSwitcher />
        </div>
      </div>
    </header>
  );
}
