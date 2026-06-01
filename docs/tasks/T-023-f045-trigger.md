# T-023: F045 자동 승격 DB 트리거 ⭐ Phase 1 최난도

| 항목 | 내용 |
|---|---|
| **Phase** | 1-3 |
| **우선순위** | High (Phase 1 최난도) |
| **예상 소요** | 4일 |
| **의존성** | T-004 |
| **관련 기능 ID** | F045 |
| **PRD 참조** | PRD 5-4 F045 · 8-3 RLS · 12-3 동시성 리스크 |

## 산출물

- 마이그레이션 `YYYYMMDD_fn_event_rsvp_promote.sql`
- 함수 `public.fn_event_rsvp_promote()`
- 트리거 `trg_event_rsvp_promote AFTER UPDATE OF status ON event_rsvps`
- (선택) BEFORE INSERT 트리거 — rsvp_deadline 이후 신규 신청 차단

## 검증 기준 (단위)

- `going` 해제 시 → waiting 1번 자동 승격 (status → `going`, `waiting_position` → NULL, 알림 row 생성)
- `pending` → `going` 승인 시 → 정원 차감, 추가 신청자는 자동 `waiting`
- `rsvp_deadline` 이후 신규 INSERT 시 거부 (CHECK 또는 BEFORE INSERT)
- **동시성 안전** — T-043 부하 테스트 통과 (정확히 1명 going)

## 세부 작업

- [ ] 함수 골격 — 입력: NEW (변경된 row), OLD (이전 상태)
- [ ] OLD.status='going' AND NEW.status IN ('declined','cancelled') 시 — 같은 event_id 의 waiting 1번 SELECT (FOR UPDATE) → UPDATE status='going'
- [ ] OLD.status='pending' AND NEW.status='going' 시 — 정원 비교 후 추가 pending 들 처리
- [ ] **동시성 핵심**: `FOR UPDATE` row-level lock, 또는 `SERIALIZABLE` isolation
- [ ] BEFORE INSERT 트리거 — `rsvp_deadline` 검증
- [ ] 알림 row 생성 (별도 `notifications` 테이블 또는 `event_change_logs` 재활용)
- [ ] sequential-thinking MCP 활용해 단계별 검증

## 위험·주의사항

- ⚠️ **race condition** — 정원 마지막 자리에 N명 동시 신청 → 둘 다 going 되는 시나리오. **반드시 `SELECT ... FOR UPDATE`** 로 row lock 또는 `BEGIN ISOLATION LEVEL SERIALIZABLE`.
- ⚠️ **트리거 안 함수 호출 깊이** — 트리거에서 UPDATE 가 또 트리거를 부르면 무한 루프. `pg_trigger_depth() = 1` 가드 권장.
- ⚠️ **트리거가 RLS 우회** — 함수가 `SECURITY DEFINER` 인지 INVOKER 인지에 따라 다름. **INVOKER + 정책 통과 가정** 또는 **DEFINER + 내부 검증**.
- ⚠️ **`waiting_position` 갱신** — 1번 승격 후 나머지 waiting 의 `waiting_position` 을 -1 갱신 (UPDATE WHERE status='waiting' AND waiting_position > 1).

## 코드 스니펫 (요약)

```sql
CREATE OR REPLACE FUNCTION public.fn_event_rsvp_promote()
RETURNS TRIGGER AS $$
DECLARE
  v_next_waiter record;
BEGIN
  IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;

  -- going 해제 시 waiting 1번 승격
  IF OLD.status = 'going' AND NEW.status IN ('declined','cancelled') THEN
    SELECT * INTO v_next_waiter
      FROM public.event_rsvps
     WHERE event_id = NEW.event_id
       AND status = 'waiting'
     ORDER BY waiting_position
     FOR UPDATE SKIP LOCKED
     LIMIT 1;

    IF FOUND THEN
      UPDATE public.event_rsvps
         SET status = 'going',
             waiting_position = NULL,
             updated_at = now()
       WHERE event_id = v_next_waiter.event_id
         AND user_id = v_next_waiter.user_id;
      -- 알림 생성 (event_change_logs 재활용 또는 별도 notifications)
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_event_rsvp_promote
  AFTER UPDATE OF status ON public.event_rsvps
  FOR EACH ROW EXECUTE FUNCTION public.fn_event_rsvp_promote();
```

## 테스트 체크리스트 (단위 — 동시성은 T-043)

- [ ] going user 가 declined 로 변경 → waiting 1번이 going 됨
- [ ] pending → going 승인 시 정원 차감
- [ ] 정원 가득 차면 추가 신청 자동 waiting
- [ ] rsvp_deadline 이후 INSERT 거부
- [ ] **T-043 에서 동시성 부하 테스트 (Phase 1-6)**
