# T-004: 이벤트 코어 마이그레이션 (events·interests·rsvps·change_logs·comments)

| 항목 | 내용 |
|---|---|
| **Phase** | 1-1 기반 인프라 |
| **우선순위** | High (Phase 1-3 전체의 길목) |
| **예상 소요** | 3일 |
| **의존성** | T-003 (`is_circle_staff`) |
| **관련 기능 ID** | F030·F033·F045·F048·F039 |
| **PRD 참조** | PRD 8-1 (events / event_interests / event_rsvps / event_change_logs / event_comments) · PRD 8-3 RLS · PRD 8-4 GRANT |

## 산출물

- 마이그레이션 5개 (1파일 = 1테이블 원칙):
  - `YYYYMMDD_events.sql`
  - `YYYYMMDD_event_interests.sql`
  - `YYYYMMDD_event_rsvps.sql`
  - `YYYYMMDD_event_change_logs.sql`
  - `YYYYMMDD_event_comments.sql`
- 각 파일에 「테이블 + RLS + GRANT」 묶음 (인덱스는 T-007 에서 일괄 추가)

## 검증 기준

- Supabase MCP `list_tables` 에서 5개 테이블 모두 노출
- `get_advisors` 경고 0건 (특히 GRANT 누락 경고 [[circles-column-grant-trap]])
- 본인 user 로 `event_interests` INSERT 가능, 타인 row UPDATE 불가
- 운영진 user 로 `events` UPDATE 가능, 일반 사용자는 불가
- 공개 이벤트(`visibility='public'`) 는 anon SELECT 가능

## 세부 작업

### events 테이블 (PRD 8-1)

- [ ] 컬럼: id·circle_id·created_by·title·description·starts_at·ends_at·location·cover_image_url·category·visibility·is_all_day
- [ ] **v2.1 컬럼 6개**: rsvp_mode (light/strict) · capacity · rsvp_deadline · requires_approval · cancelled_at · cancellation_reason
- [ ] RLS: SELECT (public OR auth) / INSERT·UPDATE·DELETE (`is_circle_staff` 또는 `is_admin`)
- [ ] GRANT: SELECT to authenticated, anon · INSERT/UPDATE/DELETE to authenticated · v2.1 컬럼 명시 GRANT UPDATE

### event_interests (가벼움 모드)

- [ ] 복합 PK (event_id, user_id) · status CHECK('interested','going') · show_profile DEFAULT false
- [ ] RLS: SELECT (count 만 anon, 본인 row 는 본인) / INSERT·UPDATE·DELETE (본인만)
- [ ] GRANT: SELECT/INSERT/UPDATE/DELETE to authenticated, SELECT to anon

### event_rsvps (강한 모드)

- [ ] 복합 PK · status CHECK 6종 · waiting_position · approved_at · approved_by · rejected_at · rejection_reason · cancelled_at
- [ ] RLS: SELECT (본인 또는 owner/staff) / 본인 row 모든 권한 + staff 의 UPDATE (승인) 별도 정책
- [ ] GRANT: 동일

### event_change_logs

- [ ] 컬럼: id·event_id·changed_by·field_name·old_value·new_value·notified_at·created_at
- [ ] RLS: SELECT (이벤트 공개 범위 따름) / INSERT (운영진만, T-021 에서 Server Action 으로 작성)
- [ ] GRANT: SELECT to authenticated, anon · INSERT to authenticated

### event_comments

- [ ] 컬럼: id·event_id·user_id·parent_id·body·created_at
- [ ] RLS: SELECT (공개) / INSERT (인증) / UPDATE·DELETE (본인 + admin)
- [ ] GRANT: 동일

## 위험·주의사항

- ⚠️ **컬럼 GRANT 함정** [[circles-column-grant-trap]] — RLS 통과해도 GRANT 없으면 `42501` 오류. v2.1 신규 컬럼 6개 (`rsvp_mode` 등) 에 `GRANT UPDATE (rsvp_mode, capacity, ...) ON public.events TO authenticated;` 명시.
- ⚠️ **`event_rsvps` 정책 2개 중첩** — 본인 row 모든 권한 + staff 의 승인 UPDATE 가 같은 row 에 둘 다 적용 가능. PostgreSQL 의 RLS 는 OR 조합이므로 의도된 동작.
- ⚠️ **`event_change_logs.notified_at` 미발송 인덱스** — T-007 에서 partial index 추가 예정 (`WHERE notified_at IS NULL`).
- ⚠️ **F045 트리거는 T-023 에서 별도 추가** — 본 Task 에서는 테이블만, 트리거는 Phase 1-3 에서.

## 코드 스니펫 (참고)

```sql
-- YYYYMMDD_events.sql 일부
CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id uuid NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text DEFAULT '',
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  location text,
  cover_image_url text,
  category text,
  visibility text NOT NULL CHECK (visibility IN ('public','members')) DEFAULT 'public',
  is_all_day boolean NOT NULL DEFAULT false,
  -- v2.1 컬럼
  rsvp_mode text NOT NULL CHECK (rsvp_mode IN ('light','strict')) DEFAULT 'light',
  capacity integer,
  rsvp_deadline timestamptz,
  requires_approval boolean NOT NULL DEFAULT false,
  cancelled_at timestamptz,
  cancellation_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY events_select ON public.events FOR SELECT
  USING (visibility = 'public' OR auth.uid() IS NOT NULL);

CREATE POLICY events_write ON public.events FOR ALL
  USING (public.is_circle_staff(circle_id) OR public.is_admin())
  WITH CHECK (public.is_circle_staff(circle_id) OR public.is_admin());

-- GRANT (컬럼 GRANT 함정 회피)
GRANT SELECT ON public.events TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON public.events TO authenticated;
-- v2.1 컬럼 명시
GRANT UPDATE (rsvp_mode, capacity, rsvp_deadline, requires_approval, cancelled_at, cancellation_reason)
  ON public.events TO authenticated;
```

## 테스트 체크리스트

- [ ] Supabase MCP `apply_migration` 5개 차례로 적용
- [ ] `list_tables` 에서 5개 모두 확인
- [ ] `get_advisors` 경고 0건
- [ ] dev 에서 본인 user 로 `event_interests` INSERT 정상
- [ ] 운영진 user 로 `events` INSERT 정상 (수동 SQL)
- [ ] 비운영진 user 로 `events` INSERT 시 `42501` 또는 RLS 오류 확인 (의도된 거부)
