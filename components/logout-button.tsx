"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

/**
 * 헤더 DropdownMenu 및 마이페이지에서 재사용되는 로그아웃 버튼.
 * Supabase signOut 후 redirectTo 경로로 이동 (기본값: /auth/login).
 *
 * @param redirectTo signOut 후 이동할 경로 (기존 사용처는 prop 미전달 → 동작 불변)
 */
export function LogoutButton({ redirectTo = "/auth/login" }: { redirectTo?: string }) {
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
