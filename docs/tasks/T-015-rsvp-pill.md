# T-015: 이중 모드 RSVP pill 컴포넌트 (가벼움/강함)

| 항목 | 내용 |
|---|---|
| **Phase** | 1-3 |
| **우선순위** | High |
| **예상 소요** | 3일 |
| **의존성** | T-014 |
| **관련 기능 ID** | F033 (이중 모드 RSVP) |
| **PRD 참조** | PRD 5-4 F033 · 변경 요약 v2.0→v2.1 |

## 산출물

- `components/event-rsvp-pill.tsx` — 클라이언트 컴포넌트
- 가벼움 모드 UI: 「気になる」 / 「行く予定」 2단계
- 강함 모드 UI: 「行く」 / 「たぶん行く」 / 「行かない」 3단계
- 모드 배지 (`気軽に参加` / `定員制`)

## 검증 기준

- `event.rsvp_mode='light'` → 2단계 pill, `event_interests` INSERT/UPDATE/DELETE
- `event.rsvp_mode='strict'` → 3단계 pill, `event_rsvps` INSERT/UPDATE
- 미로그인 사용자 클릭 시 `redirect_to` 보존해 로그인 이동 (F071 안티패턴 A-1)
- 「行く」 강함 모드 + `requires_approval=true` → status `pending` 진입 + 안내 카피 「運営の確認後、参加が確定します」
- **앱 only 행위** — Phase 1.5 (T-051) 에서 `<AppOnlyGate>` 로 감쌈

## 세부 작업

- [ ] 컴포넌트 props: `event` (mode·capacity·requires_approval) · `currentStatus` · `currentUserId`
- [ ] 가벼움 분기 — `event_interests` Server Action
- [ ] 강함 분기 — `event_rsvps` Server Action
- [ ] 모드 배지 표시 (`気軽に参加` 또는 `定員制`)
- [ ] requires_approval 안내 카피
- [ ] 정원 도달 시 「定員に達しました — キャンセル待ちに登録しますか?」 다이얼로그
- [ ] 미로그인 시 `redirect_to` 보존
- [ ] 낙관적 UI 업데이트 (또는 `useTransition`)

## 위험·주의사항

- ⚠️ **이중 모드 혼란** — 사용자가 「気になる」 와 「行く」 의 강도 차이를 학습해야 함. 모드 배지 + 짧은 설명 카피 필수.
- ⚠️ **「気になる」 status enum** — `event_interests.status='interested'`, 행く予定 = `'going'`. PRD 8-1 정합.
- ⚠️ **`F045` 트리거** — 강함 모드의 정원 도달·웨이팅·승격은 T-023 DB 트리거가 처리. 클라이언트는 status 변경만 시도.
- ⚠️ **「公認」 「公式」 카피 금지** [[avoid-koujin-wording]].

## 코드 스니펫

```tsx
// components/event-rsvp-pill.tsx
"use client";
export function EventRsvpPill({ event, currentStatus }: Props) {
  if (event.rsvp_mode === "light") {
    return (
      <div className="flex gap-2">
        <Pill onClick={() => setStatus("interested")}>気になる</Pill>
        <Pill onClick={() => setStatus("going")}>行く予定</Pill>
      </div>
    );
  }
  return (
    <div className="flex gap-2">
      <Pill onClick={() => setStatus("going")}>行く</Pill>
      <Pill onClick={() => setStatus("maybe")}>たぶん行く</Pill>
      <Pill onClick={() => setStatus("declined")}>行かない</Pill>
    </div>
  );
}
```

## 테스트 체크리스트

- [ ] 가벼움 모드 → 2단계 pill
- [ ] 강함 모드 → 3단계 pill
- [ ] 미로그인 클릭 → 로그인 → 원래 페이지 복귀
- [ ] 정원 도달 → 웨이팅 다이얼로그
