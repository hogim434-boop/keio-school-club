# T-006: DM·안전망 마이그레이션 (inquiries · inquiry_messages · inquiry_reports · user_blocks · presence)

| 항목 | 내용 |
|---|---|
| **Phase** | 1-1 |
| **우선순위** | High (Phase 1-4 전체의 길목) |
| **예상 소요** | 2일 |
| **의존성** | T-003 |
| **관련 기능 ID** | F050·F051·F052·F053·F054 |
| **PRD 참조** | PRD 8-1 (inquiries / inquiry_messages / inquiry_reports / user_blocks / presence) |

## 산출물

- 마이그레이션 5개 (1파일 = 1테이블)

## 검증 기준

- `list_tables` 5개 확인
- 본인 발신 inquiry SELECT 가능, 타인 발신 SELECT 불가 (단 동아리 staff 는 가능)
- 운영진 인박스 마운트 시 `presence` upsert 가능

## 세부 작업

### inquiries

- [x] 컬럼: id·circle_id·sender_user_id·category·subject·status·last_message_at·created_at
- [x] **category enum 에 `interest` 포함** (v2.2 신규) — CHECK (fee/schedule/vibe/trial/interest/other)
- [x] status CHECK ('open','resolved','blocked')
- [x] RLS: SELECT (sender OR staff) / INSERT (sender = auth.uid) / UPDATE (status: staff)
- [x] GRANT SELECT, INSERT, UPDATE TO authenticated
- [x] FK 인덱스: idx_inquiries_circle_id, idx_inquiries_sender_user_id, idx_inquiries_last_message_at
- **마이그레이션**: `019_10_inquiries` (적용 완료)

### inquiry_messages

- [x] 컬럼: id·inquiry_id·sender_user_id·sender_role·body·attachments·is_read_by_recipient·created_at
- [x] sender_role CHECK ('inquirer','circle_staff') — 실제 검증은 Server Action(T-027)
- [x] RLS: SELECT (스레드 참여자) / INSERT (스레드 참여자) / UPDATE is_read (수신자만)
- [x] GRANT SELECT, INSERT, UPDATE TO authenticated
- [x] FK 인덱스: idx_inquiry_messages_inquiry_id, idx_inquiry_messages_sender_user_id, idx_inquiry_messages_unread(partial)
- **마이그레이션**: `019_11_inquiry_messages` (적용 완료)

### inquiry_reports

- [x] 컬럼: id·inquiry_id·message_id·reporter_user_id·reason·admin_resolved_at·created_at
- [x] RLS: SELECT (reporter OR admin) / INSERT (reporter = auth.uid) / UPDATE (admin only)
- [x] GRANT SELECT, INSERT, UPDATE TO authenticated
- [x] FK 인덱스: idx_inquiry_reports_inquiry_id, idx_inquiry_reports_message_id, idx_inquiry_reports_reporter_user_id, idx_inquiry_reports_unresolved(partial)
- **마이그레이션**: `019_12_inquiry_reports` (적용 완료)

### user_blocks

- [x] 복합 PK (blocker_user_id, blocked_user_id, circle_id)
- [x] RLS: SELECT/INSERT/DELETE — 본인 row만 (INSERT 시 is_circle_staff 추가 검증)
- [x] GRANT SELECT, INSERT, DELETE TO authenticated
- [x] FK 인덱스: idx_user_blocks_blocked_user_id, idx_user_blocks_circle_id
- **마이그레이션**: `019_13_user_blocks` (적용 완료)

### presence (운영진 온라인 상태, F051)

- [x] 컬럼: user_id PK · circle_id (NULL=오프라인) · last_seen_at
- [x] RLS: SELECT (본인 OR 동아리 스태프) — 정책 2개→1개로 통합(multiple_permissive_policies 해소)
- [x] INSERT/UPDATE/DELETE — 본인 row만
- [x] GRANT SELECT, INSERT, UPDATE, DELETE TO authenticated
- [x] FK 인덱스: idx_presence_circle_id (partial: WHERE circle_id IS NOT NULL)
- **마이그레이션**: `019_14_presence` + `019_14b_presence_select_policy_merge` (적용 완료)

## 위험·주의사항

- ⚠️ **inquiries category enum 마이그레이션** — Phase 0 의 `inquiries` 가 이미 존재한다면 `ALTER TYPE ... ADD VALUE 'interest'`. 새로 만든다면 처음부터 6값 모두 포함.
- ⚠️ **inquiry_messages 첨부** `attachments text[]` — Supabase Storage URL 배열. 별도 정합 로직 X (Phase 1 에서는 단순 URL).
- ⚠️ **presence 갱신 빈도** — 운영진 인박스에서 5분마다 heartbeat. 너무 잦으면 비용. T-029 에서 setInterval 5분.
- ⚠️ **`is_read_by_recipient` boolean 1개로 충분** — PRD A-5 안티패턴 「既読 표시 강제 금지」. 단순 「未読 N件」 배지에만 사용.

## 코드 스니펫

```sql
CREATE TABLE IF NOT EXISTS public.inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id uuid NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  sender_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('fee','schedule','vibe','trial','interest','other')),
  subject text,
  status text NOT NULL CHECK (status IN ('open','resolved','blocked')) DEFAULT 'open',
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY inquiries_select ON public.inquiries FOR SELECT
  USING (
    sender_user_id = auth.uid()
    OR public.is_circle_staff(circle_id)
    OR public.is_admin()
  );

CREATE POLICY inquiries_insert ON public.inquiries FOR INSERT
  WITH CHECK (sender_user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE ON public.inquiries TO authenticated;
```

## 테스트 체크리스트

- [x] `list_tables` 5개 — inquiries, inquiry_messages, inquiry_reports, user_blocks, presence 확인
- [x] `get_advisors(security)` — T-006 신규 경고 0건 (기존 경고는 타 Task 범위)
- [x] `get_advisors(performance)` — T-006 신규 경고 0건 (unused_index는 데이터 없는 새 테이블 정상)
- [x] category CHECK 에 'interest' 포함 확인 (SQL 검증 완료)
- [x] RLS 정책 16개 적용 확인 (SQL pg_policies 검증 완료)
- [ ] 본인이 보낸 inquiry SELECT → row 보임 (T-027 구현 후 E2E 검증)
- [ ] 타인이 보낸 inquiry SELECT → 0 row (단 staff 는 보임) (T-027 구현 후 E2E 검증)

## 완료 일자

2026-05-31 — 마이그레이션 6개 적용 (019_10 ~ 019_14b)
