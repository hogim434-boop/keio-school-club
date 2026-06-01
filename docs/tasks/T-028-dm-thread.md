# T-028: DM 스레드 페이지 + Supabase Realtime 채널

| 항목 | 내용 |
|---|---|
| **Phase** | 1-4 |
| **우선순위** | High |
| **예상 소요** | 3일 |
| **의존성** | T-027 |
| **관련 기능 ID** | F052·F058 |
| **PRD 참조** | PRD 5-5 F052·F058 · 9-4 Realtime |

## 산출물

- `app/circles/[id]/dm/[inquiryId]/page.tsx`
- Realtime 채널 `inquiry:${inquiryId}` 구독

## 검증 기준

- 메시지 1초 이내 수신 (Realtime 구독)
- 운영진 답변 시 라벨 「○○サークル運営」 (개인 이름 노출 X)
- 既読 표시 안 함 (단순 「未読 N件」 배지만 — A-5 안티패턴 회피)
- 미참여자 SELECT 거부 (RLS)

## 세부 작업

- [ ] 스레드 페이지 SSR — 초기 메시지 N건
- [ ] 클라이언트 Realtime 구독 (`postgres_changes` filter `inquiry_id=eq.${id}`)
- [ ] 메시지 입력 form + 송신 (Server Action)
- [ ] 송신자 role 자동 판별 — `is_circle_staff(circle_id)` true 면 `'circle_staff'`, else `'inquirer'`
- [ ] 운영진 라벨 표시
- [ ] 첨부 표시 (이미지 lightbox 또는 다운로드)
- [ ] 「未読 N件」 배지만 표시, 既読 표시 X
- [ ] presence 표시 (T-029 의 데이터 활용)

## 위험·주의사항

- ⚠️ **Realtime 비용** — DM 단위 구독이라 단체 채팅보다 작음. 동시 구독 50+ 시 Broadcast 마이그레이션 (PRD 12-3).
- ⚠️ **A-5 안티패턴** — 既読 표시 절대 금지. PRD 7장 카피 규칙 「DM 既読 표시 안 함」.
- ⚠️ **운영진 라벨** — `sender_role='circle_staff'` 인 메시지에 일괄 라벨. 개인 이름 노출 X (F058).
- ⚠️ **공개 캐싱 X** — DM 은 개인 데이터, `unstable_cache` 사용 금지.

## 코드 스니펫

```typescript
useEffect(() => {
  const channel = supabase
    .channel(`inquiry:${inquiryId}`)
    .on("postgres_changes",
      { event: "INSERT", schema: "public", table: "inquiry_messages",
        filter: `inquiry_id=eq.${inquiryId}` },
      (payload) => addMessage(payload.new)
    )
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}, [inquiryId]);
```

## 테스트 체크리스트

- [ ] 두 탭에서 같은 스레드 열고 메시지 송신 → 1초 안에 반대편에 표시
- [ ] 운영진 발신 메시지에 라벨 표시
- [ ] 既読 표시 없음 (스크린샷 확인)
- [ ] 미참여자 직접 URL 접근 → 404 또는 거부
