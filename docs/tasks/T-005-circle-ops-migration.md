# T-005: 동아리 운영 마이그레이션 (circle_galleries · circle_members)

| 항목 | 내용 |
|---|---|
| **Phase** | 1-1 |
| **우선순위** | High |
| **예상 소요** | 1.5일 |
| **의존성** | T-003 |
| **관련 기능 ID** | F021 (갤러리) · F072 (권한 3단계) |
| **PRD 참조** | PRD 8-1 (circle_galleries, circle_members) |

## 산출물

- `YYYYMMDD_circle_galleries.sql`
- `YYYYMMDD_circle_members.sql`

## 검증 기준

- `list_tables` 2개 확인
- T-003 헬퍼 `is_circle_staff` 가 `circle_members` 를 정상 참조
- owner user 추가 → `is_circle_staff(...)` true 반환

## 세부 작업

### circle_galleries

- [ ] 컬럼: id·circle_id·uploaded_by·image_url·caption·taken_at·created_at
- [ ] RLS: SELECT (public) / INSERT·UPDATE·DELETE (`is_circle_staff`)
- [ ] GRANT: SELECT to authenticated, anon · INSERT/UPDATE/DELETE to authenticated
- [ ] Storage 버킷 `circle_galleries` 별도 생성 + 정책 (T-011 에서 함께)

### circle_members

- [ ] 컬럼: circle_id·user_id·role CHECK('owner','staff','member')·approved_by_admin·created_at
- [ ] 복합 PK (circle_id, user_id)
- [ ] RLS: SELECT (자기 row + 동아리 staff) / INSERT·UPDATE·DELETE (owner + admin)
- [ ] **MVP 사용 범위**: `owner` + `staff` 만. `member` 는 enum 정의만 두고 Phase 2 활성
- [ ] approved_by_admin DEFAULT false — T-037 admin 승급 큐에서 갱신

## 위험·주의사항

- ⚠️ **`circle_members` SELECT RLS 무한 루프** — `is_circle_staff` 가 `circle_members` SELECT 를 호출하면 정책에서 또 함수 호출 → 무한. **`circle_members` SELECT 정책은 함수 사용 금지**, 직접 조건 작성.
- ⚠️ **`role='member'` 안 쓴다고 enum 에서 빼지 말 것** — Phase 2 에서 활성. enum 변경은 다운타임 큼.
- ⚠️ **GRANT 함정** [[circles-column-grant-trap]] — `approved_by_admin` 컬럼 UPDATE 권한 명시.

## 코드 스니펫

```sql
CREATE TABLE IF NOT EXISTS public.circle_members (
  circle_id uuid NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner','staff','member')),
  approved_by_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (circle_id, user_id)
);

ALTER TABLE public.circle_members ENABLE ROW LEVEL SECURITY;

-- 무한루프 방지: 함수 사용 X, 직접 조건
CREATE POLICY circle_members_self_select ON public.circle_members FOR SELECT
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.circle_members cm
    WHERE cm.circle_id = circle_members.circle_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('owner','staff')
  ));

GRANT SELECT ON public.circle_members TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.circle_members TO authenticated;
```

## 테스트 체크리스트

- [ ] owner user 추가 후 `SELECT is_circle_staff('...')` → true
- [ ] member user 만 있는 동아리 → false
- [ ] 비멤버 user → false
