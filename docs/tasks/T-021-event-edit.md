# T-021: 이벤트 수정 + 변경 감지 → change_logs

| 항목 | 내용 |
|---|---|
| **Phase** | 1-3 |
| **우선순위** | High |
| **예상 소요** | 2일 |
| **의존성** | T-020 |
| **관련 기능 ID** | F031·F048 |
| **PRD 참조** | PRD 5-4 F031·F048 |

## 산출물

- `app/circles/[id]/events/[eventId]/edit/page.tsx`
- Server Action `updateEvent` — 변경 필드 비교 → `event_change_logs` INSERT

## 검증 기준

- 운영자만 수정 가능
- 변경된 필드 (starts_at / location / description / cover) 마다 `event_change_logs` row 생성
- T-026 의 알림 cron 이 `notified_at IS NULL` row 처리

## 세부 작업

- [ ] 수정 폼 (T-020 와 유사, 기본값 prefill)
- [ ] Server Action — 변경 필드 비교
- [ ] 변경 감지 후 `event_change_logs` INSERT (각 필드별 row)
- [ ] `rsvp_mode` 변경 disabled (T-020 와 정합)
- [ ] revalidateTag

## 위험·주의사항

- ⚠️ **change_logs row 폭증** — 한 번 수정에 4필드 변경 시 4 row. 의도된 동작.
- ⚠️ **알림 발송 시점** — Server Action 안에서 즉시 발송 (이메일·앱 내) 또는 T-026 cron 으로 분리. **권장: cron 분리** (Server Action 응답 지연 방지).

## 테스트 체크리스트

- [ ] 시간 변경 → `event_change_logs` row 1개
- [ ] 시간 + 장소 동시 변경 → row 2개
- [ ] 변경 없이 제출 → row 0개
