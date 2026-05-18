# T-005 — DB 스키마 마이그레이션 1차

> 본 파일은 ROADMAP 워크플로우 (line 35~42) 의 「복잡한 작업 (DB 마이그레이션 등) 만 작업 파일 backfill」 정책에 따라 만든 T-005 의 상세 명세서. ROADMAP `docs/ROADMAP.md` 의 T-005 본문은 요약, 본 파일이 SSOT.

---

## 개요 / 관련 PRD 기능

- **목표**: Phase 1.2 출발점으로, 현재 `instruments` 데모 테이블 1개만 있는 Supabase DB 에 **핵심 10개 테이블 + 8개 enum + 트리거 + 인덱스 + RLS enable (기본 deny)** 을 한꺼번에 적용. T-006/T-007/T-009/T-034 의 선행 작업을 모두 해소.
- **관련 PRD 기능**: 전 기능 (F001~F012, F-NEW 활동 리포트).
- **관련 ROADMAP Task**:
  - 선행: T-003 ✅ (도메인 타입 — `lib/types/database.ts` SSOT)
  - 후행: T-006 (RLS 세분화) / T-007 (RPC) / T-008 (Storage) / T-009 (시드+와이어업) / T-034 (활동 리포트, UI 완료)

---

## 선행 작업 (의존성)

- T-003 (TypeScript 도메인 타입 정의) ✅ — `lib/types/database.ts` 가 마이그레이션 SSOT.
- 외부 의존성 없음. Supabase 프로젝트 `wmiaxjgitpahribjrdyh` 활성 상태 (mcp `list_tables` 확인).

---

## 변경 대상 파일·디렉토리

### 신규 작성

- `docs/tasks/T-005-db-schema-migration.md` — 본 파일.

### Supabase DB (MCP `apply_migration`)

- 5건 마이그레이션 (M-005-01 ~ M-005-05). `supabase/` CLI 디렉터리 안 만듦 (사용자 결정).

### 갱신

- `lib/types/database.ts` — `activity_reports` + `activity_report_images` 테이블 정의 추가, `circles.Row` 에 신규 컬럼 5개 추가 (`description`, `activity_days`, `member_count`, `recruitment_status`, `activity_time_band[]`). `freshmen_ratio` 없음 재확인. `mcp__supabase__generate_typescript_types` 결과로 무손실 교체.
- `docs/ROADMAP.md` — T-005 본문 「7개 테이블」 → 「10개 테이블 + 8 enum」, `See:` 링크 추가, T-005 상태 `pending → completed` + ✅.

---

## 수락 기준 (Acceptance Criteria)

- [ ] `mcp__supabase__list_tables` 가 **11개 테이블** 반환 (instruments + 10 신규: profiles, circles, tags, circle_tags, circle_images, favorites, shinkan_events, activity_reports, activity_report_images, inquiry_events, app_settings).
- [ ] `mcp__supabase__list_migrations` 가 M-005-01 ~ M-005-05 = **5건** 반환.
- [ ] **8개 enum** 모두 `pg_type` 에 존재 — SQL: `SELECT typname FROM pg_type WHERE typtype = 'e' AND typnamespace = 'public'::regnamespace`.
- [ ] `circles` CHECK 제약 검증: 연락처 3개(instagram/x/line) 모두 NULL → INSERT 실패 (`23514`).
- [ ] `profiles` auth.users 트리거 동작: 테스트 계정 가입 시 `profiles` 행 자동 생성.
- [ ] `updated_at` 트리거 동작: `circles` UPDATE 시 `updated_at` 자동 갱신 (moddatetime).
- [ ] 모든 신규 테이블 **RLS enabled** (T-006 에서 세분화). 현재는 anon select 모두 차단.
- [ ] `lib/types/database.ts` 가 `mcp__supabase__generate_typescript_types` 결과와 무손실 일치.
- [ ] `mcp__supabase__get_advisors` 의 security 항목 — RLS 정책 미정의 경고는 T-006 까지 허용, 그 외 critical 0건.
- [ ] `npm run build` + `npm run lint` + `npm run test` 모두 통과.

---

## 구현 단계 (체크리스트)

### Step 0: 사전 확인

- [ ] 현재 `instruments` 테이블 정리 — 튜토리얼 데모용, T-005 와 무관. **삭제하지 않음** (기본값: 유지, 튜토리얼 회귀 우려).

### Step 1: M-005-01 확장 + Enum (apply_migration name=`005_01_extensions_enums`)

- [ ] `CREATE EXTENSION IF NOT EXISTS moddatetime SCHEMA extensions` (현재 미설치 — mcp `list_extensions` 확인).
- [ ] 8개 enum 생성 (lib/constants/\* 와 single source of truth):
  - `category_enum` (8종, `lib/constants/category.ts` SSOT)
  - `official_type_enum` (5종, UI 는 2종만 노출 — 정책 박스 🏷️)
  - `activity_frequency_enum` (3종)
  - `circle_status_enum` (3종: pending/approved/rejected)
  - `tag_kind_enum` (4종)
  - `recruitment_status_enum` (3종, **신규**)
  - `activity_time_band_enum` (3종, **신규**)
  - `activity_report_type_enum` (5종, **신규**)

### Step 2: M-005-02 profiles + circles 코어 (apply_migration name=`005_02_profiles_circles`)

- [ ] `profiles` 테이블 (id FK auth.users, display_name, keio_verified, role, created_at) + `auth.users` insert 트리거 (`handle_new_user`, SECURITY DEFINER, ON CONFLICT DO NOTHING).
- [ ] `circles` 테이블 — 모든 컬럼:
  - 기본 ID/메타: id (uuid PK default uuid_generate_v4), name, category, official_type, status (default pending), activity_frequency, cover_image_url, owner_id (nullable FK → profiles.id ON DELETE SET NULL), created_at, updated_at, slug UNIQUE
  - 카운터: view_count (default 0), inquiry_count (default 0)
  - 연락처: contact_instagram, contact_x, contact_line + **CHECK (3개 중 1개 이상 NOT NULL)**
  - 검토: rejection_reason, pledge_accepted_at, reviewed_by (FK → profiles), reviewed_at, submission_note
  - **annual_fee_yen** (DB 보존 정책 💴 — UI 만 제거됨)
  - **신규 5컬럼**: `description text NOT NULL DEFAULT ''`, `activity_days text NOT NULL DEFAULT ''`, `member_count int NOT NULL DEFAULT 0`, `recruitment_status recruitment_status_enum NOT NULL DEFAULT 'open'`, `activity_time_band activity_time_band_enum[] NOT NULL DEFAULT '{}'`
  - **freshmen_ratio 컬럼은 만들지 않음** (DB 도 정리).
- [ ] `updated_at` 트리거 (moddatetime, extensions 스키마).

### Step 3: M-005-03 circles 위성 5종 (apply_migration name=`005_03_circle_satellite`)

- [ ] `tags` (id serial PK, slug text UNIQUE NOT NULL, label_ja text NOT NULL, kind tag_kind_enum NOT NULL)
- [ ] `circle_tags` (circle_id FK CASCADE, tag_id FK CASCADE, composite PK)
- [ ] `circle_images` (id uuid PK, circle_id FK CASCADE NOT NULL, image_url text NOT NULL, sort_order int NOT NULL DEFAULT 0)
- [ ] `favorites` (user_id FK auth.users CASCADE NOT NULL, circle_id FK CASCADE NOT NULL, created_at timestamptz DEFAULT now, composite PK (user_id, circle_id))
- [ ] `shinkan_events` (id uuid PK, circle_id FK CASCADE NOT NULL, title text NOT NULL, event_date date NOT NULL, is_online bool NOT NULL DEFAULT false)

### Step 4: M-005-04 활동 리포트 (apply_migration name=`005_04_activity_reports`) — T-034 의존 해소

- [ ] `activity_reports`:
  - id uuid PK default uuid_generate_v4, circle_id FK circles CASCADE NOT NULL, title text NOT NULL, content text NOT NULL (1-2줄 미리보기), body text NOT NULL (풀 텍스트), image_url text (썸네일, images[0] mirror), location text, activity_type activity_report_type_enum, created_at timestamptz NOT NULL DEFAULT now
- [ ] `activity_report_images` (`circle_images` 패턴 일관성):
  - id uuid PK, report_id FK activity_reports CASCADE NOT NULL, image_url text NOT NULL, sort_order int NOT NULL DEFAULT 0
- [ ] 인덱스: `CREATE INDEX activity_reports_circle_created ON activity_reports (circle_id, created_at DESC)` — 「掲示板」 탭 정렬 최적화.

### Step 5: M-005-05 보조 + 인덱스 + RLS enable (apply_migration name=`005_05_misc_indexes_rls`)

- [ ] `inquiry_events` (user_id uuid NOT NULL, circle_id FK circles CASCADE NOT NULL, day date NOT NULL, composite PK (user_id, circle_id, day)) — T-007 RPC 디바운스용. user_id 는 FK 없이 (anon 호환).
- [ ] `app_settings` (key text PK, value text NOT NULL) — T-021 운영 토글.
- [ ] 추가 인덱스:
  - `CREATE INDEX circles_status_created ON circles (status, created_at DESC) WHERE status = 'approved'` (partial)
  - `CREATE INDEX circles_category ON circles (category)`
  - `CREATE INDEX favorites_user_created ON favorites (user_id, created_at DESC)`
  - `CREATE INDEX shinkan_events_circle_date ON shinkan_events (circle_id, event_date)`
- [ ] 모든 신규 테이블 (10개) `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` (정책 없이 — T-006 에서 세분화).

### Step 6: 타입 동기화

- [ ] `mcp__supabase__generate_typescript_types` 실행.
- [ ] 결과를 `lib/types/database.ts` 와 비교 — 차이가 있다면 수동 정의를 자동 생성으로 무손실 교체.
- [ ] `npm run build` + `npm run lint` + `npm run test` 통과.

### Step 7: 검증

- [ ] `mcp__supabase__list_tables` 출력 캡처 — 11개 테이블 확인.
- [ ] `mcp__supabase__get_advisors type="security"` — RLS 정책 미정의 경고만 허용.
- [ ] `mcp__supabase__get_advisors type="performance"` — 불필요/누락 인덱스 0건.

### Step 8: ROADMAP 갱신 + commit

- [ ] T-005 상태 `pending → completed` + ✅ 마크.
- [ ] T-005 본문에 「**완료 (YYYY-MM-DD)**: 5건 마이그레이션 적용, 10 테이블 + 8 enum + RLS enabled. activity_reports 추가 (T-034 의존 해소). lib/types/database.ts 자동 생성으로 교체.」 추가.
- [ ] 「See: `docs/tasks/T-005-db-schema-migration.md`」 링크 추가.
- [ ] commit: `✨ feat(db): T-005 DB 스키마 마이그레이션 1차 — 10 tables + 8 enums + RLS enable`

---

## 테스트 체크리스트

### 단위 (Vitest)

- [ ] `lib/types/database.ts` 의 `Tables<'circles'>` 가 신규 5컬럼 모두 포함 (타입 컴파일 검증).
- [ ] `Tables<'activity_reports'>` 가 `lib/dummy/activity-reports.ts` shape 와 일치 (타입 컴파일 검증).

### E2E (Playwright)

- [ ] 본 작업은 DB 만 변경 — UI 회귀 없음 (더미 데이터 그대로 사용).
- [ ] T-009 시점에 실제 fetch 와이어업 후 E2E 회귀 재실행.

### SQL 직접 (mcp `execute_sql`)

- [ ] `SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'` = 11 (instruments + 10 신규)
- [ ] `SELECT count(*) FROM pg_type WHERE typtype = 'e' AND typnamespace = 'public'::regnamespace` = 8
- [ ] `SELECT relname FROM pg_class WHERE relrowsecurity = true AND relkind = 'r'` 가 10개 신규 테이블 모두 포함.

---

## 위험 / 롤백

- **위험 1**: enum 정의 후 값 추가/제거는 ALTER TYPE 비용 큰 작업. lib/constants/\* 와 single source 일치를 마이그레이션 시점에 한 번 더 점검.
- **위험 2**: `circles.owner_id` nullable FK 로 둠 — 시드 DUMMY_OWNER UUID 가 auth.users 에 없을 가능성. T-009 시드 시점에 NULL 로 INSERT 또는 별도 seed user 생성.
- **위험 3**: `activity_reports` 가 별도 테이블 + `activity_report_images` 분리 → lib/dummy/activity-reports.ts 의 `images: { ... }[]` shape 가 T-009 시드에서 두 테이블로 분리 INSERT 필요. dummy helper 시그니처는 유지 (UI 무손실).
- **위험 4**: RLS enable 후 anon select 차단 — T-006 까지는 service_role 키 또는 SECURITY DEFINER 함수로만 접근 가능. UI 는 더미 데이터 사용 중이라 회귀 없음 (T-009 와이어업 전 T-006 RLS 정책 세분화 필수).
- **롤백 전략**: Supabase MCP `apply_migration` 은 자동 롤백 없음. 5단계 분할 덕분에 부분 적용 시 다음 단계만 재시도 가능. 전체 롤백 시 reverse SQL (`DROP TABLE ... CASCADE` + `DROP TYPE ...`) 을 별도 마이그레이션으로 적용.

---

## 참조 SSOT

- `lib/types/database.ts` — Database 인터페이스 (수동 → 자동 생성으로 교체).
- `lib/types/domain.ts` — CircleDetail, ActivityReport.
- `lib/constants/*` — 8개 enum SSOT.
- `lib/dummy/circles.ts`, `lib/dummy/activity-reports.ts` — T-009 시드 ground truth shape.
- `docs/PRD.md` — 「데이터 모델」 절.
- `docs/ROADMAP.md` — 정책 박스 (💴 annual_fee_yen 보존, 🏷️ official_type DB 5종/UI 2종, 🌞 다크모드 제거, 🗺️ Discover IA).
