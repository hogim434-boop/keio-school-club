# T-020: 이벤트 등록 폼 (운영자, `rsvp_mode` 선택 포함)

| 항목 | 내용 |
|---|---|
| **Phase** | 1-3 |
| **우선순위** | High |
| **예상 소요** | 3일 |
| **의존성** | T-004 · T-005 |
| **관련 기능 ID** | F030 (+ 부분 F033·F046) |
| **PRD 참조** | PRD 5-4 F030·F033·F046 · 13장 14단계 |

## 산출물

- `app/circles/[id]/events/new/page.tsx`
- 운영자 가드

## 검증 기준

- 운영자 user 만 진입 가능
- 기본 입력 (제목·일시·장소·설명·카테고리·커버 16:9·공개/비공개)
- `rsvp_mode` 라디오 선택 (가벼움 / 강함)
- 강함 선택 시 추가 입력 표시: `capacity` · `rsvp_deadline` · `requires_approval`
- 제출 → events INSERT → `/events/[id]` redirect

## 세부 작업

- [ ] 페이지 가드 (`is_circle_staff`)
- [ ] react-hook-form + zod 또는 단순 Server Action
- [ ] 커버 이미지 16:9 크롭 (기존 utils 재사용)
- [ ] 일시 입력 (JST → DB UTC 변환)
- [ ] `rsvp_mode` 라디오 + 조건부 추가 입력
- [ ] Server Action `createEvent`
- [ ] revalidateTag("events:public")

## 위험·주의사항

- ⚠️ **`rsvp_mode` 사후 변경 금지** — 이미 신청자가 있는 이벤트의 모드를 변경하면 데이터 정합 깨짐. UI 에서 disabled.
- ⚠️ **JST → UTC 변환** — 입력은 JST datetime-local, DB 저장은 UTC.
- ⚠️ **공개/비공개** — `visibility='members'` 는 MVP 미사용 (Phase 2 F072 활성 시). 기본 `'public'`.

## 테스트 체크리스트

- [ ] 비운영자 진입 redirect
- [ ] 가벼움 선택 시 capacity 등 입력 숨김
- [ ] 강함 선택 시 추가 입력 표시
- [ ] 제출 후 이벤트 상세 redirect
