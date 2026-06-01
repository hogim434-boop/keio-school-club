# T-010: 동아리 상세 단순화 + 메인 CTA 「運営に問い合わせる」

| 항목 | 내용 |
|---|---|
| **Phase** | 1-2 |
| **우선순위** | High |
| **예상 소요** | 3일 |
| **의존성** | T-005 |
| **관련 기능 ID** | F020·F026·F050 (진입 버튼만, 실 동작은 T-027) |
| **PRD 참조** | PRD 5-3 · 6-3 화면 트리 · 변경 요약 v2.1→v2.2 |

## 산출물

- `app/circles/[id]/page.tsx` 단순화 (v2.2 정제)
- 메인 CTA 버튼 컴포넌트
- 외부 SNS 풋터 컴포넌트

## 검증 기준

- 동아리 상세 진입 시 4개 영역 표시: 프로필 / 갤러리 자리 / 이벤트 자리 / 외부 SNS 풋터
- 메인 CTA 「運営に問い合わせる」 fixed bottom 또는 prominent 풀스크린 위치
- 클릭 시 `/circles/[id]/dm` 로 이동 (실제 폼은 T-027)
- v2.1·v2.2 폐기 잔여물 (F022·F023·F024·F025·公認·公式LINEに参加) **0건**

## 세부 작업

- [ ] 프로필 섹션 — 이름·카테고리·태그·소개·활동 빈도 (`F020`)
- [ ] 활동 갤러리 섹션 (T-011 에서 채움)
- [ ] 이벤트 섹션 (T-014 에서 채움, 지금은 자리만)
- [ ] 외부 SNS 풋터 — Instagram·X·웹사이트만. **LINE 그룹 링크 포함 금지** (F026)
- [ ] 메인 CTA 「運営に問い合わせる」 fixed bottom 배치
- [ ] v2.1 「公式LINEに参加」 CTA 코드 grep 완전 삭제
- [ ] v2.2 폐기 (F022 아카이브, F023 FAQ, F024 先輩のコメント) 잔여물 제거 — T-013 와 병행

## 위험·주의사항

- ⚠️ **`/circles/[id]/template.tsx` 함정** [[circle-detail-template-fixed-trap]] — template 이 있으면 자식 풀스크린 페이지가 깨짐. 만들지 말거나, 자식에 `null` 반환.
- ⚠️ **메인 CTA 가 화면 가림** — fixed bottom 시 본문 padding-bottom 확보. safe-area-inset-bottom 고려.
- ⚠️ **갤러리 N+1 쿼리** — 상세에서 갤러리 30장 + 업로더 정보 JOIN 으로 한 번에 (`select('*, uploader:profiles(*)')`).
- ⚠️ **카피** [[avoid-koujin-wording]] — 「公認サークル」 등 금지.

## 테스트 체크리스트

- [ ] grep `公式LINEに参加` 결과 0건
- [ ] grep `公認` 결과 0건
- [ ] CTA 클릭 → `/circles/[id]/dm` 이동
- [ ] 외부 SNS 풋터에 Instagram·X·웹사이트 표시, LINE 없음
