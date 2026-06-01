# T-007: 인덱스 10종 + Supabase advisors 검증

| 항목 | 내용 |
|---|---|
| **Phase** | 1-1 |
| **우선순위** | Med |
| **예상 소요** | 1일 |
| **의존성** | T-004 · T-005 · T-006 |
| **관련 기능 ID** | F082 |
| **PRD 참조** | PRD 8-2 인덱스 14종 |

## 산출물

- 마이그레이션 1개: `YYYYMMDD_indexes_phase1.sql`
- `get_advisors` 의 「인덱스 추천」 0건

## 검증 기준

- `list_tables` 의 인덱스 카운트 ≥ 10
- `get_advisors` 인덱스·RLS·GRANT 경고 모두 0

## 세부 작업 (PRD 8-2)

- [ ] `events (circle_id, starts_at DESC)`
- [ ] `events (starts_at) WHERE starts_at > now() AND cancelled_at IS NULL` — partial index
- [ ] `event_interests (event_id, status)`
- [ ] `event_interests (user_id, created_at DESC)`
- [ ] `event_rsvps (event_id, status)`
- [ ] `event_rsvps (event_id, status, waiting_position) WHERE status='waiting'` — partial
- [ ] `event_rsvps (user_id, created_at DESC)`
- [ ] `event_change_logs (event_id, created_at DESC)`
- [ ] `event_change_logs (notified_at) WHERE notified_at IS NULL` — partial
- [ ] `inquiries (circle_id, last_message_at DESC)`
- [ ] `inquiries (sender_user_id, last_message_at DESC)`
- [ ] `inquiry_messages (inquiry_id, created_at)`
- [ ] `circle_galleries (circle_id, taken_at DESC)`
- [ ] `circle_members (circle_id, role)`

## 위험·주의사항

- ⚠️ **partial index 의 조건은 immutable 표현만 가능** — `now()` 같은 함수는 NOT immutable. `WHERE starts_at > now()` 는 사실 동작하지 않음. **대안**: 일반 인덱스 + 쿼리에서 `WHERE starts_at > now()` 사용 → planner 가 인덱스 활용.
- ⚠️ **CONCURRENTLY 옵션** — production 적용 시 `CREATE INDEX CONCURRENTLY` 로 락 회피. Supabase MCP `apply_migration` 도 가능.
- ⚠️ **인덱스 너무 많으면 INSERT 비용 ↑** — Phase 1 부하 수준에서는 무시 가능, 베타 후 모니터링.

## 코드 스니펫

```sql
-- partial index (notified_at IS NULL 미발송 큐)
CREATE INDEX IF NOT EXISTS idx_event_change_logs_unnotified
  ON public.event_change_logs (notified_at)
  WHERE notified_at IS NULL;

-- waiting 큐 정렬용
CREATE INDEX IF NOT EXISTS idx_event_rsvps_waiting
  ON public.event_rsvps (event_id, waiting_position)
  WHERE status = 'waiting';
```

## 테스트 체크리스트 (Supabase MCP)

- [ ] `list_tables` 호출 → 각 테이블 indexes 배열 확인
- [ ] `get_advisors` 호출 → 인덱스 추천 0건, GRANT 누락 0건
- [ ] M-Infra 마일스톤 달성 (Phase 1-1 종료)
