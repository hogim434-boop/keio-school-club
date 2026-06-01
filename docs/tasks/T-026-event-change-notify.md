# T-026: 이벤트 변경 알림 cron / Server Action

| 항목 | 내용 |
|---|---|
| **Phase** | 1-3 |
| **우선순위** | Med |
| **예상 소요** | 1.5일 |
| **의존성** | T-021 |
| **관련 기능 ID** | F048 |
| **PRD 참조** | PRD 5-4 F048 · 8-2 인덱스 (notified_at IS NULL) |

## 산출물

- `lib/server-actions/notify-event-changes.ts` 또는 Vercel Cron
- `event_change_logs.notified_at IS NULL` 큐 처리

## 검증 기준

- 운영자 이벤트 수정 → `event_change_logs` row 생성 (T-021)
- 본 Task 의 cron / Server Action 이 미발송 row 처리
- 신청자 전원에 「○○イベントが変更されました」 앱 내 알림 + 이메일
- 발송 완료 후 `notified_at = now()` 갱신

## 세부 작업

- [ ] Vercel Cron 설정 (예: `*/5 * * * *` 5분마다) — `vercel.json`
- [ ] 또는 Server Action 으로 즉시 발송 (T-021 의 Server Action 안에서 호출)
- [ ] `event_change_logs WHERE notified_at IS NULL` SELECT
- [ ] 신청자 전원 SELECT — 가벼움: interested+going / 강함: going+maybe+pending+waiting
- [ ] 알림 발송 (앱 내 + 이메일)
- [ ] `notified_at = now()` UPDATE

## 위험·주의사항

- ⚠️ **중복 발송 방지** — `notified_at IS NULL` 갱신 사이 다른 cron 인스턴스가 또 처리할 수 있음. `FOR UPDATE SKIP LOCKED` 또는 분산 락.
- ⚠️ **이메일 Rate limit** — 한 번에 1000건 동시 발송 시 SMTP 한도. 배치 100개씩.
- ⚠️ **Phase 1 푸시 없음** — Capacitor Push 는 T-048. Phase 1 은 앱 내 배지 + 이메일.

## 테스트 체크리스트

- [ ] 이벤트 시간 변경 → 5분 안에 신청자에게 통보
- [ ] notified_at 갱신 확인
- [ ] 같은 row 두 번 처리 X
