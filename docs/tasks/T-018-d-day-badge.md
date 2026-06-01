# T-018: D-day 배지 컴포넌트

| 항목 | 내용 |
|---|---|
| **Phase** | 1-3 |
| **우선순위** | Low |
| **예상 소요** | 0.5일 |
| **의존성** | T-014 |
| **관련 기능 ID** | F040 |
| **PRD 참조** | PRD 5-4 F040 |

## 산출물

- `components/d-day-badge.tsx`

## 검증 기준

- 「あと 5日」 같은 amber 배지
- 종료된 이벤트 → 회색 배지 「終了」
- 당일 → 「本日開催」

## 세부 작업

- [ ] `differenceInDays(starts_at, today)` 계산
- [ ] amber/회색 분기
- [ ] 종일 이벤트 처리

## 위험·주의사항

- ⚠️ **JST 기준** — 「오늘」 판정도 JST. `formatInTimeZone` 또는 `startOfDay` JST 변환.
- ⚠️ **클라이언트·서버 hydration** — 「오늘」 이 서버·클라 다를 수 있음. Server Component 에서 계산하거나, 클라에서 `suppressHydrationWarning`.

## 테스트 체크리스트

- [ ] 미래 이벤트 → 「あと N日」
- [ ] 당일 → 「本日開催」
- [ ] 과거 → 「終了」
