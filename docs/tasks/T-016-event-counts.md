# T-016: 모드별 카운트 표시 (참고용 / 정원·잔여·웨이팅)

| 항목 | 내용 |
|---|---|
| **Phase** | 1-3 |
| **우선순위** | High |
| **예상 소요** | 1.5일 |
| **의존성** | T-015 |
| **관련 기능 ID** | F034 |
| **PRD 참조** | PRD 5-4 F034 |

## 산출물

- `components/event-counts.tsx`

## 검증 기준

- 가벼움 모드 → 「気になる N人 · 行く予定 N人」 참고 표시
- 강함 모드 → 「定員 N名 · 残り N名 · キャンセル待ち N番目」 정확 표시
- 본인 위치 표시 (예: 「あなたは キャンセル待ち 3番目」)

## 세부 작업

- [ ] 가벼움 모드 카운트 쿼리 — `event_interests` GROUP BY status
- [ ] 강함 모드 카운트 쿼리 — `event_rsvps` GROUP BY status (going + pending 정원 차감)
- [ ] `waiting_position` 본인 표시
- [ ] 빈 정원 시 「キャンセル待ち N番目」 숨김
- [ ] 정원 무제한 (capacity NULL) 시 「定員: 制限なし」

## 위험·주의사항

- ⚠️ **count 정확성** — `going` + `pending` 만 정원 차감. `maybe`·`declined`·`waiting`·`cancelled` 는 제외.
- ⚠️ **실시간 갱신** — RSVP 변경 시 Server Action 후 `revalidatePath` 또는 클라이언트 refetch.

## 테스트 체크리스트

- [ ] 가벼움 모드 → 참고 카운트
- [ ] 강함 모드 정원 10 + going 7 + waiting 2 → 「定員 10名 · 残り 3名 · キャンセル待ち 2番目」
- [ ] 본인 status 변경 후 카운트 즉시 갱신
