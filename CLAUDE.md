# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 개발 명령어

```bash
npm run dev      # 개발 서버 실행 (http://localhost:3000)
npm run build    # 프로덕션 빌드
npm start        # 프로덕션 서버 실행 (build 이후)
npm run lint     # ESLint 검사 (next/core-web-vitals + next/typescript)
```

테스트 러너는 아직 설정되어 있지 않습니다.

## 환경 변수

`.env.local`에 다음 두 변수가 반드시 필요합니다. 둘 다 없으면 `lib/utils.ts`의 `hasEnvVars`가 `false`가 되어 인증 미들웨어가 무시되고 UI는 환경 변수 경고로 대체됩니다.

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (legacy anon key도 같은 변수명으로 사용 가능)

## 아키텍처 개요

Next.js App Router + Supabase Auth + shadcn/ui로 구성된 SSR-first 스타터 킷입니다. 다른 Next.js 프로젝트와 구조적으로 다른 핵심 포인트는 다음과 같습니다.

### Supabase 클라이언트의 3-context 패턴 (`lib/supabase/`)

같은 라이브러리(`@supabase/ssr`)지만 실행 컨텍스트마다 클라이언트를 따로 만들어야 합니다. 컨텍스트를 잘못 선택하면 쿠키 동기화가 깨져 사용자가 무작위로 로그아웃되거나, 빌드 시 RSC에서 에러가 발생합니다.

- `client.ts` — Client Component / 브라우저 전용. `createBrowserClient` 사용.
- `server.ts` — Server Component / Route Handler / Server Action 전용. `next/headers`의 `cookies()`로부터 쿠키를 읽어 `createServerClient`를 만듦. **호출할 때마다 새로 생성해야 함** (Fluid compute에서 전역 변수에 저장 금지).
- `proxy.ts` — Edge proxy(`proxy.ts` 루트 파일에서 호출) 전용. `NextRequest`/`NextResponse`에 직접 쿠키를 set/getAll.

### 인증 미들웨어가 `middleware.ts`가 아니라 `proxy.ts`

이 프로젝트는 표준 `middleware.ts` 대신 루트의 `proxy.ts`를 사용합니다 (`export async function proxy(...)`). 동작은 사실상 미들웨어와 동일하지만 파일/함수 이름이 다르므로, 인증/리다이렉트 로직을 수정할 때는 이 두 파일을 같이 봐야 합니다.

- `proxy.ts` — Edge에서 실행되는 진입점. `matcher`로 정적 자산 제외.
- `lib/supabase/proxy.ts`의 `updateSession()` — 실제 로직. `supabase.auth.getClaims()`를 호출해 인증 확인 후, `/`, `/login`, `/auth/*`가 아니면 미인증 사용자를 `/auth/login`으로 리다이렉트.

`getClaims()` 호출 결과를 반드시 `return supabaseResponse` 그대로 반환해야 합니다. 새 `NextResponse`를 만들 경우 쿠키를 복사하지 않으면 세션이 끊깁니다 (`lib/supabase/proxy.ts` 상단 주석 참조).

### `cacheComponents` 활성화 + Suspense 강제

`next.config.ts`에 `cacheComponents: true`가 켜져 있습니다. 이 모드에서는 동적 데이터에 접근하는 Server Component(예: `cookies()`를 사용하는 Supabase server client)를 호출하는 부모는 반드시 `<Suspense>`로 감싸야 합니다. `app/page.tsx`, `app/protected/page.tsx`, `app/instruments/page.tsx`가 모두 이 패턴을 따르고 있으니 새 페이지를 만들 때도 동일하게 적용하세요.

### 라우팅 구조

- `app/page.tsx` — 랜딩 페이지. 환경 변수 유무에 따라 `<ConnectSupabaseSteps />`(미설정) / `<SignUpUserSteps />`(설정됨) 전환.
- `app/auth/*` — 로그인, 회원가입, 비밀번호 재설정 등 인증 플로우 페이지들. `proxy.ts`에서 미인증 통과 허용 경로.
- `app/protected/*` — 로그인 필수 영역. 페이지 내부에서도 `supabase.auth.getClaims()`로 한 번 더 검증하고 실패 시 `redirect("/auth/login")`.
- `app/instruments/page.tsx` — Supabase DB에서 `instruments` 테이블을 조회하는 데모. 새 데이터 fetch 패턴 참고용.

### 스타일/컴포넌트

- shadcn/ui: `style: "new-york"`, `baseColor: "neutral"`, RSC 활성화 (`components.json`).
- 신규 UI 컴포넌트는 `components/ui/`에 추가, 비즈니스 컴포넌트는 `components/`에 추가.
- `lib/utils.ts`의 `cn()`은 `clsx + tailwind-merge` 조합. 클래스 병합은 항상 이걸 사용.
- 다크 모드는 `next-themes`의 `ThemeProvider`(`app/layout.tsx`)와 `<ThemeSwitcher />`로 처리. `class` 전략 + `suppressHydrationWarning`.
- Path alias: `@/*` → 프로젝트 루트.

## 응답 및 코딩 가이드

- 사용자와의 대화는 한국어로 응답합니다.
- 변수명/함수명은 영어로, 코드 주석/커밋 메시지/문서는 한국어로 작성합니다.
- 사용자는 코딩 입문자이므로, 코드 변경 시 무엇을 왜 바꿨는지 부속 설명을 곁들여 설명합니다.

## MCP 서버

`.mcp.json`에 다음 MCP 서버들이 설정되어 있습니다.

- **supabase** — 이 프로젝트(`project_ref=wmiaxjgitpahribjrdyh`)에 직접 연결됨. 스키마 변경 전 `list_tables`, 디버깅 시 `get_logs`/`get_advisors` 먼저 호출하세요.
- **context7** — 라이브러리/프레임워크 공식 문서 조회. Next.js, Supabase, shadcn 등 API 사용법 확인 시 web search보다 우선 사용.
- **shadcn** — 컴포넌트 추가/검색.
- **playwright** — 브라우저 자동화로 UI 변경 후 동작 검증.
- **sequential-thinking** — 복잡한 다단계 문제 분해.
- **shrimp-task-manager** — `shrimp_data/` 디렉터리에 작업 상태 저장.
