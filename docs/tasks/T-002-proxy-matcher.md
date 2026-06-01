# T-002: `proxy.ts` matcher 확장

| 항목 | 내용 |
|---|---|
| **Phase** | 1-1 기반 인프라 |
| **우선순위** | High |
| **예상 소요** | 0.5일 |
| **의존성** | — |
| **관련 기능 ID** | F070 (기본 인증) |
| **PRD 참조** | PRD 5-7 F070 · PRD 9-6 라우팅 변경 |

## 산출물

- `proxy.ts` matcher 정규식에 `/events/*`·`/circles/[id]/dm/*`·`/admin/*` 추가
- 신규 경로에서도 인증 미들웨어가 정상 통과·차단 동작

## 검증 기준

- 미로그인 상태에서 `/circles/test-id/dm` 진입 시 `/auth/login?redirect_to=...` 로 리다이렉트
- 미로그인 상태에서 `/events/test-id` 진입 시 (공개 이벤트이므로) 정상 표시 — `proxy.ts` 의 「`/`, `/login`, `/auth/*` 외 미인증 차단」 로직과 정합되려면 `/events/*` 는 「인증 통과 불필요」 예외 추가 필요
- `proxy.ts` 의 matcher 정규식이 정적 자산은 여전히 제외 (현행 유지)

## 세부 작업

- [ ] `proxy.ts` matcher 정규식 갱신 — `/events/:path*`, `/circles/:path*`, `/admin/:path*` 추가
- [ ] `lib/supabase/proxy.ts` `updateSession()` 의 「미인증 사용자 차단 예외 경로」 목록에 `/events/[id]` 같은 공개 라우트 패턴 추가 (단, `/circles/[id]/dm` 등은 인증 필수 유지)
- [ ] 미로그인 시 `redirect_to` 쿼리 파라미터 보존 — `F071` 안티패턴 A-1 회피
- [ ] dev 에서 미로그인·로그인 두 상태로 신규 라우트 진입 테스트

## 위험·주의사항

- ⚠️ **`return supabaseResponse` 그대로 반환 원칙** — `lib/supabase/proxy.ts` 상단 주석 참조. 새 `NextResponse` 만들 경우 쿠키 복사 누락으로 세션 끊김 발생.
- ⚠️ **공개 이벤트 `/events/[id]` 허용 범위** — PRD 5-1 F002 「`visibility=public` 이벤트는 미인증 열람 허용」. matcher 자체는 통과시키되 페이지 내부에서 `visibility` 검증.
- ⚠️ **`/admin/*` 보호** — admin 경로는 인증뿐 아니라 `is_admin()` 검증까지 필요. matcher 통과 후 페이지에서 한 번 더 검증 (T-031·T-037 에서 다룸).

## 코드 스니펫 (참고)

```typescript
// proxy.ts (현재)
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

```typescript
// lib/supabase/proxy.ts updateSession() 일부 (예시)
const PUBLIC_PATHS = [
  "/",
  "/auth",
  "/login",
  "/events",       // /events/[id] 공개 열람
  "/circles",      // /circles/[id] 공개 열람 (단 /dm·/events/new 는 인증 필요)
];

// 미인증 사용자에게 「/dm」「/events/new」「/admin」 같은 경로는 차단
const REQUIRES_AUTH_SUBPATHS = ["/dm", "/events/new", "/events/edit", "/manage", "/admin"];
```

## 테스트 체크리스트 (수동)

- [ ] 미로그인 + `/events/공개이벤트ID` → 정상 표시
- [ ] 미로그인 + `/circles/[id]/dm` → `/auth/login?redirect_to=/circles/[id]/dm` 리다이렉트
- [ ] 미로그인 + `/admin/owner-approvals` → `/auth/login?redirect_to=/admin/...` 리다이렉트
- [ ] 로그인 후 `redirect_to` 보존되어 원래 페이지로 복귀
