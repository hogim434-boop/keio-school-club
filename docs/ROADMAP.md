# KCircle 개발 로드맵

慶應義塾大学 学生団体・サークル(公認・非公認・インカレ 통합) 검색 웹앱 — 2026년 4월 新歓 시즌 출시 목표.

## 개요

KCircle은 慶應義塾大学 신입생(특히 4월 新歓 시즌 입학자)을 위한 학생 단체(団体・サークル) 탐색·비교 웹앱으로 다음 기능을 제공합니다. **公認・非公認・インカレ 를 차별 없이 통합 검색**할 수 있으며, 공인 여부는 메타 정보(`official_type`) 로만 표시합니다.

- **단체 탐색 (F001 / F002 / F004)**: 8종 카테고리 탭과 활동빈도·연회비·태그 다중 필터로 학생 단체를 스크리닝.
- **단체 상세 + 참여 의사 (F003 / F012)**: 갤러리·태그·요약 카드 + 당근 모임 패턴의 하단 고정 액션 바와 「参加する」 채널 모달.
- **즐겨찾기 + 비교 (F007 / F008)**: 하트 토글로 저장한 단체를 최대 3개까지 횡열 비교.
- **콘텐츠 공급 파이프라인 (F005 / F006)**: 대표자가 단체를 등록하면 관리자가 **실재 여부·학칙 준수 여부** 를 확인 후 승인·거절. official_type 자칭 정확성도 함께 검수.
- **실재 신뢰도 (F010 / F011)**: @keio.jp 이메일 인증으로 `keio_verified` 자동 부여 + 관리자 수동 검증의 이중 게이트.
- **활동 리포트 (F-NEW, T-034)**: 단체별 활동 사진·후기 게시판. 신입생이 단체 분위기를 카드 시각으로 판단 — 「掲示板」 탭 + 미리보기 캐러셀 + 리포트 상세 페이지(`/circles/[id]/reports/[reportId]`).

> **⚠️ 慶應과의 관계 면책**: 본 서비스는 학생 운영의 단체 검색 도구이며, 慶應義塾大学 公式 인증·後援 과는 무관합니다. 「公認」 표기는 등록자 자기 신고 + 관리자 1차 검수 결과로, 慶應 측의 보증을 의미하지 않습니다. 자세한 면책 사항은 PRD 「면책 사항」 절 참조. 푸터·등록 폼·이용 약관 3곳에 면책 문구 노출 의무.

> **🏷️ `official_type` UI 표시 정책 (2026-05-16 결정, commit `3b2b100`)**
> 도메인 모델은 5종 (`athletics` / `official` / `unofficial` / `intercollegiate` / `other`) 을 보존하지만, **UI 뱃지·필터 옵션은 `体育会` / `インカレ` 2종만 노출**한다 (`getOfficialTypeDisplayLabel` / `VISIBLE_OFFICIAL_TYPES`). 「公認 / 非公認 / その他」 라벨은 카드·상세·필터 칩에서 모두 숨김. 단 검색 URL `?officialType=official` 직접 입력은 power user / admin 용으로 5종 모두 허용 (DB·검수 메타 정보로 보존).

> **💴 `年会費` (annual_fee_yen) / `新入生比率` (freshmen_ratio) UI 제거 정책 (2026-05-17 결정, commit `0e6298b`)**
> 두 필드는 **UI 표시·필터·정렬 전부에서 제거**되었다. 이유: (a) 신입생이 가입 시점에 정확한 액수를 입력 받기 어렵고, (b) 「新入生比率」 는 단체별 자기보고 의존도가 높아 신뢰도가 낮으며, (c) 「無料/有料」 정도의 거친 분류는 추후 태그(`tag-kind=cost`)로 표현하는 편이 더 정확. 영향 범위: 카드(`circle-card.tsx`)·필터 패널(`filter-panel.tsx`)·셔플 카드(`swipe-card.tsx`)·요약 카드(상세) 모두 미노출. **DB 컬럼(`circles.annual_fee_yen`)은 보존** — 추후 정책 환원·관리자 검수 메모 등 활용 여지 유지. `CircleDetail` (`lib/types/domain.ts`) 에서 필드 제거됨.

> **🌞 다크모드 완전 제거 정책 (2026-05-16 결정, commit `6c482cb` + `52717aa`)**
> 모든 페이지는 **라이트 톤 전용**으로 운영한다. 이유: (a) 신입생 대상 콘셉트가 「밝고 친근」 — 다크모드는 후순위, (b) 일본 대학생 모바일 UX 관행 (LINE/Instagram 류 라이트 기본) 부합, (c) 디자인 리소스 절감 (다크 토큰 검수·이미지 다크 버전 불필요). 제거 항목: `next-themes` 패키지, `ThemeProvider`, `<ThemeSwitcher />`, `@theme dark` 토큰, `dark:` Tailwind variant 사용 금지. `<html>` 에 `class="dark"` 부여 금지. `sonner` 토스터는 `theme="light"` 명시.

> **🗺️ Discover / Search / Shuffle IA 분리 정책 (2026-05-16, 당근앱 패턴)**
> 라우팅 IA 가 (a) **Discover 모드** (`/circles` 진입 시 필터 미적용 → `HomeCategoryGrid` + `PromoTileCarousel` + `HorizontalCircleStrip` 인기/신착 + `HourlyCategoryStrip` 1시간 회전), (b) **Results 모드** (`/circles?q&filter` 한 개라도 활성 → 사이드바 + 카드 그리드 + 페이지네이션), (c) **`/search` 페이지** (헤더 🔍 진입, 검색어 + 카테고리 + quick filter 4종 + `もっと絞り込む` bottom sheet → 「N件のサークルを見る」 → `/circles?q&filter` navigate), (d) **`/shuffle` 페이지** (Tinder 스타일 swipe deck, **상시 비로그인 허용** = 게스트 디스커버리 진입점). 글로벌 헤더는 **`/circles/[id]`, `/circles/[id]/reports/[reportId]`, `/search`, `/shuffle`** 에서 hidden (메루카리 패턴). BottomNav 는 `/circles/[id]`, `/shuffle` 에서 hidden. 자세한 hide 규칙은 `components/layout/header.tsx` / `bottom-nav.tsx` / `header-client-gate.tsx` 참조.

> **🟦 모바일 퍼스트 (전 ROADMAP 의 최우선 설계 원칙)**
> 본 서비스는 일본 대학생이 스마트폰으로 활용하는 것을 전제로 한다. 모든 UI 작업의 기본 viewport 는 **360–428px**(iPhone SE ~ iPhone Pro Max / Android 표준)이며, 데스크탑(`md:` 이상, 768px+) 은 보조 환경으로서 progressive enhancement 로만 다룬다. 모든 카드·폼·CTA 는 우선 모바일 1열 레이아웃·44px 이상 터치 타깃·safe-area inset 을 보장한 뒤, 가용 너비가 늘어남에 따라 다열 그리드·사이드바·인라인 CTA 로 확장한다.

---

## 개발 워크플로우

1. **작업 계획**
   - 본 ROADMAP과 PRD를 함께 읽고 다음 우선순위 작업을 식별.
   - 신규 작업이 발생하면 적절한 Phase에 삽입하고 의존성·공수 컬럼을 갱신.

2. **작업 생성**
   - 단순한 작업은 본 ROADMAP 의 완료 노트로 산출물 요약 (인라인 SSOT, 현재 패턴 — 1인 운영 효율 우선).
   - 복잡한 작업 (DB 마이그레이션·다단계 RPC·관리자 워크플로우·통합 E2E 등) 만 `/tasks/XXX-description.md` 작업 파일 backfill — 작업 파일에는 다음 섹션을 포함:
     - **개요 / 관련 PRD 기능**
     - **선행 작업 (의존성)**
     - **변경 대상 파일·디렉토리**
     - **수락 기준 (Acceptance Criteria)**
     - **구현 단계 (체크리스트)**
     - **테스트 체크리스트** — API/비즈니스 로직 작업은 Playwright MCP 시나리오 필수 포함
   - 작업 파일을 만든 경우, 초기 상태는 모든 체크박스가 비어 있어야 하며 완료 후 변경 사항 요약을 마지막에 추가.

3. **작업 구현**
   - 작업 파일의 명세서를 따라 구현.
   - Supabase 스키마 변경 전 `supabase` MCP `list_tables` 호출, 디버깅 시 `get_logs` / `get_advisors` 우선 사용.
   - 라이브러리 사용법 확인은 `context7` MCP 우선 사용.
   - API 연동·비즈니스 로직 구현 후 Playwright MCP로 E2E 검증.
   - 각 단계 완료 시 작업 파일의 체크박스 갱신, 중요한 단계 끝나면 중단 후 추가 지시 대기.

4. **로드맵 업데이트**
   - 작업 완료 시 본 로드맵의 작업 항목에 ✅ 마크 + 산출물 요약 (인라인 완료 노트). 작업 파일을 별도 생성한 경우에만 `See: /tasks/XXX-xxx.md` 링크를 추가한다.
   - Phase 전체가 완료되면 Phase 제목에도 ✅ 마크 추가.

---

## 상태 표기 규칙

- **Phase 상태**: 제목 끝 ✅ 가 있으면 완료, 없으면 진행 중 또는 대기.
- **Task 상태**: `pending` / `in_progress` / `completed` / `blocked` 4종.
  - `completed` 작업은 줄 끝에 ✅ 마크와 `See:` 링크 추가.
  - `blocked` 작업은 사유와 선행 작업 ID 명시.
- **세부 구현 사항**: `- ` 로 시작하는 미완 항목, `- [x]` 로 시작하는 완료 항목.

---

## Phase 1 — MVP 골격 + 핵심 탐색 + 콘텐츠 파이프라인 (4–6주)

> 목표: 신입생이 서클을 「찾고 → 보고 → 참여 의사 표시」 까지, 대표자가 「등록 → 승인 대기」 까지 완주할 수 있는 최소 기능을 운영 가능한 품질로 출시.
>
> **디자인 원칙**: 모든 페이지는 **360px 너비에서 동작해야 하며**(모바일 퍼스트), `md`(768px) 이상은 progressive enhancement(다열 그리드·사이드바·인라인 CTA) 로만 처리한다. 각 작업의 「**모바일**:」 항목이 기본 동작, 그 외 분기는 보조.

### Phase 1.0 — 기반 정비 (T-001 ~ T-004) ✅

| ID        | 작업                                     | 상태      | 공수 | 선행  | 관련 기능             |
| --------- | ---------------------------------------- | --------- | ---- | ----- | --------------------- |
| **T-001** | 디자인 토큰·shadcn 추가 컴포넌트 도입 ✅ | completed | 0.5d | —     | 전 페이지             |
| **T-002** | 공통 레이아웃·헤더·내비게이션 골격 ✅    | completed | 1d   | T-001 | 메뉴 구조             |
| **T-003** | TypeScript 도메인 타입 정의 ✅           | completed | 0.5d | —     | F001~F012             |
| **T-004** | Vitest + Playwright 테스트 러너 도입 ✅  | completed | 1d   | T-002 | 모든 작업의 검증 기반 |

- **T-001: 디자인 토큰·shadcn 추가 컴포넌트 도입** ✅ — 우선순위
  - 慶應 濃紺(`#003366`) 액센트 컬러 토큰을 `tailwind.config.ts` + `app/globals.css` 에 추가.
  - 누락된 shadcn 컴포넌트 추가: `Form`, `Dialog`, `Sheet`, `Tabs`, `Table`, `Select`, `Textarea`, `Avatar`, `Skeleton`, `Toast`(sonner), `Alert`, `RadioGroup`.
  - `mcp__shadcn__get_add_command_for_items` 로 일괄 추가 명령 생성 후 적용.
  - 「サークル」「公認」 같은 일본어 라벨 처리를 위한 폰트 가중치 검증 (현재 Geist Sans 기본).
  - **완료 (2026-05-14)**: Tailwind v4 마이그레이션 동시 진행으로 (a) `app/globals.css` 의 `@theme inline` 에 `--color-keio-navy` + `--color-keio-navy-foreground` 토큰 추가(OKLCH, 라이트·다크 모드 보정값 포함), (b) shadcn 누락 12종(form/dialog/sheet/tabs/table/select/textarea/avatar/skeleton/sonner/alert/radio-group) 추가 + `react-hook-form` / `@hookform/resolvers` / `sonner` 의존성 자동 도입, (c) `app/layout.tsx` 에 `Noto_Sans_JP`(weight 400/500/700) 보조 폰트 + `<Toaster>` Provider 배치 + `lang="ja"`, (d) `globals.css` 에 `--font-sans` 폴백 체인(Geist → Noto JP → Hiragino → Yu Gothic → Meiryo). Tailwind 자체는 v3.4.1 → **v4.3.0** 으로 업그레이드되어 `tailwind.config.ts` 삭제 + `postcss.config.mjs` 단순화 + `tailwindcss-animate` → `tw-animate-css` 교체. `npm run build` + `npm run lint` 모두 통과.

- **T-002: 공통 레이아웃·헤더·내비게이션 골격** ✅
  - `app/layout.tsx` 의 헤더를 PRD「메뉴 구조」기준으로 재구성: 로고 / サークルを探す / お気に入り / マイページ / 로그인 영역.
  - 모바일 하단 탭 바 또는 햄버거 메뉴 골격 (당근 모임 패턴 모바일 퍼스트).
  - 관리자 메뉴(`/admin/*`)는 클라이언트에서 role 확인 후 조건부 노출, 실제 보호는 서버 측에서 (T-019).
  - 빈 셸 페이지 추가: `/circles`, `/circles/[id]`, `/favorites`, `/compare`, `/mypage`, `/mypage/circles`, `/circles/new`, `/admin/circles`. 각각 「coming soon」 플레이스홀더 + Suspense 경계 설정 (cacheComponents 대응).
  - **완료 (2026-05-14)**: (a) `components/layout/` 신설 + `header.tsx`(RSC, sticky + backdrop-blur) + `main-nav.tsx`(데스크탑, usePathname active) + `mobile-nav.tsx`(햄버거 + Sheet) + `user-menu.tsx`(Avatar + DropdownMenu) + `coming-soon.tsx` 5종 추가. (b) `components/auth-button.tsx` 일본어화(ログイン/新規登録) + Client UserMenu 분리 호출. (c) `components/logout-button.tsx` 라벨 ログアウト + variant ghost. (d) 빈 셸 페이지 8개(`/circles`, `/circles/[id]`, `/circles/new`, `/favorites`, `/compare`, `/mypage`, `/mypage/circles`, `/admin/circles`). (e) `app/layout.tsx` 가 `<Suspense fallback>` 으로 `<Header />` 래핑(cacheComponents 대응). (f) `app/page.tsx` 자체 nav 제거. (g) `lib/supabase/proxy.ts` `isPublicPath()` 함수 추출 + 미인증 리디렉션 시 `?next={pathname}` 파라미터 부여(PRD F012 패턴과 일관). `/circles`·`/circles/[id]` 미인증 통과, `/circles/new`·`/favorites`·`/mypage`·`/admin/*` 인증 강제. `npm run build` (23 페이지) + `npm run lint` 통과.
  - **추가 완료 (2026-05-14, BottomNav 도입)**: 모바일 햄버거 → **하단 탭 바(당근앱 패턴)** 로 전환. `components/layout/bottom-nav.tsx` 신설 — 5탭(ホーム/探す/[⊕ 登録]/お気に入り/マイページ), 중앙 등록 CTA 는 `bg-keio-navy` 원형 + `-translate-y-2` 로 시각적 강조, safe-area-inset-bottom 패딩, `md:hidden`. `usePathname()` 기반 active 강조 + `/circles/{uuid}` 서클 상세 페이지에서는 T-013 액션 바가 자리를 차지하므로 자동 `null` 반환. `app/layout.tsx` 가 children 컨테이너에 `pb-16 md:pb-0` 추가 + `<Suspense fallback={null}>` 로 BottomNav 래핑(cacheComponents 대응). `header.tsx` 에서 `MobileNav` import·렌더 제거 (햄버거 자리 사라짐). `mobile-nav.tsx` 는 dead code 정리로 삭제 완료. E2E `home.spec.ts` 에 「BottomNav viewport 가시성」 + 「서클 상세에서 hidden」 test 2건 추가, 총 8 tests PASS (mobile+desktop).

- **T-003: TypeScript 도메인 타입 정의** ✅
  - `lib/types/database.ts` 에 PRD 「데이터 모델」 7개 테이블 + RPC 함수의 인터페이스 정의 (수동, T-006 이후 Supabase 자동 생성 타입으로 교체).
  - `lib/types/domain.ts` 에 `CircleSummary`(카드용) / `CircleDetail`(상세용) / `OfficialType` / `Category`(8종 리터럴) / `TagKind` 정의.
  - `lib/constants/category.ts`, `lib/constants/activity-frequency.ts` 에 일본어 라벨 매핑.
  - **완료 (2026-05-14)**: (a) `lib/constants/` 5개 파일 — `category`(8종), `activity-frequency`(3종), `official-type`(**5종 정책 변경 반영**: athletics/official/unofficial/intercollegiate/other → 体育会/公認/非公認/インカレ/その他, **+ 2026-05-16 commit `3b2b100` 에서 `VISIBLE_OFFICIAL_TYPES` 상수 + `getOfficialTypeDisplayLabel()` helper 추가 — UI 는 `体育会`/`インカレ` 2종만 라벨 노출, 그 외 (公認/非公認/その他) 는 배지 자체 비표시**), `circle-status`(3종), `tag-kind`(4종) 모두 `as const` + `Record<KEY, string>` + `ORDER` 패턴. (b) `lib/types/database.ts` — Supabase 공식 패턴(Database = { public: { Tables, Functions } }) 으로 9 Tables(profiles, circles, tags, circle_tags, circle_images, favorites, shinkan_events, inquiry_events, app_settings) Row/Insert/Update + 2 Functions(increment_inquiry_count, increment_view_count) Args/Returns. PRD 데이터 모델 컬럼 + 검증 보강 7개 컬럼(rejection_reason, updated_at, pledge_accepted_at, reviewed_by, reviewed_at, slug, submission_note) 모두 포함. `Tables<T>` / `TablesInsert<T>` / `TablesUpdate<T>` 헬퍼 export. (c) `lib/types/domain.ts` — `CircleSummary`(카드용, verified 필드 제거하고 official_type 라벨로 대체), `CircleDetail`(상세용 extends Summary), `CircleImage`, `ShinkanEvent`, `Tag`, `Favorite`. (d) `npm run build` (23 페이지 PPR) + `npm run lint` 통과.

- **T-004: Vitest + Playwright 테스트 러너 도입** ✅
  - `vitest`, `@vitest/ui`, `@testing-library/react`, `@testing-library/jest-dom` devDependency 추가.
  - `@playwright/test` 추가 + `playwright.config.ts` 생성 (baseURL `http://localhost:3000`, `webServer` 자동 기동).
  - `npm run test`, `npm run test:e2e` 스크립트 추가.
  - 스모크 e2e: 홈 페이지 200 응답 확인.
  - **근거**: PRD에 없으나 검증 이슈에서 「테스트 러너 부재」를 다수의 핵심 작업(F012 RPC, RLS, 인증 플로우)이 의존하므로 Phase 1 초반에 도입.
  - **완료 (2026-05-14)**: (a) Vitest 4.1.6 + jsdom + vite-tsconfig-paths + @testing-library/react + jest-dom 도입. `vitest.config.ts` + `vitest.setup.ts` + `tests/unit/constants.test.ts` — T-003 의 5개 상수 모듈(category 8/official-type 5(학생 단체 통합)/activity-frequency 3/circle-status 3/tag-kind 4) 매핑 정합성 10건 검증. (b) Playwright 1.60 + Chromium 도입. `playwright.config.ts` 의 projects 에 **Mobile Chrome (Pixel 5, 393px) + Desktop Chrome (1280px) 2종** 으로 ROADMAP 「🟦 모바일 퍼스트」 회귀 가드. webServer 자동 기동(npm run dev) + reuseExistingServer. `tests/e2e/smoke.spec.ts` — 홈 페이지 200 + 헤더 「KCircle」 로고 getByRole 검증. (c) `package.json` 에 `test/test:watch/test:ui/test:e2e/test:e2e:ui` 5개 스크립트, `.gitignore` 에 playwright-report/test-results/playwright/.cache 3개. (d) `npm run test` (1 file / 10 tests PASS, 443ms) + `npm run test:e2e` (mobile+desktop 양쪽 2 tests PASS, 4.5s) + lint/build 통과.

### Phase 1.1 — 핵심 UI (더미 데이터 기반) (T-010 ~ T-014) ✅

> **순서 전환**: 입문자 동기부여와 당근 모임 UX 벤치마킹의 빠른 검증을 위해 **화면을 먼저** 만든다.
> 데이터는 `lib/dummy/circles.ts` 의 정적 배열을 사용하고, 인터랙션(하트 토글·「参加する」 RPC 호출)은 로컬 `useState` 또는 단순 외부 링크 오픈으로 모킹한다.
> 실제 Supabase fetch / Server Action / RPC 와이어업은 Phase 1.2 의 **T-009** 에서 일괄 교체한다.
> 더미 → 실제 데이터로의 전환 비용을 줄이기 위해 모든 컴포넌트는 **T-003 의 도메인 타입** (`CircleSummary` / `CircleDetail`) 을 인터페이스로 받도록 설계.

| ID        | 작업                                     | 상태      | 공수 | 선행         | 관련 기능        |
| --------- | ---------------------------------------- | --------- | ---- | ------------ | ---------------- |
| **T-010** | 서클 카드 컴포넌트 + 상위 페이지 ✅      | completed | 1d   | T-001, T-003 | F002             |
| **T-011** | 서클 목록 페이지 + 카테고리 탭 + 필터 ✅ | completed | 2d   | T-010        | F001, F002, F004 |
| **T-012** | 서클 상세 페이지 + 갤러리 ✅             | completed | 2d   | T-010        | F003, F004       |
| **T-013** | 하단 고정 액션 바 + 즐겨찾기 토글 UI ✅  | completed | 1d   | T-012        | F007             |
| **T-014** | 「参加する」 채널 모달 UI ✅             | completed | 1d   | T-013        | F012             |

- **T-010: 서클 카드 컴포넌트 + 상위 페이지** ✅ — 우선순위
  - `lib/dummy/circles.ts` 작성: PRD 「더미 데이터 정책」 카테고리 분포에 맞춰 30건의 정적 배열 (`CircleSummary` 타입 준수 — T-003).
  - `components/circles/circle-card.tsx`: 커버 16:9 + 이름 + 카테고리 뱃지 + 태그 칩 5개 + 활동빈도 + `verified` 뱃지 + 하트 토글 슬롯. props 는 `CircleSummary` 만 받음.
  - `app/page.tsx`: 검색바 + 카테고리 탭 8개 가로 스크롤 + 인기 서클 6개(더미 배열에서 임의 6개) + 「サークルを探す」 CTA. Suspense 경계는 미리 적용 (cacheComponents 환경 대비).
  - **모바일 (기본)**: 카드 그리드 1열 (`grid-cols-1 sm:grid-cols-2 md:grid-cols-3`). 검색바·카테고리 탭은 viewport 상단 sticky, 카테고리 탭은 가로 스크롤(`overflow-x-auto`) + 스냅. 카드 커버 16:9 는 풀폭.
  - **테스트**: 카드 30개 렌더 + 반응형 그리드 + 다크 모드 시각 회귀 (360px / 768px / 1280px 3종).
  - **완료 (2026-05-14)**: (a) `lib/dummy/circles.ts` — DUMMY_CIRCLES 30건 `CircleDetail[]` (T-012/T-018 재사용) + DUMMY_CIRCLES_DISTRIBUTION 객체 + async helper 3종(getPopularCircles/getCircleById/getCirclesByCategory). 학생 단체 통합 정책 분포: athletics 3 / official 12 / unofficial 9 / intercollegiate 4 / other 2. picsum.photos seed 기반 결정론적 이미지. (b) `components/circles/circle-card.tsx` (RSC) — props=CircleSummary, Link 전체 감쌈, next/image 16:9 fill + sizes, 카테고리/official_type 뱃지 + 태그 5개 + 활동빈도, 하트 placeholder(T-013 button 교체 예정). (c) `next.config.ts` `images.remotePatterns` 에 picsum.photos 허용. (d) `app/page.tsx` 전체 교체 — sticky top-14 검색바 + 카테고리 탭 8종 가로 스크롤(snap-x) + 인기 6개 카드 그리드(Suspense + Skeleton fallback) + bg-keio-navy CTA. (e) 단위 테스트 +13건(분포 회귀 가드, 총 23건 PASS) + E2E `tests/e2e/home.spec.ts` (카테고리 8 / 카드 6 / CTA, mobile+desktop 양쪽 PASS, 총 4 tests). lint/build/test/test:e2e 모두 통과.
  - **추가 완료 (2026-05-16, Discover 카드 패밀리 확장)**: 단일 `CircleCard` 외에 디스커버 모드 전용 카드 2종 + Link wrapper 1종 추가. (a) `CircleListCard` — 88×88 정사각 썸네일 + 텍스트 right column 가로형 (당근마켓 모임 패턴, `HorizontalCircleStrip` 안 4 cards × 2 columns 가로 스크롤). (b) `CircleAvatarCard` — 80×80 원형 (Instagram Story 톤, `HourlyCategoryStrip` 안 가로 스크롤). (c) `CircleCardLink` — 카드 안 nested Link / 버튼 충돌 회피 wrapper. 모두 props 가 `CircleSummary` 동일 → Phase 1.2 T-009 와이어업 비용 동일. commit `b8ddab3`, `bf3143b`, `fff59b7`, `42d375e`, `b2b4983`.
  - **추가 완료 (2026-05-17~18, 카드 시각·신착 strip 보강)**: (a) `CircleCard` 의 태그 표시를 plain 텍스트에서 **칩(rounded outline)** 으로 전환 + slug → 일본어 라벨 매핑 (`lib/circles/filter-labels.ts` `TAG_SEEDS`, commit `91d7b81`). (b) 신착 strip 카드에 **NEW outline 배지** 노출 (`5d1fe82`). (c) 신착 섹션을 **1열 stack 레이아웃**(`HorizontalCircleStrip` variant) 으로 변경 + 10건 노출 (`181ec35`). (d) 카드 이미지 호스트는 `picsum.photos` (seed 결정론적) 로 통일 — Phase 1.2 T-009 시점 Supabase Storage URL 로 교체.

- **T-011: 서클 목록 페이지 + 카테고리 탭 + 필터** ✅
  - `app/circles/page.tsx`: `searchParams` 사용 → Suspense 경계 필수.
  - 카테고리 탭 8종 (URL `?category=sports` 동기화), 필터: 활동빈도·연회비 범위·태그 다중·`official_type`.
  - **필터링은 더미 배열에 대한 클라이언트 측 `filter()` 로 모킹** (Phase 1.2 에서 Postgres `eq` / `overlap` / 범위 조건으로 교체).
  - 모바일: `Sheet` 컴포넌트로 bottom sheet 필터 / PC: 좌측 사이드바.
  - 페이지네이션은 단순 20개 단위 (MVP).
  - **모바일 (기본)**: 카드 그리드 1열 (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`). 필터 트리거 버튼은 검색바 옆 또는 상단 sticky 영역에 배치(휠 스크롤 없이 도달 가능). 적용 중인 필터 개수 뱃지 표시.
  - **테스트**: 필터 조합 5종에 대해 Playwright 로 결과 카드 수 검증 (모바일 360px viewport 포함).
  - **완료 (2026-05-14)**: (a) `lib/circles/search-params.ts` 신설 — CirclesSearchParams 타입 + parseCirclesSearchParams(fail-safe enum allowlist) + buildCirclesUrl(빈값 생략, page=1 생략) + countAppliedFilters. (b) `lib/dummy/circles.ts` 에 filterCircles + FilterCirclesResult 추가 — 모든 필터 AND, 같은 필터 다중 OR, q case-insensitive 부분매칭, page clamp(1~totalPages). (c) `components/circles/category-tabs.tsx` 신설 — 「すべて」 + 8 카테고리 = 9 link, 활성 시 bg-keio-navy, 홈/목록 공통 사용. 홈 E2E count 8→9 갱신. (d) `components/circles/filter-panel.tsx` (Client) — 5섹션 필터(q/frequency/officialType/tags 10/fee_max select), draft useState + 「適用」 시 router.push(buildCirclesUrl({...draft, page:undefined})) + 「リセット」 → /circles. PRD 태그 시드 10종 컴포넌트 내부 정의(T-009 이후 교체). (e) `components/circles/filter-trigger.tsx` (Client, lg:hidden) — shadcn Sheet bottom + 적용 개수 Badge. (f) `app/circles/page.tsx` 본 디자인 — 본문 전체 Suspense 래핑(cacheComponents 모드의 searchParams 호환), sticky 검색 form(다른 필터 hidden input 보존) + CategoryTabs + FilterTrigger, lg:grid-cols-[260px_1fr] 사이드바 분기, CardGrid(grid-cols-1 sm:grid-cols-2 xl:grid-cols-3), Pagination(前へ/X/次へ), EmptyState. (g) 단위 테스트 +9건(filterCircles 5종 + 페이지네이션), E2E +3 spec × mobile+desktop = 6건 PASS, 총 32 unit + 14 E2E.
  - **추가 완료 (2026-05-16, /search 분리 + Discover/Results 분기)**: (a) `/circles` 가 `isDiscoverMode(params)` 분기 — 필터 모두 기본값이면 **DiscoverContent** (`HomeCategoryGrid` 8 카테고리 4×2 + `PromoTileCarousel` 3 타일 자동 회전 + 人気/新着 `HorizontalCircleStrip` + `HourlyCategoryStrip` 1시간 회전), 한 개라도 활성이면 **SearchResults** (사이드바 + 카드 그리드 + 페이지네이션). (b) sticky 인라인 검색 form 제거 → 검색·카테고리·필터 진입은 별도 `/search` 페이지 (헤더 🔍 진입, 당근앱 패턴) + 결과 모드 안 「絞り込みを編集」 칩. (c) `lib/circles/search-params.ts` 에 `isDiscoverMode` / `buildSearchUrl` 헬퍼 추가. commit `1e9b9fa`, `b2b4983`.
  - **추가 완료 (2026-05-17~18, 필터 패널 9섹션 확장 + 시트 안정화)**: (a) `FilterPanel` 이 기존 5섹션(q/frequency/officialType/tags/fee_max) → **9섹션** 으로 확장: 募集状態 / 活動頻度 / 活動時間帯 / 活動曜日 / 団体区分 / 会員数 / タグ / 並び替え (`年会費`/`新入生比率` 섹션은 정책 변경으로 제거). 각 섹션은 토스 스타일 **`SegmentedOption`** (h-12 border-2) 칩 + `-mx-4 ... overflow-x-auto px-5` 풀-블리드 가로 스크롤. (b) 새 enum 상수 3종 추가: `lib/constants/activity-time-band.ts`(3종) / `lib/constants/recruitment-status.ts`(3종) / `lib/circles/filter-labels.ts` 의 `MEMBER_SIZE_OPTIONS`·`SORT_OPTIONS`·`WEEKDAYS`·`TAG_SEEDS`. `CirclesSearchParams` 에 `recruitmentStatus[]` / `activityTimeBand[]` / `activityDays[]` / `memberSize` / `sort` / `all` 추가 (`lib/circles/search-params.ts`). (c) **「適用」 버튼 디자인 통일** — rounded-full + 컨테이너 보더 제거 (commit `378d279`). (d) **필터 시트 가로 스크롤 잠금** — `FilterPanel` 루트 + 스크롤 영역에 `overflow-x-hidden` 추가, 자식의 `-mx-4` 풀-블리드는 유지 (commit `d0b1287`). (e) `/search` 페이지의 `QuickFilters` 4종(募集中/初心者歓迎/ゆるい/ガチ) + bottom Sheet 안 `FilterPanel` 재사용 (mode="sheet" 분기).

- **T-012: 서클 상세 페이지 + 갤러리** ✅
  - `app/circles/[id]/page.tsx`: 동적 라우트, Suspense 경계 필수. 더미 배열에서 `id` 로 find.
  - 커버 + 서클명 + verified 뱃지 + 태그 칩 5개 / 개요 + 활동빈도·연회비·요일·회원수·신입생비율 요약 카드 / 갤러리 (Dialog 로 전체화면).
  - `not-found.tsx` 추가: 더미 배열에 없는 `id` 는 404.
  - **모바일 (기본)**: 본문 1열 스택. 갤러리는 가로 swipe 캐러셀 + 도트 인디케이터(`overflow-x-auto snap-x`). 요약 카드(활동빈도/연회비/요일/회원수/신입생비율) 는 모바일 1열, `md` 이상에서 2열 그리드. 본문 하단에는 T-013 액션 바가 가리지 않도록 `pb-20` 여유 확보.
  - `view_count` 증가 로직은 Phase 1.2 T-009 에서 RPC `increment_view_count` 와이어업.
  - **완료 (2026-05-14)**: (a) `lib/types/domain.ts` CircleDetail 에 activity_days/member_count/freshmen_ratio 3 필수 필드 추가. (b) `lib/dummy/circles.ts` 의 buildGallery + assets helper 도입, 30건 모두 새 필드 + 갤러리 4장(picsum seed) 보강. 단위 테스트 +5건(총 37 PASS). (c) `components/circles/circle-gallery.tsx` (Client) — 모바일 가로 swipe(snap-x mandatory) / 데스크탑 3열 그리드 + shadcn Dialog 전체화면. (d) `app/circles/[id]/page.tsx` 본 디자인 — 본문 전체 Suspense + async CircleDetailContent + getCircleById + notFound. CoverImage(16:9 / 21:9 priority) + Header(카테고리·official_type 뱃지 + h1 + 태그 칩) + SummaryGrid(5종 dl) + Description(whitespace-pre-line) + CircleGallery + ContactSection(Instagram/X/LINE inline + ExternalLink). pb-24 md:pb-12. (e) `app/circles/[id]/not-found.tsx` 404 UI. (f) E2E `circle-detail.spec.ts` 3 test × mobile+desktop = 6 PASS. (g) lint/build/test(37)/test:e2e(전체) 통과.
  - **추가 완료 (2026-05-17~18, 상세 페이지 IA 재구성 + sticky CTA 통합 + 헤더 hide)**: (a) **IA 재구성** (commit `7558a76`) — 상세 페이지 본문이 `DetailPageHeader` (오버레이 floating 戻る/홈/공유) + `CoverImage` + 메타 헤더 + `ShinkanBanner` + `SummaryGrid` (5종 dl, `freshmen_ratio`·`annual_fee_yen` 제거 후 募集状況/活動頻度/活動日/活動時間/会員数 5종) + `Description` + `CircleDetailTabs` (ホーム/掲示板) 순으로 재배열. (b) **sticky CTA portal + lagging spring** (commit `f1c8ec6`) — `CircleActions` 가 `createPortal` 로 body 마운트, motion/react `spring` 으로 약간 지연되며 따라오는 통합 pill (좋아요 + 「参加する」), pb-24~28 본문 여유. (c) **新歓 배너** — `ShinkanBanner` RSC, `shinkan_events` 중 `event_date >= 오늘` 만 노출 (Phase 1.2 T-009 와이어업 anchor). (d) **글로벌 헤더 hidden** (commit `eec196d` + `ccc5bdb`) — 상세 페이지·리포트 상세·검색·셔플은 자체 floating 헤더만 노출 (메루카리/Airbnb 패턴), `header.tsx` + `header-client-gate.tsx` + `bottom-nav.tsx` 3곳 정규식 hide. (e) **탭 손 스와이프** (commit `fcd72ac`) — `CircleDetailTabs` 가 motion/react `drag="x"` + `SWIPE_THRESHOLD` 로 ホーム ↔ 掲示板 손가락 스와이프 지원, 탭 옆 미리보기 카드 클릭은 `CircleCardLink` 로 same-URL re-trigger 방지. (f) **掲示板 탭 active 복귀** (commit `ac511f7`) — 리포트 상세에서 뒤로가기 시 (`sessionStorage` 마커) 掲示板 탭 active 상태로 복귀. (g) `年会費` / `新入生比率` 표시·필터·정렬 전부 제거 (commit `0e6298b`, 상단 정책 박스 참조).

- **T-013: 하단 고정 액션 바 + 즐겨찾기 토글 UI**
  - PRD 「당근 모임 패턴」 하단 고정 액션 바 (모바일 safe-area inset 고려).
  - 좌측 「お気に入りに追加」 하트 토글 — **이 단계에서는 로컬 `useState` + `sessionStorage` 로만 작동**.
  - 실제 favorites 테이블 insert / delete + `useOptimistic` + `revalidateTag('favorites')` 는 Phase 1.2 T-009 에서 교체 (검증 이슈 **M-1** 대응).
  - 미로그인 사용자의 하트 탭 시 `/auth/login?next=/circles/{id}` 리디렉션 동선은 미리 와이어업 (인증 자체는 T-015).
  - **모바일 (기본)**: 하단 고정 액션 바는 **모바일 전용**(`md:hidden`) — fixed bottom + `env(safe-area-inset-bottom)` 패딩, 좌측 하트 토글 + 우측 「参加する」 풀폭 CTA(터치 타깃 최소 48px). `md` 이상에서는 액션 바를 숨기고 본문 우측 칼럼 또는 본문 내 인라인 CTA 로 대체.
  - **완료 (2026-05-14)**: (a) `lib/circles/use-favorites.ts` (Client hook) — sessionStorage 'kcircle:favorites' + 모듈 singleton authPromise + CustomEvent 'kcircle:favorites-changed' broadcast 로 다중 인스턴스 동기화. (b) `components/circles/favorite-toggle-button.tsx` variant 2종(card/action-bar) + e.preventDefault+stopPropagation 으로 카드 Link 충돌 회피. (c) `components/circles/circle-card.tsx` 의 placeholder span → FavoriteToggleButton 으로 교체. (d) `components/circles/circle-actions.tsx` layout='mobile'/'desktop' 분기 — 모바일 fixed bottom md:hidden + safe-area-inset-bottom, 데스크탑 hidden md:flex Header inline. handleJoin 은 T-014 anchor(console.info). (e) `app/circles/[id]/page.tsx` Header 안 데스크탑 + 본문 끝 모바일 액션 바 통합. (f) 단위 테스트 6건 PASS, E2E favorites 28건(mobile+desktop) PASS. lint+build+test+test:e2e 통과.
  - **추가 완료 (2026-05-16~17, RegisterFloatingCTA + scroll collapse + Auth 가드)**: (a) `components/layout/register-floating-cta.tsx` (Client) 신설 — `/circles` 만 노출 (`pathname !== "/circles"` 시 null), 우하단 floating ⊕. 스크롤 80px 이상 시 **알약 → 원형 collapse 애니메이션** (commit `b15b54c`, motion/react scale/opacity). (b) `/mypage` 비로그인 사용자 `redirect("/auth/login?next=/mypage")` 2차 방어 (commit `3e2dcd6`, RSC `supabase.auth.getClaims()` 검증). (c) `FavoriteToggleButton` variant 에 `action-bar-card` 추가 (셔플 카드 상단 노출용).

- **T-014: 「参加する」 채널 모달 UI**
  - 우측 메인 CTA 버튼 (慶應 濃紺 `#003366`).
  - `Dialog`(PC) / `Sheet`(모바일) 로 채널 선택 모달 표시. 더미 데이터의 `contact_instagram` / `contact_x` / `contact_line` 중 입력된 채널만 노출.
  - 채널 선택 시 → 새 탭으로 외부 URL 오픈 (`rel="noopener noreferrer"` + `target="_blank"` 의무).
  - **RPC `increment_inquiry_count` 호출 + Server Action + `revalidatePath` 는 Phase 1.2 T-009 에서 와이어업** (검증 이슈 **H-NEW-1** 대응).
  - 미로그인 동선만 미리 와이어업: 비로그인 사용자 클릭 → `/auth/login?next=/circles/{id}` 리디렉션.
  - **모바일 (기본)**: `Sheet`(bottom sheet) — 화면 하단에서 슬라이드 업, 채널 버튼은 각각 풀폭·최소 48px. 「キャンセル」 닫기 버튼은 Sheet 우상단 (엄지 도달 가능 위치). `md` 이상에서는 `Dialog` 중앙 모달.
  - **본 단계 테스트** (Playwright):
    - 모달이 등록된 채널만 노출 (3개 / 1개 / 0개 케이스).
    - Instagram 선택 → 새 탭이 instagram.com 도메인으로 열림.
  - **완료 (2026-05-14)**: (a) `components/circles/join-channel-modal.tsx` 신설 — Client, shadcn Sheet side="bottom" 단일 패턴, CHANNEL_META 외부 const, channels 배열에 입력된 채널만 push, 0개면 EmptyState + 「閉じる」, 1+개면 Button asChild + a target="\_blank" rel="noopener noreferrer" 풀폭. handleChannelClick 안 console.info '[T-009 anchor] incrementInquiryCount' + onOpenChange(false). JSDoc 에 T-009·T-015 anchor 명시. (b) `components/circles/circle-actions.tsx` 수정 — useState modalOpen + handleJoin 의 console.info → setModalOpen(true) + Fragment 끝에 JoinChannelModal 1회 렌더. (c) e2e 3 케이스 추가 (모달 열림·채널 가시성·target/rel 속성) mobile+desktop 양쪽 PASS = 6 신규. (d) lint+build+test(54)+test:e2e(40) 통과.
  - **추가 완료 (2026-05-16, Discover 트랜지션 + Shuffle)**: T-014 채널 모달 외 진입 동선·트랜지션 보강. (a) `CirclesPageShell` (Client wrapper) + `CirclesSlideOutContext` + `SlideOutLink` — 카테고리 클릭·「もっと見る」 클릭 시 옛 페이지 좌측 슬라이드 아웃 → 새 페이지 페이드 인 (iOS push easing, AnimatePresence mode="wait"). 외부 진입 시 700ms fade-in, 새로고침/다른 internal navigation 은 hard-cut, `prefers-reduced-motion` 시 skip. (b) `/shuffle` Tinder swipe deck 페이지 + 「シャッフルで探す」 promo 카드 진입. (c) `PromoTileCarousel` 셔플/お気に入り/검색 3 타일 자동 회전 (드래그 swipe + dots, motion/react v12 `AnimatePresence` + `LazyMotion`). (d) `HourlyCategoryStrip` `Math.floor(Date.now() / 3_600_000) % CATEGORIES.length` 1시간 회전 카테고리. commit `b2b4983`, `304844a`, `42d375e`, `32329a4`, `f82e943`, `1e9b9fa`.
  - **추가 완료 (2026-05-17, K-Ring 로고 + Fluent 3D Emoji + lucide hybrid)**: (a) 헤더 슬림화 + **K-Ring 로고** (commit `d654934`, `1a83e54`) — `components/layout/kcircle-logo.tsx` (Client), motion/react LazyMotion, K 심볼 원 둘레 ring draw 마운트 애니메이션, 크기 sm(28px)/md(48px)/lg(64px). (b) **Fluent 3D Emoji 도입** (commit `a0300ac`) — `components/ui/emoji.tsx` Iconify wrapper, 14종 화이트리스트(trophy/artist-palette/musical-notes/books/globe/party-popper/handshake/clapper-board/sparkles/house/red-heart/bust-in-silhouette/bell/magnifying-glass). 카테고리 그리드·셔플 카드·BottomNav 일부에서 사용. (c) BottomNav 는 **lucide 단색 아이콘 복귀** (commit `2b63ab4`, Fluent → lucide revert) — 액션 아이콘은 단색 일관성 유지, 콘텐츠/카테고리 표현에만 Fluent 3D 사용. 의존성 변경: `next-themes` 제거 + `@iconify/react` + `@iconify-json/fluent-emoji` 추가 (commit `52717aa`).

- **T-034: 活動レポート 시스템 (掲示板 탭 + 미리보기 + 상세 페이지)** ✅
  - **상태**: completed (2026-05-17~18, 5개 commit)
  - **공수**: 2d
  - **선행**: T-012 (상세 페이지)
  - **관련 PRD 기능**: F-NEW (PRD 「F003 상세 정보」 의 보강. 다음 PRD 개정 시 F013 「活動レポート」 로 정식 채번 검토)
  - **목적**: 신입생이 단체 분위기를 판단할 수 있는 **활동 사진·후기 게시판**. 단체 내부 갤러리에 묻혀 있던 활동 기록을 카드 형태로 노출.
  - **구현 산출물**:
    - **데이터**: `lib/constants/activity-report-type.ts` (5종 enum: practice/camp/event/meeting/other) + `lib/types/domain.ts` `ActivityReport` 타입 + `lib/dummy/activity-reports.ts` (~100건 결정론적 더미, 서클당 3-4건, TITLE/CONTENT/BODY POOL 각 12개 일본어 더미).
    - **컴포넌트**: `components/circles/activity-reports-preview.tsx` (Client, ホーム 탭 미리보기 가로 캐러셀 4-5건 + 「もっと見る」), `activity-reports-list.tsx` (掲示板 탭 전체 세로 리스트, 좌측 정사각 썸네일 + 우측 텍스트), `report-page-header.tsx` (리포트 상세 floating 戻る, createPortal + safe-area-inset-top), `circle-detail-tabs.tsx` (ホーム/掲示板 controlled Tabs + `drag="x"` 손 스와이프).
    - **라우트**: `/circles/[id]/reports/[reportId]/page.tsx` (RSC, 중첩 동적 세그먼트, `report.circle_id !== id` 검증 후 `notFound()`), `not-found.tsx`, `loading.tsx`, `template.tsx` (`ReportSlideOutContext` + iOS push 트랜지션).
    - **트랜지션**: 상세 → 리포트 진입 시 좌측 슬라이드 + 페이드 인, 뒤로가기 시 掲示板 탭 active 복귀 (`sessionStorage` 마커).
    - **UI hide**: 리포트 상세 페이지는 글로벌 헤더 + BottomNav 둘 다 hidden (자체 floating 戻る만 노출).
  - **관련 commit**: `5e18ca8` (코어 시스템), `00679a1` (리포트 상세 + 트랜지션), `fcd72ac` (탭 손 스와이프 + 미리보기 카드 navigate), `eec196d` (글로벌 헤더 hidden), `ac511f7` (掲示板 탭 active 복귀).
  - **Phase 1.2 와이어업 anchor**: 더미 `lib/dummy/activity-reports.ts` → Supabase `activity_reports` 테이블 fetch (DB 스키마는 T-005 마이그레이션 시점 추가 필요. 현재 `lib/types/database.ts` 미포함 → **T-005 갱신 ToDo**).
  - **테스트 미반영**: Playwright E2E 시나리오(ホーム → 미리보기 → 「もっと見る」 → 掲示板 → 카드 클릭 → 리포트 상세 → 戻る → 掲示板 active 복귀) 아직 없음. Phase 1.4 T-022 통합 E2E 에 포함시킬 것.

### Phase 1.2 — DB 기반 구축 + UI 와이어업 (T-005 ~ T-009)

> Phase 1.1 에서 만든 UI 가 사용 중인 더미 데이터를 **실제 Supabase fetch / Server Action / RPC** 로 교체한다.
> 스키마 → RLS → RPC → Storage 가 모두 준비된 후, 마지막 **T-009** 에서 시드 적재와 UI 와이어업을 한꺼번에 처리하여 정합성 확인 비용을 한 번에 모은다.

| ID        | 작업                                                        | 상태      | 공수 | 선행                        | 관련 기능              |
| --------- | ----------------------------------------------------------- | --------- | ---- | --------------------------- | ---------------------- |
| **T-005** | DB 스키마 마이그레이션 1차 (10 테이블 + 8 enum) ✅          | completed | 1d   | T-003                       | 전 기능                |
| **T-006** | RLS 정책 분리·`is_admin()` 헬퍼                             | pending   | 1d   | T-005                       | F005, F006, F007, F010 |
| **T-007** | RPC `increment_inquiry_count` + `inquiry_events` 디바운스   | pending   | 0.5d | T-005, T-006                | F012                   |
| **T-008** | Storage 버킷·정책·EXIF 제거                                 | pending   | 0.5d | T-005                       | F003, F005             |
| **T-009** | 시드 30개 + 태그 10종 + **UI 와이어업 (더미 → 실제 fetch)** | pending   | 1.5d | T-005, T-008, T-010 ~ T-014 | F002, F004, F007, F012 |

- **T-005: DB 스키마 마이그레이션 1차** ✅
  - `supabase` MCP `list_tables` 로 기존 상태(`instruments` 만 존재) 확인 후, `apply_migration` 으로 **10개 테이블** 생성 (핵심 8 + 보조 2):
    `profiles`, `circles`, `tags`, `circle_tags`, `circle_images`, `favorites`, `shinkan_events`, `activity_reports`, `activity_report_images`, `inquiry_events`, `app_settings`.
    (보조 2종 `inquiry_events` / `app_settings` 는 T-007 / T-021 의존이지만, 본 마이그레이션 1차에서 함께 생성 — 후속 작업이 RPC / UI 만 짜면 되도록.)
  - **8개 enum 생성** (`lib/constants/*` SSOT 와 1:1 일치):
    `category_enum` (8), `official_type_enum` (5, UI 는 2종만 노출 — 정책 박스 🏷️), `activity_frequency_enum` (3), `circle_status_enum` (3), `tag_kind_enum` (4), `recruitment_status_enum` (3, **신규**), `activity_time_band_enum` (3, **신규**), `activity_report_type_enum` (5, **신규**).
  - PRD 「circles」 필드 + 검증 이슈 H-NEW-3 보강 컬럼 + **2026-05 신규 5컬럼** 포함:
    - 검증 보강: `rejection_reason` / `updated_at` / `pledge_accepted_at` / `reviewed_by` / `reviewed_at` / `slug` unique / `submission_note`.
    - 신규 5컬럼: `description text`, `activity_days text`, `member_count int`, `recruitment_status`, `activity_time_band[]`.
    - **`annual_fee_yen` 컬럼 보존** (UI 만 제거, 정책 박스 💴).
    - **`freshmen_ratio` 컬럼 없음** (DB 도 정리).
  - **`circles.official_type` 은 Postgres enum 타입 `official_type_enum` 으로 정의** — DB 5종 보존, UI 노출은 2종 (정책 박스 🏷️).
  - `circles` CHECK 제약: `contact_instagram`, `contact_x`, `contact_line` 중 1개 이상 NOT NULL (`circles_contact_at_least_one`).
  - `updated_at` 트리거(`moddatetime`, extensions 스키마) 적용.
  - `profiles` 는 `auth.users` insert 트리거 (`handle_new_user`, SECURITY DEFINER) 로 자동 생성. anon/authenticated 의 REST RPC 직접 호출은 `REVOKE EXECUTE` 로 차단.
  - **활동 리포트 (T-034 의존)**: `activity_reports` + `activity_report_images` (circle_images 패턴) 추가. F-NEW 의 DB 스키마 해소.
  - **RLS enable (기본 deny)** — 모든 신규 11개 테이블 `ENABLE ROW LEVEL SECURITY` (정책 없이). T-006 에서 select/insert/update/delete 세분화.
  - **인덱스**: `circles_status_created` (partial, status='approved'), `circles_category`, `favorites_user_created`, `shinkan_events_circle_date`, `activity_reports_circle_created`.
  - **테스트**: `supabase` MCP `execute_sql` 로 CHECK 제약·CASCADE 무결성·moddatetime 트리거 모두 검증.
  - **완료 (2026-05-18)**: (a) 6건 마이그레이션 적용 — `005_01_extensions_enums`, `005_02_profiles_circles`, `005_03_circle_satellite`, `005_04_activity_reports`, `005_05_misc_indexes_rls`, `005_05b_revoke_handle_new_user` (security advisor 보강). (b) `mcp__supabase__generate_typescript_types` 자동 생성 결과로 `lib/types/database.ts` 무손실 교체 — 수동 정의 → 12개 Tables + 8개 Enums + `Tables<>`/`TablesInsert<>`/`TablesUpdate<>`/`Enums<>`/`CompositeTypes<>` 헬퍼 + `Constants` 런타임 객체. (c) `npm run lint` / `npm run build` (27 페이지) / `npm run test` (4 files / 51 tests) 모두 통과. (d) `get_advisors security` 남은 항목: RLS policy missing INFO 11건 (T-006 예상) + Auth Leaked Password Protection WARN 1건 (Supabase Auth 대시보드 설정, T-015 범위).
  - **See**: `docs/tasks/T-005-db-schema-migration.md`

- **T-006: RLS 정책 분리·`is_admin()` 헬퍼**
  - 검증 이슈 **H-2** 대응: 모든 테이블에 대해 `select / insert / update / delete` 정책을 명시적으로 분리.
  - `public.is_admin()` SECURITY DEFINER 헬퍼 함수 추가 (RLS 정책 내부에서 재귀 호출 방지).
  - `circles.status` 가 `'approved'` 인 행만 익명 select 가능, owner 는 자신의 모든 status 행, admin 은 전체.
  - `circles` update 정책에 `inquiry_count` 컬럼 변경 금지를 명시 (RPC 함수만 갱신).
  - **테스트**: 익명 / 일반 사용자 / owner / admin 4개 컨텍스트에서 각 테이블의 select·insert·update·delete 시도 → 기대값과 일치하는지 SQL 단위 테스트.

- **T-007: RPC `increment_inquiry_count` + `inquiry_events` 디바운스**
  - PRD 「Postgres 함수 (RPC)」 절의 SQL 그대로 `apply_migration` 으로 등록.
  - 검증 이슈 **M-NEW-2** 대응으로 `inquiry_events(user_id uuid, circle_id uuid, day date, primary key(user_id, circle_id, day))` 테이블 추가 후, RPC 내부에서 동일 (user, circle, day) 가 이미 존재하면 카운트 증가를 스킵.
  - `anon` 권한 회수 + `authenticated` 만 EXECUTE 허용.
  - **테스트**: 같은 사용자가 동일 서클을 하루 두 번 호출 → 두 번째는 `inquiry_count` 가 증가하지 않음을 Playwright + 직접 SQL 검증.

- **T-009: 시드 30개 + 태그 10종 + UI 와이어업 (더미 → 실제 fetch)** — **본 Phase 의 통합 지점**
  - **(A) DB 시드 적재**
    - PRD 「더미 데이터 정책」의 카테고리 분포대로 `apply_migration` 실행.
    - 태그 10종은 PRD의 SQL 그대로 insert.
    - 서클 30개에 대해 `circle_tags`, `circle_images` (서클당 3장 평균) 시드.
    - Unsplash 무료 이미지 URL 사용 + 출처 명시 주석.
    - Phase 1.1 의 `lib/dummy/circles.ts` 와 **같은 30건이 되도록** 일치시켜, UI 회귀 테스트가 동일 결과를 보장하게 함.
  - **(B) Phase 1.1 컴포넌트 와이어업**
    - `app/page.tsx`, `app/circles/page.tsx`, `app/circles/[id]/page.tsx` 의 더미 import → `lib/supabase/server.ts` 기반 RSC fetch 로 교체.
    - `app/circles/page.tsx` 의 클라이언트 측 `filter()` → Postgres `eq` / `in` / `overlap` 쿼리로 교체.
    - **T-013 하트 토글**: 로컬 `useState` → `useOptimistic` + Server Action `toggleFavorite` + `revalidateTag('favorites')`.
    - **T-014 「参加する」 모달**: Server Action `incrementInquiryCount` 도입 → T-007 RPC 호출 + `revalidatePath('/circles/${id}')` (검증 이슈 **H-NEW-1** 대응) + 세션 스토리지 클라 디바운스 (서버측 `inquiry_events` 와 이중 보호).
    - `view_count` 증가용 RPC `increment_view_count` 추가 (T-007 패턴 동일) + 서클 상세 RSC 진입 시 호출 (검증 이슈 **M-4** 대응).
  - **(C) 회귀 검증**
    - Phase 1.1 의 Playwright 시나리오를 그대로 재실행 → 더미가 아닌 실제 DB 에서 동일 결과가 나오는지 확인.
    - 동일 사용자가 같은 서클을 즉시 재호출 → `inquiry_count` 가 1만 증가하는지 DB 직접 SELECT.

### Phase 1.3 — 인증 & 사용자 영역 (T-015 ~ T-018)

| ID        | 작업                                      | 상태    | 공수 | 선행         | 관련 기능 |
| --------- | ----------------------------------------- | ------- | ---- | ------------ | --------- |
| **T-015** | @keio.jp 인증 + `keio_verified` 자동 부여 | pending | 1d   | T-005, T-006 | F010      |
| **T-016** | 마이페이지 + 내 서클 관리 페이지          | pending | 1.5d | T-015        | F011      |
| **T-017** | 즐겨찾기 페이지                           | pending | 1d   | T-013        | F007      |
| **T-018** | 서클 등록 폼 + URL 화이트리스트 검증      | pending | 2d   | T-008, T-015 | F005      |

- **T-015: @keio.jp 인증 + `keio_verified` 자동 부여**
  - 기존 `components/sign-up-form.tsx` 의 이메일 인증 콜백에서 도메인 검사.
  - `auth.users` insert 트리거가 `profiles` 행 생성 시 이메일 도메인이 `keio.jp` 또는 `*.keio.jp` 면 `keio_verified=true` 설정.
  - 마이페이지에 「慶應生認証済み」 뱃지 노출.
  - **모바일 (기본)**: 로그인·회원가입 폼은 1열 스택, 폼 너비 `max-w-sm mx-auto` + 풀폭 입력. 각 input 에 `inputmode="email"` / `autocomplete="email"` / `autocomplete="current-password"` 적용하여 모바일 키보드와 자동완성 최적화. 제출 버튼은 최소 48px, 풀폭.
  - **`/shuffle` 상시 비로그인 허용 정책**: `/shuffle` 은 **회원가입 전 게스트 디스커버리 진입점**으로 상시 비로그인 허용 (`isPublicPath()` 분기 영구 유지, `lib/supabase/proxy.ts:18`). Phase 1.2 T-009 와이어업 시
    `increment_view_count` RPC 는 **익명 (anon role) 호출 허용** 으로 설계 — RPC 정의에 `SECURITY DEFINER` + `GRANT EXECUTE ... TO anon` 또는 클라이언트 측 view_count 증가 생략. 즐겨찾기·「参加する」 같은 인증 의존 액션 클릭 시에만 `/auth/login?next=/shuffle` 리디렉션.
  - **테스트**: `test@keio.jp` 로 가입 시 verified, `test@gmail.com` 으로 가입 시 unverified.

- **T-016: 마이페이지 + 내 서클 관리 페이지**
  - `app/mypage/page.tsx`: 표시명·이메일·verified 뱃지·등록 서클 수 카드 + 「登録サークルを管理」 링크.
  - `app/mypage/circles/page.tsx`: 내 서클 목록 (status 뱃지 「審査中」/「公開中」/「却下」 + 거절 사유 표시).
  - 둘 다 `lib/supabase/server.ts` 사용 +
    Suspense 경계.
  - **모바일 (기본)**: 프로필 카드와 등록 서클 카드 모두 1열 풀폭 스택. 「登録サークルを管理」 링크는 풀폭 버튼(터치 타깃 48px). 내 서클 목록은 1열 카드, 상태 뱃지는 카드 우상단.

- **T-017: 즐겨찾기 페이지**
  - `app/favorites/page.tsx`: 로그인 필수 (미로그인 시 `/auth/login?next=/favorites` 리디렉션).
  - 카드 그리드 + 카드별 하트 해제 버튼 + 비교 체크박스 (최대 3개, 초과 시 `toast` 경고).
  - 「比較する」 버튼 → `/compare?ids=a,b,c` 로 이동 (Phase 1 후반 stretch goal — T-024 에서 실제 비교 페이지 구현).
  - **모바일 (기본)**: 카드 그리드 1열 (`sm:grid-cols-2`). 비교 체크박스는 카드 좌상단 24×24px 이상 + 터치 타깃 영역 44px 확보. 「比較する」 버튼은 하단 sticky 바(`md:` 이상에서는 카드 그리드 상단 인라인 버튼).

- **T-018: 단체 등록 폼 + URL 화이트리스트 검증** — 우선순위
  - `app/circles/new/page.tsx` (Client Component, RHF + Zod).
  - 필드: 단체명·카테고리·`official_type`(5종 select: 体育会/公認/非公認/インカレ/その他)·활동빈도·연회비·태그(최대 5개)·커버 이미지·연락처(Instagram/X/LINE 중 1개 이상)·**誓約 동의 체크 2종**:
    1. **실재·학칙 동의**: 「本団体は実在し、慶應義塾大学の学則に違反しないことを誓約します」
    2. **公式 인증 무관 동의**: 「本サービスは慶應義塾大学公式の認証とは無関係であり、登録内容の責任は本人に帰属することを理解しました」
  - **검증 이슈 C-NEW-2 대응**: Zod 스키마에 호스트 화이트리스트 적용
    - `contact_instagram`: `instagram.com`
    - `contact_x`: `x.com` / `twitter.com`
    - `contact_line`: `line.me` / `lin.ee`
    - 그 외 도메인 입력 시 거부 + 「公式 SNS の URL を入力してください」 메시지.
  - 「個人アカウントではなく、サークル公式アカウントのURLを入力してください」 안내 문구 노출.
  - 誓約 체크 시 `pledge_accepted_at = now()` 저장.
  - 제출 후 status='pending' + 「審査中」 안내 페이지로 이동.
  - **모바일 (기본)**: 폼은 1열 스택, 각 input 풀폭. 적절한 `inputmode` 적용(`email`/`url`/`numeric` — 연락처 URL은 `url`, 연회비는 `numeric`). 긴 폼 길이 대응으로 「登録申請する」 제출 버튼은 하단 sticky 영역에 배치하여 스크롤 없이 도달 가능. 커버 이미지 업로드는 카메라 직접 촬영도 가능하도록 `<input type="file" accept="image/*" capture="environment">`.
  - **테스트 체크리스트** (Playwright MCP):
    - 화이트리스트 외 URL (`evil.example.com/instagram`) 입력 시 폼 거부.
    - 誓約 체크 없이 제출 시 거부.
    - 정상 제출 후 `/mypage/circles` 에 「審査中」 뱃지 노출.

### Phase 1.4 — 관리자·알림·QA (T-019 ~ T-022)

| ID        | 작업                                                 | 상태    | 공수 | 선행                       | 관련 기능 |
| --------- | ---------------------------------------------------- | ------- | ---- | -------------------------- | --------- |
| **T-019** | 관리자 승인 큐 페이지 (가드·스키마 완료, 큐 UI 남음) | pending | 1d   | T-005, T-006, T-018        | F006      |
| **T-020** | 이메일 알림 인프라 (Resend)                          | pending | 1.5d | T-019                      | F006 운영 |
| **T-021** | 다중 admin 부여 + 신청 일시정지 토글                 | pending | 0.5d | T-019                      | 운영      |
| **T-022** | Phase 1 통합 E2E 테스트                              | pending | 1.5d | T-014, T-018, T-019, T-020 | 전 기능   |

- **T-019: 관리자 승인 큐 페이지**
  - **선행 인프라 완료 (2026-05 현황)**: 권한 가드와 DB 스키마는 이미 구축됨 → 본 작업의 남은 범위는 **큐 UI 구현(현 `ComingSoon` 플레이스홀더 교체)** 뿐.
    - **권한 가드 (구현 완료)**: `app/admin/layout.tsx` 의 `AdminGuard` 가 2단계 검증 담당 — ① `lib/supabase/proxy.ts` `isPublicPath()` 가 `/admin/*` 를 인증 필수로 막는 1차 가드, ② layout 이 `is_admin()` RPC(`profiles.role`, SECURITY DEFINER, T-006)로 role 검증하는 2차 가드. 비관리자(일반 로그인)는 `/circles` 로 **조용히 리다이렉트**(관리자 페이지 존재 비노출), 미로그인은 `/auth/login?next=<원래 경로>`. → **page.tsx 에서 별도 권한 확인 불필요**.
    - **DB 스키마 (존재 확인)**: `circles.status`(pending/approved/rejected)·`rejection_reason`·`reviewed_by`·`reviewed_at`·`submission_note` + `profiles.role` + `is_admin()` 모두 존재 → **신규 마이그레이션 불필요**.
  - **남은 작업**: `app/admin/circles/page.tsx` 의 `ComingSoon` 을 실제 큐 UI 로 교체.
    - pending 서클 목록 (신청일 순) + 인라인 미리보기 (이름·카테고리·`official_type`·대표자·대표자 이메일·`keio_verified`·제출일·`submission_note`).
    - 「承認」 / 「却下」 버튼 → Server Action 으로 status 갱신 + `reviewed_by` / `reviewed_at` 기록. 거절 시 `rejection_reason` 필수 입력.
    - 처리 후 `revalidatePath('/admin/circles')` + 오너에게 이메일 알림 트리거 (T-020).
  - **모바일 (예외 — 데스크탑 우선)**: 본 페이지는 운영자 환경(데스크탑/태블릿)을 1차 타깃으로 한다. 모바일에서는 정보 밀도가 낮은 1열 카드 스택으로 fallback (각 신청 카드 = 인라인 미리보기 요약 + 「承認」/「却下」 버튼). 거절 사유 입력은 모바일에서 Sheet 로 표시.
  - **테스트**:
    - (가드 — 이미 구현됨) 일반 로그인 사용자가 `/admin/circles` 접근 시 `/circles` 로 리다이렉트되는지, 미로그인은 `/auth/login?next=/admin/circles` 로 가는지.
    - (큐 UI — 신규) 「承認」/「却下」 Server Action 이 `status`·`reviewed_by`·`reviewed_at`·`rejection_reason` 을 올바르게 기록하고, 거절 사유 미입력 시 차단되는지.

- **T-020: 이메일 알림 인프라 (Resend)**
  - 검증 이슈 **C-3** 대응: Resend SDK 추가 + Supabase Edge Function `notify-circle-status` 배포.
  - `circles.status` 변경 시 Edge Function 호출 (Supabase Database Webhook 또는 Server Action 직접 호출).
  - 승인: 「サークルが公開されました」 / 거절: 「公認サークルとして確認できませんでした」 + `rejection_reason` 본문 포함.
  - 환경 변수 `RESEND_API_KEY` 는 Vercel + Supabase 양쪽 등록.
  - **대안 검토**: Resend 무료 한도 부족 시 Discord webhook 으로 대체 (관리자 채널 알림만이라도 확보).

- **T-021: 다중 admin 부여 + 신청 일시정지 토글**
  - 검증 이슈 **H-1** 대응: `profiles.role` 에 admin 다중 부여 가능 (SQL 콘솔로 처리, UI 불필요).
  - `app_settings(key, value)` 테이블 추가 → `circle_submission_paused boolean` 키로 신청 일시정지 토글.
  - 서클 등록 페이지에서 일시정지 상태 시 폼 비활성화 + 안내 문구.
  - SLA 48h 표기를 등록 완료 페이지에 안내.

- **T-022: Phase 1 통합 E2E 테스트**
  - Playwright MCP 로 다음 시나리오 자동화:
    1. 비로그인 사용자가 홈 → 서클 목록 → 카테고리 필터 → 카드 클릭 → 상세 확인 → 「参加する」 클릭 → 로그인 페이지로 이동.
    2. 로그인 후 같은 상세 페이지로 복귀 → 채널 모달 → Instagram 선택 → 새 탭 오픈 검증.
    3. 하트 토글 → 즐겨찾기 페이지에 노출.
    4. 대표자가 서클 등록 → `/mypage/circles` 「審査中」 확인.
    5. admin 로그인 → 승인 큐에서 승인 → 오너에게 이메일 송신 확인 (Resend 로그).
  - 에러 / 엣지 케이스: 잘못된 URL 도입, 미인가 admin 경로 접근, 동시 하트 토글.

### Phase 1.5 — 출시 D-day 체크리스트 (T-023)

- **T-023: MVP 출시 사전 점검**
  - **보안 (Security)**
    - [ ] RLS 정책: 익명 / authenticated / owner / admin 4개 컨텍스트 점검 (T-006 회귀 테스트 재실행).
    - [ ] 외부 URL 화이트리스트 (T-018) + `rel="noopener noreferrer"` 누락 없는지 grep.
    - [ ] Storage EXIF 제거 동작 확인.
    - [ ] `service_role` 키가 클라이언트 번들에 포함되지 않는지 `next build` 결과 확인.
    - [ ] `supabase` MCP `get_advisors` 실행 → security 항목 0건.
  - **성능 (Performance)**
    - [ ] 모든 동적 RSC 페이지에 Suspense 래핑 여부 확인 (cacheComponents 누락 시 빌드 에러).
    - [ ] Lighthouse 모바일 점수: Performance 80+ / SEO 90+ / Accessibility 90+.
    - [ ] 카드 이미지 `next/image` + 적절한 sizes 속성.
  - **콘텐츠 (Content)**
    - [ ] 시드 30개 단체 + 태그 10종 모두 approved. 시드 분포에 公認·非公認·インカレ 가 모두 포함되도록 (公認 한정 인상 방지).
    - [ ] 일본어 UI 라벨 검수 (PRD 「일본어 UI 텍스트 예시」 표 기준).
    - [ ] 모든 페이지에 적절한 `<title>` / OG 메타 태그.
    - [ ] **慶應 면책 문구 노출 확인** (PRD 「면책 사항」 절): 푸터 / 등록 폼 / 이용 약관 3곳. grep 으로 「公式の認証とは無関係」 텍스트 존재 검증.
    - [ ] **신고 / お問い合わせ 채널 명시** — footer 에 운영진 연락 수단 (메일 또는 폼) 1개 이상.
  - **운영 (Operations)**
    - [ ] 관리자 다중 부여 + 신청 일시정지 토글 동작 확인.
    - [ ] 이메일 알림 송수신 테스트 (승인·거절 양쪽).
    - [ ] Vercel 환경 변수 + Supabase URL/key 일치.
    - [ ] 운영 매뉴얼 작성: `docs/RUNBOOK.md` (승인 큐 처리법, 거절 사유 템플릿, 장애 시 대응).

---

## Phase 2 — 탐색 강화 (2–3주)

> 목표: 신입생의 의사결정을 가속하는 비교·추천·랭킹 기능 추가 + Phase 1 에서 발견된 부하·캐시 이슈 정리.

### Phase 2.0 — 비교 & 검증 이슈 정리 (T-024 ~ T-027)

- **T-024: 서클 비교 페이지 (F008)**
  - `app/compare/page.tsx`: `?ids=a,b,c` 로 최대 3개 서클 횡열 비교 테이블 (카테고리·활동빈도·요일·연회비·합숙·태그·분위기).
  - 각 컬럼 상단 커버 이미지 + 이름 + 「詳細を見る」 링크.
  - 검증 이슈 **H-3** 정리: 본 ROADMAP 에서는 F008 을 **Phase 2 시작 시점**의 첫 작업으로 고정 (PRD의 MVP/Phase 2 중복 해소).

- **T-025: `circle_metrics` 테이블 분리**
  - 검증 이슈 **H-NEW-2** 대응: `circles.view_count` / `inquiry_count` 를 별도 `circle_metrics(circle_id, view_count, inquiry_count, updated_at)` 테이블로 분리하여 row-level lock 경합 완화.
  - 마이그레이션: 기존 컬럼 → 새 테이블 복사 → 뷰 또는 join 으로 호환성 유지.
  - RPC 함수 본문 갱신.

- **T-026: 인기 서클 랭킹**
  - 상위 페이지 인기 서클 영역 + 별도 `/popular` 페이지.
  - 정렬 기준: `view_count` 7일/30일 가중 + `inquiry_count` 보조 (간단한 SQL 함수로 구현).

- **T-027: OG 이미지 자동 생성**
  - `@vercel/og` 도입 + `app/circles/[id]/opengraph-image.tsx` 동적 생성.
  - 서클명·카테고리·커버 이미지 합성.

### Phase 2.1 — おすすめ 진단 (T-028)

- **T-028: おすすめ 진단 (5–7문 추천)**
  - 5–7문 질문지 (예: 활동빈도 선호 / 연회비 상한 / 분위기 / 합숙 가능 / 음주 빈도) → 가중치 점수로 매칭.
  - 단순 SQL 점수 매칭 (ML 없음).
  - `/recommend` 페이지 + 결과 페이지에 추천 5개 카드.

---

## Phase 3 — 시즌 기능 (4월 新歓 시즌 전, 4–6주)

> 목표: 4월 1주차 트래픽 폭증 대비 + 신환 이벤트 캘린더 + 알림 기능 + 운영 자동화.

- **T-029: 新歓 캘린더**
  - `shinkan_events` 테이블 활용 (Phase 1.2 T-005 에서 이미 생성).
  - 월별 캘린더 뷰 + 서클별 이벤트 등록 UI (오너).
  - 필터: 카테고리 / 온라인·오프라인.

- **T-030: PWA 푸시 알림**
  - `next-pwa` 또는 manifest + service worker 직접 설정.
  - 즐겨찾기 서클의 신환 이벤트 D-1 푸시.
  - Web Push API + Supabase Edge Function 으로 발송.

- **T-031: 체험 참가 신청 폼**
  - 서클별 「体験参加申し込み」 폼 (이름·연락처·희망일).
  - 오너에게 이메일 알림 (T-020 인프라 재사용).

- **T-032: 트래픽 부하 시험**
  - k6 또는 Artillery 로 4월 1주차 예상 부하 (동시 500명 / RPS 200) 시뮬레이션.
  - Supabase Connection Pooler 설정 점검.
  - Vercel ISR + 정적 페이지 캐시 최적화.

- **T-033: 운영 자동화**
  - 6개월 미갱신 서클에 대해 대표자에게 자동 이메일 (Supabase Scheduled Edge Function).
  - 시드 리스트 자동 매칭 (公認団体名簿 PDF 파싱) — 신청량 증가 시 도입.

---

## 검증 이슈 → 작업 매핑

| 검증 이슈                               | 심각도   | 배치된 작업                             | 비고                                                                           |
| --------------------------------------- | -------- | --------------------------------------- | ------------------------------------------------------------------------------ |
| **C-NEW-2** 외부 URL 보안               | Critical | T-018                                   | Zod 화이트리스트 + `rel="noopener noreferrer"`                                 |
| **C-3** 이메일 알림 인프라              | Critical | T-020                                   | Resend 기본, Discord 대체안                                                    |
| **H-NEW-1** cacheComponents 캐시 무효화 | High     | T-009 (와이어업)                        | `useOptimistic` + `revalidatePath/Tag` — UI는 T-013/T-014, 실제 무효화는 T-009 |
| **H-NEW-2** row-level lock 경합         | High     | T-025                                   | `circle_metrics` 분리 (Phase 2)                                                |
| **H-NEW-3** 잔여 컬럼 누락              | High     | T-005                                   | `rejection_reason` 등 7개 컬럼 마이그레이션                                    |
| **H-1** 1인 관리자 SPOF                 | High     | T-021                                   | 다중 admin + 신청 일시정지                                                     |
| **H-2** RLS 정책 세분화                 | High     | T-006                                   | select/insert/update/delete 분리 + `is_admin()`                                |
| **H-3** F008 Phase 모순                 | High     | T-024                                   | Phase 2 첫 작업으로 고정                                                       |
| **M-NEW-2** 서버측 디바운스             | Medium   | T-007                                   | `inquiry_events` UNIQUE 제약                                                   |
| **M-1** favorites + cacheComponents     | Medium   | T-013 (UI), T-009 (와이어업)            | `useOptimistic` + `revalidateTag`                                              |
| **M-3** Storage 정책 미명세             | Medium   | T-008                                   | `circles-public` 버킷 + EXIF 제거                                              |
| **M-4** view_count 동시성               | Medium   | T-007 (RPC 정의), T-009 (호출 와이어업) | RPC + 세션 스토리지 디바운스                                                   |

---

## PRD 기능 ↔ ROADMAP 작업 매핑

| PRD 기능              | 설명                                                             | 주관 작업                           | 보조 작업                                                        |
| --------------------- | ---------------------------------------------------------------- | ----------------------------------- | ---------------------------------------------------------------- |
| **F001** 검색·필터    | 카테고리 탭 + 다중 필터                                          | T-011 (UI), T-009 (와이어업)        | T-003 (타입)                                                     |
| **F002** 카드 목록    | 카드 + 그리드                                                    | T-010, T-011 (UI), T-009 (와이어업) | —                                                                |
| **F003** 상세 정보    | 갤러리 + 요약 카드                                               | T-012 (UI), T-009 (와이어업)        | T-008 (이미지 정책), **T-034 (掲示板 탭·활동 리포트)**           |
| **F004** 태그 시스템  | 칩 10종                                                          | T-010, T-011, T-012                 | T-009 (시드)                                                     |
| **F005** 등록 폼      | RHF + Zod                                                        | T-018                               | T-008 (이미지)                                                   |
| **F006** 승인 큐      | admin 페이지                                                     | T-019                               | T-020 (알림), T-021 (운영)                                       |
| **F007** 즐겨찾기     | 하트 토글 + 페이지                                               | T-013 (UI), T-017, T-009 (와이어업) | T-006 (RLS)                                                      |
| **F008** 비교         | 횡열 테이블                                                      | T-024                               | T-017 (송출)                                                     |
| **F010** 인증         | 회원가입·로그인·verified                                         | T-015                               | 기존 스타터킷 활용                                               |
| **F011** 마이페이지   | 프로필 + 내 서클 관리                                            | T-016                               | T-018 (등록 동선)                                                |
| **F012** 참여 의사    | 채널 모달 + RPC                                                  | T-014 (UI), T-009 (RPC 와이어업)    | T-007 (RPC 정의), T-025 (Phase 2 metrics)                        |
| **F-NEW** 활동 리포트 | 掲示板 탭 + 미리보기 + 상세 (`/circles/[id]/reports/[reportId]`) | T-034 (UI 완료)                     | T-005 (DB `activity_reports` 테이블 추가 필요), T-009 (와이어업) |

---

## 페이지 ↔ Supabase 3-context 매핑

> CLAUDE.md 의 3-context 패턴을 위반하면 쿠키 동기화가 깨지므로 페이지 신설 시 반드시 본 표 기준으로 클라이언트를 선택할 것.

| 경로                               | 컨텍스트               | 사용 클라이언트                                           | 비고                                                                                                                                                            |
| ---------------------------------- | ---------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                                | RSC                    | (redirect 만, fetch 없음)                                 | 루트 → `/circles` redirect (`app/page.tsx`). Phase 2 별도 랜딩 페이지 검토                                                                                      |
| `/circles`                         | RSC                    | `lib/supabase/server.ts`                                  | **Discover 모드** (필터 미적용, HomeCategoryGrid + Promo + HorizontalStrip + Hourly) ↔ **Results 모드** (필터 활성, 사이드바 + 그리드) 자동 분기. Suspense 필수 |
| `/circles/[id]`                    | RSC                    | `lib/supabase/server.ts`                                  | 동적 라우트, Suspense 필수. 글로벌 헤더 + BottomNav hide (자체 floating 헤더)                                                                                   |
| `/circles/[id]/reports/[reportId]` | RSC                    | `lib/supabase/server.ts`                                  | 활동 리포트 상세 (T-034). 중첩 동적 세그먼트, 글로벌 헤더 + BottomNav 모두 hide                                                                                 |
| `/shuffle`                         | Client                 | (현재 더미 — Phase 1.2 T-009 시점 익명 세션 server fetch) | Tinder swipe deck, **상시 비로그인 허용** (게스트 디스커버리 진입점). 글로벌 헤더 + BottomNav hide                                                              |
| `/search`                          | RSC + Client           | `lib/supabase/server.ts` (RSC) + Client `draft` state     | 검색·카테고리·필터 진입 전용 (당근앱 패턴). 「N件のサークルを見る」 → `/circles?q&filter` navigate. 글로벌 헤더 hide (자체 sticky 검색 헤더)                    |
| `/notifications`                   | RSC                    | `lib/supabase/server.ts`                                  | 알림 페이지 (Phase 3 T-030 PWA 푸시 이력)                                                                                                                       |
| `/circles/[id]` 의 하트·참여 토글  | Client + Server Action | `lib/supabase/client.ts` + Server Action 내부 `server.ts` | `useOptimistic`                                                                                                                                                 |
| `/circles/new`                     | Client                 | `lib/supabase/client.ts`                                  | RHF + Zod 폼                                                                                                                                                    |
| `/favorites`                       | RSC                    | `lib/supabase/server.ts`                                  | 로그인 필수, Suspense                                                                                                                                           |
| `/compare`                         | RSC                    | `lib/supabase/server.ts`                                  | `?ids=` 쿼리, Suspense                                                                                                                                          |
| `/mypage`, `/mypage/circles`       | RSC                    | `lib/supabase/server.ts`                                  | Suspense                                                                                                                                                        |
| `/admin/circles`                   | RSC + Server Action    | `lib/supabase/server.ts`                                  | `is_admin()` 사전 검증                                                                                                                                          |
| `/auth/*` (기존)                   | Client + Server Action | 기존 스타터킷 유지                                        | —                                                                                                                                                               |
| `proxy.ts` (Edge)                  | Edge                   | `lib/supabase/proxy.ts`                                   | 인증 미들웨어, 변경 시 주의                                                                                                                                     |
