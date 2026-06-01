# T-014: 이벤트 풀스크린 상세 페이지 `/events/[id]`

| 항목 | 내용 |
|---|---|
| **Phase** | 1-3 |
| **우선순위** | High |
| **예상 소요** | 2일 |
| **의존성** | T-004 |
| **관련 기능 ID** | F002·F032 |
| **PRD 참조** | PRD 5-1 F002 · 5-4 F032 · 6-2 라우팅 함정 |

## 산출물

- `app/events/[id]/page.tsx` (Server Component, 풀스크린 — `(tabs)` 바깥)
- 커버 16:9, 일시(JST), 장소, 설명, D-day, 「このサークル·部活動を見る」 링크

## 검증 기준

- 공개 이벤트 (visibility='public') 익명 사용자도 열람 가능
- `(tabs)` 바깥이라 하단 4탭 안 보임
- 동아리 상세로 돌아가는 링크 동작
- 일시는 JST 로 표시

## 세부 작업

- [ ] `app/events/[id]/page.tsx` 생성 — `loading.tsx` 도 함께 (스켈레톤)
- [ ] 커버 이미지 16:9
- [ ] 일시 JST 변환 (`date-fns-tz` `formatInTimeZone`)
- [ ] 장소·설명 표시
- [ ] D-day 자리 (T-018)
- [ ] RSVP pill 자리 (T-015)
- [ ] 카운트 자리 (T-016)
- [ ] カレンダーに追加 자리 (T-017)
- [ ] 댓글 자리 (T-022)
- [ ] 「このサークル·部活動を見る」 → `/circles/[id]` 링크
- [ ] 미존재·비공개 이벤트 시 `notFound()`
- [ ] 취소된 이벤트 시 빨간 배너 (T-025)

## 위험·주의사항

- ⚠️ **template.tsx 함정** [[circle-detail-template-fixed-trap]] — `/events/[id]` 는 루트에 두고 `/circles/[id]/events/[eventId]` 하위 X.
- ⚠️ **JST 표시 일관성** — DB `timestamptz` (UTC) → 표시 JST. 모든 곳에서 `formatInTimeZone(ts, "Asia/Tokyo", "yyyy/MM/dd HH:mm")` 단일 헬퍼.
- ⚠️ **공개 캐싱** — `unstable_cache` + `tags:["events:public", "event:${id}"]`. 운영자 수정 시 (T-021) `revalidateTag` 필수.

## 테스트 체크리스트

- [ ] 공개 이벤트 익명 진입 → 정상 표시
- [ ] 미존재 ID → 404
- [ ] 하단 탭 안 보임
- [ ] 「このサークル·部活動を見る」 클릭 → 동아리 상세
