/**
 * /auth/callback — Google OAuth PKCE 콜백 라우트
 *
 * Google 로그인 완료 후 Supabase가 이 URL로 리다이렉트한다.
 * code를 세션으로 교환한 뒤, 신규/재방문 여부를 판별해 적절한 페이지로 이동한다.
 *
 * 흐름:
 *   1. URL 쿼리스트링에서 code, next 추출
 *   2. code → 세션 교환 (exchangeCodeForSession)
 *   3. 신규 판별: profiles.display_name IS NULL → 온보딩(/auth/sign-up?step=profile)
 *   4. 재방문: next 파라미터 또는 기본값 /circles 로 이동
 *   5. 에러: /auth/error 로 이동
 */

import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { sanitizeNext } from "@/lib/auth/sanitize-next";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  // OAuth code — Google 인증 완료 후 Supabase가 붙여주는 임시 코드
  const code = searchParams.get("code");

  // next 파라미터 — 로그인 전 가려던 경로 (sanitizeNext로 오픈 리다이렉트 방지)
  const next = sanitizeNext(searchParams.get("next")) ?? "/circles";

  if (code) {
    // 서버 컴포넌트용 Supabase 클라이언트 (쿠키 기반 세션 관리)
    const supabase = await createClient();

    // PKCE code → Supabase 세션으로 교환
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (!exchangeError) {
      // 현재 사용자 정보 취득
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // 이동 대상 경로 (기본: next 파라미터)
      let target = next;

      if (user) {
        // 신규 사용자 판별: DB 트리거가 profiles 행을 만들지만 display_name은 비워둠
        // display_name이 NULL이면 아직 닉네임 미설정 → 온보딩 단계(profile)로 안내
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", user.id)
          .single();

        if (!profile?.display_name) {
          // 신규 사용자(온보딩 미완): 비밀번호 설정 단계로 이동
          // (비번 설정 → 닉네임 → 완료 순서. display_name이 채워지면 온보딩 완료로 간주)
          target = "/auth/sign-up?step=password";
        }
      }

      // 로드밸런서/프록시 환경 대응:
      // Vercel Edge 등에서는 x-forwarded-host가 실제 도메인을 담고 있어
      // origin(내부 IP)보다 우선 사용해야 리다이렉트 도메인이 올바르게 설정됨
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocal = process.env.NODE_ENV === "development";

      const base = isLocal ? origin : forwardedHost ? `https://${forwardedHost}` : origin;

      // target이 "/"로 시작하는지 보장 (sanitizeNext가 이미 보장하지만 방어적 처리)
      const safePath = target.startsWith("/") ? target : `/${target}`;

      return NextResponse.redirect(`${base}${safePath}`);
    }
  }

  // code 없음 또는 세션 교환 실패 → 에러 페이지로 이동
  return NextResponse.redirect(
    `${origin}/auth/error?error=${encodeURIComponent("Googleログインに失敗しました")}`
  );
}
