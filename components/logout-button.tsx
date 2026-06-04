"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

/**
 * 헤더 DropdownMenu 및 마이페이지에서 재사용되는 로그아웃 버튼.
 * Supabase signOut 후 redirectTo 경로로 이동 (기본값: "/" 현재 홈).
 *
 * 기본값을 "/"(큐레이션 홈)로 둔다. 과거 "/circles"(구버전 일람)나 "/auth/login"으로
 * 흩어져 있던 로그아웃 도착을 현재 홈으로 통일한다. 홈은 비로그인도 열람 가능.
 *
 * @param redirectTo signOut 후 이동할 경로 (미전달 시 "/")
 */
export function LogoutButton({ redirectTo = "/" }: { redirectTo?: string }) {
  const router = useRouter();

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push(redirectTo);
  };

  return (
    <Button onClick={logout} variant="ghost" size="sm">
      ログアウト
    </Button>
  );
}
