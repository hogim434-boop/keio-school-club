import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { UserMenu } from "@/components/layout/user-menu";

// 헤더 우측 인증 영역 (RSC)
// 로그인 상태에 따라 [ログイン / 新規登録] 또는 사용자 아바타 드롭다운을 노출
// cookies() 의존이므로 cacheComponents 모드에서 호출하는 부모는 Suspense 경계 필수
export async function AuthButton() {
  const supabase = await createClient();

  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (!claims) {
    return (
      <div className="flex gap-2">
        <Button asChild size="sm" variant="outline">
          <Link href="/auth/login">ログイン</Link>
        </Button>
        <Button asChild size="sm" variant="default">
          <Link href="/auth/sign-up">新規登録</Link>
        </Button>
      </div>
    );
  }

  // 표시명 — email 우선, 없으면 「ユーザー」 fallback
  const email = typeof claims.email === "string" ? claims.email : "ユーザー";

  return <UserMenu email={email} />;
}
