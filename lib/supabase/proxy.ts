import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasEnvVars } from "../utils";

// 미인증 사용자도 열람 가능한 경로 판정
// /circles 와 /circles/[id] 는 공개, 단 /circles/new 는 등록 폼이므로 인증 필수
// /auth/* 와 /login 은 인증 플로우 자체이므로 항상 통과 (레거시 /login 호환 포함)
// /search 는 검색 페이지 (당근앱 패턴) — 결과 페이지 /circles 가 공개이므로 검색도 공개.
// /notifications 는 ComingSoon placeholder — Phase 2 에서 인증 필수로 전환 예정.
// /mypage 는 인증 필수 — fallthrough false 로도 동작하지만 가독성 위해 명시.
function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  if (pathname.startsWith("/auth")) return true;
  if (pathname.startsWith("/login")) return true;
  if (pathname === "/search") return true;
  if (pathname === "/notifications") return true;
  if (pathname === "/mypage") return false;
  if (pathname === "/circles") return true;
  if (pathname.startsWith("/circles/")) {
    if (pathname === "/circles/new") return false;
    return true;
  }
  return false;
}

export async function updateSession(request: NextRequest) {
  // RSC 가 server-side 에서 현재 pathname 을 읽을 수 있도록 **request headers** 에 forward.
  // (response.headers.set 은 client 로 가는 응답에만 적용되어 RSC 의 next/headers headers() 가 못 읽음.
  //  NextResponse.next({ request: { headers } }) 패턴이 Next.js 공식 권장 — downstream RSC 가
  //  await headers().get("x-pathname") 으로 읽도록.)
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // If the env vars are not set, skip proxy check. You can remove this
  // once you setup the project.
  if (!hasEnvVars) {
    return supabaseResponse;
  }

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          // cookies 갱신 후 response 를 재생성할 때도 forward 한 requestHeaders 를 유지 — x-pathname 보존.
          supabaseResponse = NextResponse.next({
            request: { headers: requestHeaders },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Do not run code between createServerClient and
  // supabase.auth.getClaims(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: If you remove getClaims() and you use server-side rendering
  // with the Supabase client, your users may be randomly logged out.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  if (!user && !isPublicPath(request.nextUrl.pathname)) {
    // 미인증 사용자 — 로그인 페이지로 리디렉션하면서 원래 가려던 경로를 next 파라미터로 보존
    // (PRD F012 「未로그인 → /auth/login?next=/circles/{id}」 패턴과 일관)
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse;
}
