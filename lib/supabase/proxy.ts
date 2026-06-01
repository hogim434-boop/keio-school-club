import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasEnvVars } from "../utils";

// 미인증 사용자도 열람 가능한 경로 판정
// /circles 와 /circles/[id] 는 공개, 단 /circles/new 는 등록 폼이므로 인증 필수
// /circles/[id]/dm/* 는 DM 기능이므로 인증 필수 (T-002 신규)
// /auth/* 와 /login 은 인증 플로우 자체이므로 항상 통과 (레거시 /login 호환 포함)
// /search 는 검색 페이지 (당근앱 패턴) — 결과 페이지 /circles 가 공개이므로 검색도 공개.
// /notifications 는 ComingSoon placeholder — Phase 2 에서 인증 필수로 전환 예정.
// /mypage 는 인증 필수 — fallthrough false 로도 동작하지만 가독성 위해 명시.
// /admin/* 는 인증 필수 (1차 가드). role='admin' 검증은 app/admin/layout.tsx 의 AdminGuard 가 담당 (2차 가드).
// /calendar 는 비로그인 열람 허용 — F037 캘린더 게스트 열람 (T-002 신규)
// /events/* 는 비로그인 열람 허용 — F002 이벤트 풀스크린 공개. 단 visibility 검증은 페이지 내부에서 수행 (T-002 신규)
function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  if (pathname.startsWith("/auth")) return true;
  if (pathname.startsWith("/login")) return true;
  if (pathname === "/search") return true;
  if (pathname === "/notifications") return true;
  // /shuffle 은 상시 비로그인 허용 — 게스트 디스커버리 진입점 (회원가입 전 체험 동선, 정책 결정)
  if (pathname === "/shuffle") return true;
  // /favorites 는 localStorage 기반 게스트 즐겨찾기 (방향 A) — 비로그인 허용.
  if (pathname === "/favorites") return true;
  // T-002 신규 — F037 캘린더 비로그인 열람 허용
  if (pathname === "/calendar") return true;
  // T-002 신규 — F002 이벤트 상세 풀스크린 비로그인 열람 허용 (페이지 내부에서 visibility 검증)
  if (pathname.startsWith("/events/")) return true;
  if (pathname === "/mypage") return false;
  if (pathname.startsWith("/admin")) return false;
  if (pathname === "/circles") return true;
  if (pathname.startsWith("/circles/")) {
    if (pathname === "/circles/new") return false;
    // T-002 신규 — /circles/[id]/dm/* 는 DM 기능으로 인증 필수
    if (pathname.match(/^\/circles\/[^/]+\/dm/)) return false;
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

  // 온보딩 미완료 사용자 강제 복귀.
  // Google 로그인은 성공 즉시 세션을 만들지만, DB 트리거가 만든 profiles.display_name 은 비어 있다.
  // 닉네임(display_name)을 채우기 전까지는 어느 페이지로 가든 온보딩(/auth/sign-up)으로 되돌린다.
  // → "로그인은 됐지만 닉네임 없는 반쪽 계정"이 서비스를 이용하는 상황을 차단.
  // /auth/* 자체는 제외해야 무한 리다이렉트가 생기지 않는다(온보딩·로그아웃 경로 보존).
  if (user && !request.nextUrl.pathname.startsWith("/auth")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.sub)
      .maybeSingle();

    // 프로필 행이 있고 display_name 이 비어 있으면 온보딩 미완료 → 비밀번호 설정 단계부터 재개
    if (profile && !profile.display_name) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/sign-up";
      url.search = ""; // 기존 쿼리(next 등) 제거 후 step 만 부여
      url.searchParams.set("step", "password");
      return NextResponse.redirect(url);
    }
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
