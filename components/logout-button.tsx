"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

// 헤더 DropdownMenu 및 마이페이지에서 재사용되는 로그아웃 버튼
// Supabase signOut 후 로그인 페이지로 리디렉션
export function LogoutButton() {
  const router = useRouter();

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  return (
    <Button onClick={logout} variant="ghost" size="sm">
      ログアウト
    </Button>
  );
}
