# T-003: RLS 헬퍼 함수 `is_circle_staff(circle_id)`

| 항목 | 내용 |
|---|---|
| **Phase** | 1-1 |
| **우선순위** | High (모든 RLS 정책의 베이스, 1회만 만들면 재사용) |
| **예상 소요** | 1일 |
| **의존성** | — (Phase 0 `circle_members` 는 T-005 에서 별도로 만들지만, 본 헬퍼는 함수 정의만 먼저 둠) |
| **관련 기능 ID** | F072·F074 |
| **PRD 참조** | PRD 5-7 F074 · PRD 12-3 「F072 권한 3단계 RLS 복잡도」 |

## 산출물

- 마이그레이션 1개: `YYYYMMDD_helper_is_circle_staff.sql`
- 함수 `public.is_circle_staff(circle_id uuid) RETURNS boolean`
- `public.is_admin()` 헬퍼는 기존 Phase 0 코드에 있다면 재사용, 없으면 함께 추가

## 검증 기준

- `SELECT public.is_circle_staff('...')` 실행 시 boolean 반환
- T-005 에서 `circle_members` 만든 후 owner/staff 만 true 반환 확인
- 모든 후속 RLS 정책 (T-004 의 events_write 등) 이 본 함수를 호출하도록 정합

## 세부 작업

- [ ] `is_circle_staff(circle_id uuid) RETURNS boolean LANGUAGE sql STABLE` 정의
- [ ] `SECURITY DEFINER` 또는 `SECURITY INVOKER` 결정 — invoker 권장 (단, `circle_members` 에 SELECT GRANT 필요)
- [ ] `is_admin()` 헬퍼 존재 여부 확인, 없으면 추가 (`auth.jwt() ->> 'role' = 'admin'` 또는 별도 admin 테이블)
- [ ] GRANT EXECUTE to authenticated, anon
- [ ] Supabase MCP 로 `SELECT public.is_circle_staff('test-uuid')` 호출 → false 반환 확인

## 위험·주의사항

- ⚠️ **`circle_members` 가 아직 없는 시점** — 본 헬퍼는 T-005 의 `circle_members` 를 참조하므로 함수 정의를 「테이블 존재 가정」 으로 작성. T-005 마이그레이션 후 실 동작.
- ⚠️ **STABLE 마킹** — `STABLE` 마킹해야 같은 트랜잭션 안에서 결과 캐싱. PRD 8-3 의 정책에서 EXISTS 서브쿼리 대신 함수 호출 형태가 가독성 ↑.
- ⚠️ **순환 의존** — `circle_members` 의 RLS 가 본 함수를 참조하면 안 됨 (무한 루프). `circle_members` 의 SELECT 정책은 직접 `user_id = auth.uid()` 등으로 작성.

## 코드 스니펫

```sql
CREATE OR REPLACE FUNCTION public.is_circle_staff(_circle_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.circle_members
    WHERE circle_id = _circle_id
      AND user_id = auth.uid()
      AND role IN ('owner','staff')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_circle_staff(uuid) TO authenticated, anon;
```

## 테스트 체크리스트

- [ ] 함수 존재 확인 (`SELECT proname FROM pg_proc WHERE proname='is_circle_staff'`)
- [ ] anon 으로 호출 시 false (auth.uid IS NULL)
- [ ] 본인 user 로 호출 시 — `circle_members` 에 row 있으면 true
