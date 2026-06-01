# T-029: 운영진 그룹 인박스 + presence 마운트

| 항목 | 내용 |
|---|---|
| **Phase** | 1-4 |
| **우선순위** | High |
| **예상 소요** | 3일 |
| **의존성** | T-028 |
| **관련 기능 ID** | F051·F052 |
| **PRD 참조** | PRD 5-5 F051·F052 · 8-1 presence |

## 산출물

- `app/circles/[id]/dm/inbox/page.tsx` (또는 운영자 전용 경로)
- presence upsert/언마운트 로직

## 검증 기준

- 동아리 owner + staff 누구나 답변 가능
- 인박스 마운트 시 `presence` upsert (`circle_id` 채움)
- 5분마다 `last_seen_at` heartbeat
- 언마운트 시 `circle_id = NULL` (오프라인 처리)
- 새 DM 도착 시 토스트 + 未読 배지

## 세부 작업

- [ ] 페이지 가드 (`is_circle_staff`)
- [ ] 인박스 리스트 (open 스레드 우선, last_message_at DESC)
- [ ] 마운트 시 `presence` upsert
- [ ] `setInterval(5분)` heartbeat — `last_seen_at = now()`
- [ ] 언마운트 시 `presence.circle_id = NULL`
- [ ] Realtime 또는 SSE — 새 DM 도착 토스트
- [ ] 未読 배지 (`is_read_by_recipient = false` 카운트)

## 위험·주의사항

- ⚠️ **presence 정확성** — 페이지 닫지 않고 자리 비우면 「온라인인데 응답 없음」. 5분 미갱신 = 오프라인 처리 (T-028 표시 로직).
- ⚠️ **`beforeunload` 안 잡힘** — 모바일에서는 unmount 콜백이 안 불릴 수 있음. **서버측 timeout 로직** (5분 기준).
- ⚠️ **heartbeat 비용** — 운영진 50명 × 5분 = 분당 10건 정도. 무시 가능.
- ⚠️ **앱 only** Phase 1.5 게이팅.

## 테스트 체크리스트

- [ ] 운영자 진입 → `presence.circle_id` 채워짐
- [ ] 5분 후 `last_seen_at` 갱신 확인
- [ ] 페이지 떠남 → `circle_id` NULL
- [ ] 새 DM 도착 시 토스트
