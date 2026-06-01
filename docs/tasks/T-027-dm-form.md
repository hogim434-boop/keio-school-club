# T-027: DM 발신 폼 + 카테고리(`interest` 포함) + 로그인 게이트

| 항목 | 내용 |
|---|---|
| **Phase** | 1-4 |
| **우선순위** | High |
| **예상 소요** | 2일 |
| **의존성** | T-006 · T-010 |
| **관련 기능 ID** | F050·F071 |
| **PRD 참조** | PRD 5-5 F050 · 5-7 F071 · 변경 요약 v2.1→v2.2 |

## 산출물

- `app/circles/[id]/dm/page.tsx` — DM 발신 폼

## 검증 기준

- 카테고리 6종 (fee/schedule/vibe/trial/**interest**/other)
- 「興味があります」 카테고리 선택 가능 (v2.2 신규)
- 본문 + 첨부 (선택)
- 미로그인 → `redirect_to` 보존하며 `/auth/login`
- 운영진 상태 표시 (🟢 온라인 / ⚫ 오프라인)
- 平均応答時間 표시 (T-034 와 정합)

## 세부 작업

- [ ] 페이지 가드 — `requireUser()` 또는 미로그인 시 `redirect("/auth/login?redirect_to=...")`
- [ ] 카테고리 라디오/Select
- [ ] 본문 textarea
- [ ] 첨부 (선택, Storage 업로드 후 URL 배열)
- [ ] 운영진 상태 표시 (T-029 의 presence 활용)
- [ ] 平均応答時間 표시 자리 (T-034)
- [ ] 제출 → `inquiries` INSERT + 첫 메시지 `inquiry_messages` INSERT
- [ ] 제출 후 `/circles/[id]/dm/[inquiryId]` 로 redirect (T-028)

## 위험·주의사항

- ⚠️ **A-1 안티패턴** [[로그인 중첩 함정]] — 미로그인 사용자 폼 진입 시 `redirect_to=/circles/[id]/dm` 보존. 로그인 후 자동 복귀.
- ⚠️ **첨부 RLS** — Storage 정책 — 본인 업로드만, SELECT 는 inquiry 참여자.
- ⚠️ **cooldown** — INSERT 전 cooldown 검증 (T-033 에서).
- ⚠️ **「公認」 카피 금지** [[avoid-koujin-wording]].
- ⚠️ **앱 only 행위** — Phase 1.5 (T-051) 에서 웹에서 `<AppOnlyGate>` 로 감쌈.

## 테스트 체크리스트

- [ ] 미로그인 진입 → 로그인 페이지 → 복귀 후 폼 prefill 유지
- [ ] 카테고리 「興味があります」 선택 후 제출 → `inquiries.category='interest'` row
- [ ] 첨부 1개 → Storage URL `attachments` 배열
