# T-001: `(tabs)` route group + 하단 4탭 레이아웃

| 항목 | 내용 |
|---|---|
| **Phase** | 1-1 기반 인프라 |
| **우선순위** | High (Phase 1 전체의 길목) |
| **예상 소요** | 2일 |
| **의존성** | — (Phase 0 코드베이스 위에 추가) |
| **관련 기능 ID** | F001 (하단 4탭 내비게이션) |
| **PRD 참조** | PRD 5-1 F001 · PRD 6-2 route group 분할 |

## 산출물

- `app/(tabs)/layout.tsx` 생성 — 하단 4탭 컴포넌트 마운트
- `components/bottom-tabs.tsx` (또는 기존 컴포넌트 이전·재구성)
- 기존 `app/page.tsx`·`app/search/`·`app/mypage/` → `app/(tabs)/` 안으로 이동
- `app/(tabs)/calendar/page.tsx` 빈 껍데기 (T-019 에서 채움)

## 검증 기준

- dev 서버 (`npm run dev`) 진입 시 ホーム·さがす·カレンダー·マイページ 4탭이 하단에 표시됨
- 탭 클릭 시 라우트 전환 + active 탭 하이라이트
- 인증 여부 무관 항상 표시 (미로그인 사용자도 4탭 보임)
- 이벤트 풀스크린 (`/events/[id]`)·동아리 상세 (`/circles/[id]`) 같은 「(tabs) 바깥」 라우트에서는 4탭 안 보임

## 세부 작업

- [ ] `app/(tabs)/layout.tsx` 생성 — children + 하단 탭 마운트
- [ ] `components/bottom-tabs.tsx` 작성 — 4개 `<Link>` + 아이콘 (lucide-react)
- [ ] 활성 탭 판별 — `usePathname()` 기반 (client component)
- [ ] 기존 라우트 이전 — `app/page.tsx` → `app/(tabs)/page.tsx`, `app/search/` → `app/(tabs)/search/`, `app/mypage/` → `app/(tabs)/mypage/`
- [ ] 빈 껍데기 — `app/(tabs)/calendar/page.tsx` (T-019 마운트 대기)
- [ ] 이전 후 import 경로 정리 — 상대경로 깨진 곳 `@/*` 절대경로로 리팩터링
- [ ] dev 서버에서 4탭 표시·라우트 전환 확인

## 위험·주의사항

- ⚠️ **route group 이전 시 import 깨짐** — 기존 `app/search/page.tsx` 등을 `app/(tabs)/search/page.tsx` 로 옮기면 상대경로 import 가 깨질 수 있음. 가능한 한 모두 `@/*` 절대경로로 리팩터링한 뒤 이동.
- ⚠️ **`/events/[id]` 풀스크린 분리** [[circle-detail-template-fixed-trap]] — 이벤트 상세는 `(tabs)` 바깥 루트에 두어야 하단 탭이 안 보이는 풀스크린 UX 가 됩니다. (T-014 와 연결)
- ⚠️ **active 탭 hydration mismatch** — `usePathname()` 은 client component 에서만 사용. layout 자체를 client 로 만들지 말고 `<BottomTabs />` 자식만 `"use client"` 로.

## 코드 스니펫 (참고)

```tsx
// app/(tabs)/layout.tsx (서버 컴포넌트)
import { BottomTabs } from "@/components/bottom-tabs";

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <main className="flex-1 pb-[calc(env(safe-area-inset-bottom)+64px)]">
        {children}
      </main>
      <BottomTabs />
    </div>
  );
}
```

```tsx
// components/bottom-tabs.tsx (클라이언트 컴포넌트)
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Calendar, User } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/", icon: Home, label: "ホーム" },
  { href: "/search", icon: Search, label: "さがす" },
  { href: "/calendar", icon: Calendar, label: "カレンダー" },
  { href: "/mypage", icon: User, label: "マイページ" },
];

export function BottomTabs() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background pb-[env(safe-area-inset-bottom)]">
      <ul className="flex justify-around">
        {TABS.map((t) => {
          const active = pathname === t.href || pathname.startsWith(t.href + "/");
          const Icon = t.icon;
          return (
            <li key={t.href} className="flex-1">
              <Link
                href={t.href}
                className={cn(
                  "flex flex-col items-center gap-1 py-2 text-xs",
                  active ? "text-foreground" : "text-muted-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
```

## 테스트 체크리스트 (Playwright MCP, 작업 완료 후)

> Playwright MCP는 「요청 시에만」 사용 [[playwright-only-when-asked]]. 본 Task 완료 후 사용자가 요청하면 다음 시나리오 실행.

- [ ] `/` 진입 → 4탭 표시 확인 (스크린샷)
- [ ] 각 탭 클릭 → URL 변경 + active 상태 변경
- [ ] `/events/test-id` 진입 시 4탭 안 보이는지 확인 (Phase 1-3 이후)
