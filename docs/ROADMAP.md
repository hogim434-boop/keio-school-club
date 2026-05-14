# KCircle 개발 로드맵

慶應義塾大学 公認サークル 전용 소개 웹앱 — 2026년 4월 新歓 시즌 출시 목표.

## 개요

KCircle은 慶應義塾大学 신입생(특히 4월 新歓 시즌 입학자)을 위한 公認サークル 탐색·비교 웹앱으로 다음 기능을 제공합니다.

- **서클 탐색 (F001 / F002 / F004)**: 8종 카테고리 탭과 활동빈도·연회비·태그 다중 필터로 380개 이상의 公認サークル을 스크리닝.
- **서클 상세 + 참여 의사 (F003 / F012)**: 갤러리·태그·요약 카드 + 당근 모임 패턴의 하단 고정 액션 바와 「参加する」 채널 모달.
- **즐겨찾기 + 비교 (F007 / F008)**: 하트 토글로 저장한 서클을 최대 3개까지 횡열 비교.
- **콘텐츠 공급 파이프라인 (F005 / F006)**: 대표자가 서클을 등록하면 관리자가 公式 公認団体名簿 와 대조하여 승인·거절.
- **공인 신뢰도 (F010 / F011)**: @keio.jp 이메일 인증으로 `keio_verified` 자동 부여 + 관리자 수동 검증의 이중 게이트.

본 ROADMAP은 [`docs/PRD.md`](./PRD.md)의 단일 진실 공급원(SSOT)에 기반하며, PRD의 기능 ID(F001~F012)와 본 문서의 작업 ID(T-XXX)는 끝부분의 매핑 테이블을 통해 양방향으로 추적할 수 있습니다.

---

## 개발 워크플로우

1. **작업 계획**
   - 본 ROADMAP과 PRD를 함께 읽고 다음 우선순위 작업을 식별.
   - 신규 작업이 발생하면 적절한 Phase에 삽입하고 의존성·공수 컬럼을 갱신.

2. **작업 생성**
   - `/tasks` 디렉토리에 `XXX-description.md` 형식의 작업 파일을 생성 (예: `001-db-bootstrap.md`).
   - 작업 파일에는 다음 섹션을 포함:
     - **개요 / 관련 PRD 기능**
     - **선행 작업 (의존성)**
     - **변경 대상 파일·디렉토리**
     - **수락 기준 (Acceptance Criteria)**
     - **구현 단계 (체크리스트)**
     - **테스트 체크리스트** — API/비즈니스 로직 작업은 Playwright MCP 시나리오 필수 포함
   - 새 작업의 초기 상태는 모든 체크박스가 비어 있어야 하며, 완료 후 변경 사항 요약을 마지막에 추가.

3. **작업 구현**
   - 작업 파일의 명세서를 따라 구현.
   - Supabase 스키마 변경 전 `supabase` MCP `list_tables` 호출, 디버깅 시 `get_logs` / `get_advisors` 우선 사용.
   - 라이브러리 사용법 확인은 `context7` MCP 우선 사용.
   - API 연동·비즈니스 로직 구현 후 Playwright MCP로 E2E 검증.
   - 각 단계 완료 시 작업 파일의 체크박스 갱신, 중요한 단계 끝나면 중단 후 추가 지시 대기.

4. **로드맵 업데이트**
   - 작업 완료 시 본 로드맵의 작업 항목에 ✅ 마크 + `See: /tasks/XXX-xxx.md` 링크 추가.
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

### Phase 1.0 — 기반 정비 (T-001 ~ T-004)

| ID        | 작업                                     | 상태      | 공수 | 선행  | 관련 기능             |
| --------- | ---------------------------------------- | --------- | ---- | ----- | --------------------- |
| **T-001** | 디자인 토큰·shadcn 추가 컴포넌트 도입 ✅ | completed | 0.5d | —     | 전 페이지             |
| **T-002** | 공통 레이아웃·헤더·내비게이션 골격       | pending   | 1d   | T-001 | 메뉴 구조             |
| **T-003** | TypeScript 도메인 타입 정의              | pending   | 0.5d | —     | F001~F012             |
| **T-004** | Vitest + Playwright 테스트 러너 도입     | pending   | 1d   | T-002 | 모든 작업의 검증 기반 |

- **T-001: 디자인 토큰·shadcn 추가 컴포넌트 도입** ✅ — 우선순위
  - 慶應 濃紺(`#003366`) 액센트 컬러 토큰을 `tailwind.config.ts` + `app/globals.css` 에 추가.
  - 누락된 shadcn 컴포넌트 추가: `Form`, `Dialog`, `Sheet`, `Tabs`, `Table`, `Select`, `Textarea`, `Avatar`, `Skeleton`, `Toast`(sonner), `Alert`, `RadioGroup`.
  - `mcp__shadcn__get_add_command_for_items` 로 일괄 추가 명령 생성 후 적용.
  - 「サークル」「公認」 같은 일본어 라벨 처리를 위한 폰트 가중치 검증 (현재 Geist Sans 기본).
  - **완료 (2026-05-14)**: Tailwind v4 마이그레이션 동시 진행으로 (a) `app/globals.css` 의 `@theme inline` 에 `--color-keio-navy` + `--color-keio-navy-foreground` 토큰 추가(OKLCH, 라이트·다크 모드 보정값 포함), (b) shadcn 누락 12종(form/dialog/sheet/tabs/table/select/textarea/avatar/skeleton/sonner/alert/radio-group) 추가 + `react-hook-form` / `@hookform/resolvers` / `sonner` 의존성 자동 도입, (c) `app/layout.tsx` 에 `Noto_Sans_JP`(weight 400/500/700) 보조 폰트 + `<Toaster>` Provider 배치 + `lang="ja"`, (d) `globals.css` 에 `--font-sans` 폴백 체인(Geist → Noto JP → Hiragino → Yu Gothic → Meiryo). Tailwind 자체는 v3.4.1 → **v4.3.0** 으로 업그레이드되어 `tailwind.config.ts` 삭제 + `postcss.config.mjs` 단순화 + `tailwindcss-animate` → `tw-animate-css` 교체. `npm run build` + `npm run lint` 모두 통과.

- **T-002: 공통 레이아웃·헤더·내비게이션 골격**
  - `app/layout.tsx` 의 헤더를 PRD「메뉴 구조」기준으로 재구성: 로고 / サークルを探す / お気に入り / マイページ / 로그인 영역.
  - 모바일 하단 탭 바 또는 햄버거 메뉴 골격 (당근 모임 패턴 모바일 퍼스트).
  - 관리자 메뉴(`/admin/*`)는 클라이언트에서 role 확인 후 조건부 노출, 실제 보호는 서버 측에서 (T-019).
  - 빈 셸 페이지 추가: `/circles`, `/circles/[id]`, `/favorites`, `/compare`, `/mypage`, `/mypage/circles`, `/circles/new`, `/admin/circles`. 각각 「coming soon」 플레이스홀더 + Suspense 경계 설정 (cacheComponents 대응).

- **T-003: TypeScript 도메인 타입 정의**
  - `lib/types/database.ts` 에 PRD 「데이터 모델」 7개 테이블 + RPC 함수의 인터페이스 정의 (수동, T-006 이후 Supabase 자동 생성 타입으로 교체).
  - `lib/types/domain.ts` 에 `CircleSummary`(카드용) / `CircleDetail`(상세용) / `OfficialType` / `Category`(8종 리터럴) / `TagKind` 정의.
  - `lib/constants/category.ts`, `lib/constants/activity-frequency.ts` 에 일본어 라벨 매핑.

- **T-004: Vitest + Playwright 테스트 러너 도입**
  - `vitest`, `@vitest/ui`, `@testing-library/react`, `@testing-library/jest-dom` devDependency 추가.
  - `@playwright/test` 추가 + `playwright.config.ts` 생성 (baseURL `http://localhost:3000`, `webServer` 자동 기동).
  - `npm run test`, `npm run test:e2e` 스크립트 추가.
  - 스모크 e2e: 홈 페이지 200 응답 확인.
  - **근거**: PRD에 없으나 검증 이슈에서 「테스트 러너 부재」를 다수의 핵심 작업(F012 RPC, RLS, 인증 플로우)이 의존하므로 Phase 1 초반에 도입.

### Phase 1.1 — 핵심 UI (더미 데이터 기반) (T-010 ~ T-014)

> **순서 전환**: 입문자 동기부여와 당근 모임 UX 벤치마킹의 빠른 검증을 위해 **화면을 먼저** 만든다.
> 데이터는 `lib/dummy/circles.ts` 의 정적 배열을 사용하고, 인터랙션(하트 토글·「参加する」 RPC 호출)은 로컬 `useState` 또는 단순 외부 링크 오픈으로 모킹한다.
> 실제 Supabase fetch / Server Action / RPC 와이어업은 Phase 1.2 의 **T-009** 에서 일괄 교체한다.
> 더미 → 실제 데이터로의 전환 비용을 줄이기 위해 모든 컴포넌트는 **T-003 의 도메인 타입** (`CircleSummary` / `CircleDetail`) 을 인터페이스로 받도록 설계.

| ID        | 작업                                  | 상태    | 공수 | 선행         | 관련 기능        |
| --------- | ------------------------------------- | ------- | ---- | ------------ | ---------------- |
| **T-010** | 서클 카드 컴포넌트 + 상위 페이지      | pending | 1d   | T-001, T-003 | F002             |
| **T-011** | 서클 목록 페이지 + 카테고리 탭 + 필터 | pending | 2d   | T-010        | F001, F002, F004 |
| **T-012** | 서클 상세 페이지 + 갤러리             | pending | 2d   | T-010        | F003, F004       |
| **T-013** | 하단 고정 액션 바 + 즐겨찾기 토글 UI  | pending | 1d   | T-012        | F007             |
| **T-014** | 「参加する」 채널 모달 UI             | pending | 1d   | T-013        | F012             |

- **T-010: 서클 카드 컴포넌트 + 상위 페이지** — 우선순위
  - `lib/dummy/circles.ts` 작성: PRD 「더미 데이터 정책」 카테고리 분포에 맞춰 30건의 정적 배열 (`CircleSummary` 타입 준수 — T-003).
  - `components/circles/circle-card.tsx`: 커버 16:9 + 이름 + 카테고리 뱃지 + 태그 칩 5개 + 활동빈도 + `verified` 뱃지 + 하트 토글 슬롯. props 는 `CircleSummary` 만 받음.
  - `app/page.tsx`: 검색바 + 카테고리 탭 8개 가로 스크롤 + 인기 서클 6개(더미 배열에서 임의 6개) + 「サークルを探す」 CTA. Suspense 경계는 미리 적용 (cacheComponents 환경 대비).
  - **테스트**: 카드 30개 렌더 + 반응형 그리드 + 다크 모드 시각 회귀.

- **T-011: 서클 목록 페이지 + 카테고리 탭 + 필터**
  - `app/circles/page.tsx`: `searchParams` 사용 → Suspense 경계 필수.
  - 카테고리 탭 8종 (URL `?category=sports` 동기화), 필터: 활동빈도·연회비 범위·태그 다중·`official_type`.
  - **필터링은 더미 배열에 대한 클라이언트 측 `filter()` 로 모킹** (Phase 1.2 에서 Postgres `eq` / `overlap` / 범위 조건으로 교체).
  - 모바일: `Sheet` 컴포넌트로 bottom sheet 필터 / PC: 좌측 사이드바.
  - 페이지네이션은 단순 20개 단위 (MVP).
  - **테스트**: 필터 조합 5종에 대해 Playwright 로 결과 카드 수 검증.

- **T-012: 서클 상세 페이지 + 갤러리**
  - `app/circles/[id]/page.tsx`: 동적 라우트, Suspense 경계 필수. 더미 배열에서 `id` 로 find.
  - 커버 + 서클명 + verified 뱃지 + 태그 칩 5개 / 개요 + 활동빈도·연회비·요일·회원수·신입생비율 요약 카드 / 갤러리 (Dialog 로 전체화면).
  - `not-found.tsx` 추가: 더미 배열에 없는 `id` 는 404.
  - `view_count` 증가 로직은 Phase 1.2 T-009 에서 RPC `increment_view_count` 와이어업.

- **T-013: 하단 고정 액션 바 + 즐겨찾기 토글 UI**
  - PRD 「당근 모임 패턴」 하단 고정 액션 바 (모바일 safe-area inset 고려).
  - 좌측 「お気に入りに追加」 하트 토글 — **이 단계에서는 로컬 `useState` + `sessionStorage` 로만 작동**.
  - 실제 favorites 테이블 insert / delete + `useOptimistic` + `revalidateTag('favorites')` 는 Phase 1.2 T-009 에서 교체 (검증 이슈 **M-1** 대응).
  - 미로그인 사용자의 하트 탭 시 `/auth/login?next=/circles/{id}` 리디렉션 동선은 미리 와이어업 (인증 자체는 T-015).

- **T-014: 「参加する」 채널 모달 UI**
  - 우측 메인 CTA 버튼 (慶應 濃紺 `#003366`).
  - `Dialog`(PC) / `Sheet`(모바일) 로 채널 선택 모달 표시. 더미 데이터의 `contact_instagram` / `contact_x` / `contact_line` 중 입력된 채널만 노출.
  - 채널 선택 시 → 새 탭으로 외부 URL 오픈 (`rel="noopener noreferrer"` + `target="_blank"` 의무).
  - **RPC `increment_inquiry_count` 호출 + Server Action + `revalidatePath` 는 Phase 1.2 T-009 에서 와이어업** (검증 이슈 **H-NEW-1** 대응).
  - 미로그인 동선만 미리 와이어업: 비로그인 사용자 클릭 → `/auth/login?next=/circles/{id}` 리디렉션.
  - **본 단계 테스트** (Playwright):
    - 모달이 등록된 채널만 노출 (3개 / 1개 / 0개 케이스).
    - Instagram 선택 → 새 탭이 instagram.com 도메인으로 열림.

### Phase 1.2 — DB 기반 구축 + UI 와이어업 (T-005 ~ T-009)

> Phase 1.1 에서 만든 UI 가 사용 중인 더미 데이터를 **실제 Supabase fetch / Server Action / RPC** 로 교체한다.
> 스키마 → RLS → RPC → Storage 가 모두 준비된 후, 마지막 **T-009** 에서 시드 적재와 UI 와이어업을 한꺼번에 처리하여 정합성 확인 비용을 한 번에 모은다.

| ID        | 작업                                                        | 상태    | 공수 | 선행                        | 관련 기능              |
| --------- | ----------------------------------------------------------- | ------- | ---- | --------------------------- | ---------------------- |
| **T-005** | DB 스키마 마이그레이션 1차 (7개 테이블)                     | pending | 1d   | T-003                       | 전 기능                |
| **T-006** | RLS 정책 분리·`is_admin()` 헬퍼                             | pending | 1d   | T-005                       | F005, F006, F007, F010 |
| **T-007** | RPC `increment_inquiry_count` + `inquiry_events` 디바운스   | pending | 0.5d | T-005, T-006                | F012                   |
| **T-008** | Storage 버킷·정책·EXIF 제거                                 | pending | 0.5d | T-005                       | F003, F005             |
| **T-009** | 시드 30개 + 태그 10종 + **UI 와이어업 (더미 → 실제 fetch)** | pending | 1.5d | T-005, T-008, T-010 ~ T-014 | F002, F004, F007, F012 |

- **T-005: DB 스키마 마이그레이션 1차** — 우선순위
  - `supabase` MCP `list_tables` 로 기존 상태(`instruments` 만 존재) 확인 후, `apply_migration` 으로 7개 테이블 생성:
    `profiles`, `circles`, `tags`, `circle_tags`, `circle_images`, `favorites`, `shinkan_events`.
  - PRD 「circles」 필드 + 검증 이슈 H-NEW-3 보강 컬럼 포함:
    - `rejection_reason text` / `updated_at timestamptz` / `pledge_accepted_at timestamptz` / `reviewed_by uuid` / `reviewed_at timestamptz` / `slug text unique` / `submission_note text`.
  - `circles` CHECK 제약: `contact_instagram`, `contact_x`, `contact_line` 중 1개 이상 NOT NULL.
  - `updated_at` 트리거(`moddatetime`) 적용.
  - `profiles` 는 `auth.users` insert 트리거로 자동 생성.
  - **테스트**: `supabase` MCP `execute_sql` 로 모든 테이블 INSERT 더미 1건 → SELECT 검증.

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

- **T-008: Storage 버킷·정책·EXIF 제거**
  - 검증 이슈 **M-3** 대응: `circles-public` 퍼블릭 버킷 생성, path prefix `circles/{circle_id}/...` 로 RLS 적용 (owner / admin 만 write).
  - 업로드 시 EXIF 제거 (Sharp 또는 클라이언트 측 Canvas) — 위치 정보 노출 방지.
  - 이미지 최대 크기 4MB, 형식 `image/jpeg`, `image/png`, `image/webp` 만 허용.

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
  - **테스트**: `test@keio.jp` 로 가입 시 verified, `test@gmail.com` 으로 가입 시 unverified.

- **T-016: 마이페이지 + 내 서클 관리 페이지**
  - `app/mypage/page.tsx`: 표시명·이메일·verified 뱃지·등록 서클 수 카드 + 「登録サークルを管理」 링크.
  - `app/mypage/circles/page.tsx`: 내 서클 목록 (status 뱃지 「審査中」/「公開中」/「却下」 + 거절 사유 표시).
  - 둘 다 `lib/supabase/server.ts` 사용 + Suspense 경계.

- **T-017: 즐겨찾기 페이지**
  - `app/favorites/page.tsx`: 로그인 필수 (미로그인 시 `/auth/login?next=/favorites` 리디렉션).
  - 카드 그리드 + 카드별 하트 해제 버튼 + 비교 체크박스 (최대 3개, 초과 시 `toast` 경고).
  - 「比較する」 버튼 → `/compare?ids=a,b,c` 로 이동 (Phase 1 후반 stretch goal — T-024 에서 실제 비교 페이지 구현).

- **T-018: 서클 등록 폼 + URL 화이트리스트 검증** — 우선순위
  - `app/circles/new/page.tsx` (Client Component, RHF + Zod).
  - 필드: 서클명·카테고리·`official_type`·활동빈도·연회비·태그(최대 5개)·커버 이미지·연락처(Instagram/X/LINE 중 1개 이상)·誓約 동의 체크.
  - **검증 이슈 C-NEW-2 대응**: Zod 스키마에 호스트 화이트리스트 적용
    - `contact_instagram`: `instagram.com`
    - `contact_x`: `x.com` / `twitter.com`
    - `contact_line`: `line.me` / `lin.ee`
    - 그 외 도메인 입력 시 거부 + 「公式 SNS の URL を入力してください」 메시지.
  - 「個人アカウントではなく、サークル公式アカウントのURLを入力してください」 안내 문구 노출.
  - 誓約 체크 시 `pledge_accepted_at = now()` 저장.
  - 제출 후 status='pending' + 「審査中」 안내 페이지로 이동.
  - **테스트 체크리스트** (Playwright MCP):
    - 화이트리스트 외 URL (`evil.example.com/instagram`) 입력 시 폼 거부.
    - 誓約 체크 없이 제출 시 거부.
    - 정상 제출 후 `/mypage/circles` 에 「審査中」 뱃지 노출.

### Phase 1.4 — 관리자·알림·QA (T-019 ~ T-022)

| ID        | 작업                                 | 상태    | 공수 | 선행                       | 관련 기능 |
| --------- | ------------------------------------ | ------- | ---- | -------------------------- | --------- |
| **T-019** | 관리자 승인 큐 페이지                | pending | 1.5d | T-005, T-006, T-018        | F006      |
| **T-020** | 이메일 알림 인프라 (Resend)          | pending | 1.5d | T-019                      | F006 운영 |
| **T-021** | 다중 admin 부여 + 신청 일시정지 토글 | pending | 0.5d | T-019                      | 운영      |
| **T-022** | Phase 1 통합 E2E 테스트              | pending | 1.5d | T-014, T-018, T-019, T-020 | 전 기능   |

- **T-019: 관리자 승인 큐 페이지**
  - `app/admin/circles/page.tsx`: `is_admin()` 헬퍼로 RSC 단에서 권한 확인, 미인가 시 홈으로 리디렉션.
  - pending 서클 목록 (신청일 순) + 인라인 미리보기 (이름·카테고리·`official_type`·대표자·대표자 이메일·`keio_verified`·제출일·`submission_note`).
  - 「承認」 / 「却下」 버튼 → Server Action 으로 status 갱신 + `reviewed_by` / `reviewed_at` 기록. 거절 시 `rejection_reason` 필수 입력.
  - 처리 후 `revalidatePath('/admin/circles')` + 오너에게 이메일 알림 트리거 (T-020).
  - **테스트**: 일반 사용자가 `/admin/circles` 접근 시 홈으로 리디렉션.

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
    - [ ] 시드 30개 서클 + 태그 10종 모두 approved.
    - [ ] 일본어 UI 라벨 검수 (PRD 「일본어 UI 텍스트 예시」 표 기준).
    - [ ] 모든 페이지에 적절한 `<title>` / OG 메타 태그.
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

| PRD 기능             | 설명                     | 주관 작업                           | 보조 작업                                 |
| -------------------- | ------------------------ | ----------------------------------- | ----------------------------------------- |
| **F001** 검색·필터   | 카테고리 탭 + 다중 필터  | T-011 (UI), T-009 (와이어업)        | T-003 (타입)                              |
| **F002** 카드 목록   | 카드 + 그리드            | T-010, T-011 (UI), T-009 (와이어업) | —                                         |
| **F003** 상세 정보   | 갤러리 + 요약 카드       | T-012 (UI), T-009 (와이어업)        | T-008 (이미지 정책)                       |
| **F004** 태그 시스템 | 칩 10종                  | T-010, T-011, T-012                 | T-009 (시드)                              |
| **F005** 등록 폼     | RHF + Zod                | T-018                               | T-008 (이미지)                            |
| **F006** 승인 큐     | admin 페이지             | T-019                               | T-020 (알림), T-021 (운영)                |
| **F007** 즐겨찾기    | 하트 토글 + 페이지       | T-013 (UI), T-017, T-009 (와이어업) | T-006 (RLS)                               |
| **F008** 비교        | 횡열 테이블              | T-024                               | T-017 (송출)                              |
| **F010** 인증        | 회원가입·로그인·verified | T-015                               | 기존 스타터킷 활용                        |
| **F011** 마이페이지  | 프로필 + 내 서클 관리    | T-016                               | T-018 (등록 동선)                         |
| **F012** 참여 의사   | 채널 모달 + RPC          | T-014 (UI), T-009 (RPC 와이어업)    | T-007 (RPC 정의), T-025 (Phase 2 metrics) |

---

## 페이지 ↔ Supabase 3-context 매핑

> CLAUDE.md 의 3-context 패턴을 위반하면 쿠키 동기화가 깨지므로 페이지 신설 시 반드시 본 표 기준으로 클라이언트를 선택할 것.

| 경로                              | 컨텍스트               | 사용 클라이언트                                           | 비고                               |
| --------------------------------- | ---------------------- | --------------------------------------------------------- | ---------------------------------- |
| `/`                               | RSC                    | `lib/supabase/server.ts`                                  | 인기 서클 fetch, Suspense 필수     |
| `/circles`                        | RSC                    | `lib/supabase/server.ts`                                  | `searchParams` 사용, Suspense 필수 |
| `/circles/[id]`                   | RSC                    | `lib/supabase/server.ts`                                  | 동적 라우트, Suspense 필수         |
| `/circles/[id]` 의 하트·참여 토글 | Client + Server Action | `lib/supabase/client.ts` + Server Action 내부 `server.ts` | `useOptimistic`                    |
| `/circles/new`                    | Client                 | `lib/supabase/client.ts`                                  | RHF + Zod 폼                       |
| `/favorites`                      | RSC                    | `lib/supabase/server.ts`                                  | 로그인 필수, Suspense              |
| `/compare`                        | RSC                    | `lib/supabase/server.ts`                                  | `?ids=` 쿼리, Suspense             |
| `/mypage`, `/mypage/circles`      | RSC                    | `lib/supabase/server.ts`                                  | Suspense                           |
| `/admin/circles`                  | RSC + Server Action    | `lib/supabase/server.ts`                                  | `is_admin()` 사전 검증             |
| `/auth/*` (기존)                  | Client + Server Action | 기존 스타터킷 유지                                        | —                                  |
| `proxy.ts` (Edge)                 | Edge                   | `lib/supabase/proxy.ts`                                   | 인증 미들웨어, 변경 시 주의        |
