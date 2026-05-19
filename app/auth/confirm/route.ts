import { createClient } from "@/lib/supabase/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

// 오픈 리다이렉트 방지: next 파라미터를 안전한 상대 경로로만 제한
// - "/"로 시작해야 함 (절대 URL 차단: https://evil.com)
// - "//"로 시작하면 안 됨 (protocol-relative URL 차단: //evil.com)
function sanitizeNext(rawNext: string | null): string {
  if (!rawNext) return "/";
  if (!rawNext.startsWith("/")) return "/";
  if (rawNext.startsWith("//")) return "/";
  return rawNext;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = sanitizeNext(searchParams.get("next"));

  if (token_hash && type) {
    const supabase = await createClient();

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });
    if (!error) {
      // redirect user to specified redirect URL or root of app
      redirect(next);
    } else {
      // redirect the user to an error page with some instructions
      redirect(`/auth/error?error=${error?.message}`);
    }
  }

  // redirect the user to an error page with some instructions
  redirect(`/auth/error?error=No token hash or type`);
}
