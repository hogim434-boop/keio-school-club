import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** RSC에서 로그인 사용자 확인 — 미인증 시 로그인 페이지로 redirect, 인증 시 userId 반환 */
export async function requireUser(nextPath: string): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    redirect(`/auth/login?next=${encodeURIComponent(nextPath)}`);
  }
  return data.claims.sub as string;
}
