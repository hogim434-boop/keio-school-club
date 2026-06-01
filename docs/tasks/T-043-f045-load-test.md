# T-043: F045 트리거 동시성 부하 테스트

| 항목 | 내용 |
|---|---|
| **Phase** | 1-6 |
| **우선순위** | High (Phase 1 최종 검증) |
| **예상 소요** | 2일 |
| **의존성** | T-023 · T-024 |
| **관련 기능 ID** | F045 |
| **PRD 참조** | PRD 12-3 「F045 자동 승격 트리거 동시성」 · 13장 39단계 |

## 산출물

- 동시성 시뮬레이션 스크립트 (`scripts/load-test-f045.ts`)
- 부하 테스트 리포트

## 검증 기준 ⭐ Phase 1 최종 게이트

- 정원 마지막 자리에 **N=20 명 동시 신청** 시 → **정확히 1명만 going, 나머지는 waiting 큐** 진입
- `waiting_position` 1번부터 19번까지 정확히 할당
- race condition 없음 (2명 going 사태 0건)

## 세부 작업

- [ ] 시뮬레이션 스크립트 — `Promise.all([...20 inserts])` 또는 k6
- [ ] 시드 데이터 — 정원 10, 이미 9명 going 인 strict 이벤트
- [ ] 20명이 동시에 INSERT (status='going') 시도
- [ ] 결과 분석 — going count, waiting_position 정렬
- [ ] 실패 시 (going 2명 이상) → T-023 트리거 isolation 격상

## 위험·주의사항

- ⚠️ **부하 테스트 환경** — production DB 에 직접 X. Supabase branch 또는 local supabase 권장.
- ⚠️ **테스트 후 데이터 정리** — 시뮬레이션 row 삭제.
- ⚠️ **실패 대응** — `SERIALIZABLE` 트랜잭션 또는 단일 인스턴스 큐 워커로 마이그레이션.

## 테스트 체크리스트 ⭐ Phase 1 최종 게이트

- [ ] 20명 동시 신청 → going 정확히 1명 (이미 9 + 신규 1 = 10)
- [ ] waiting 정확히 19명
- [ ] `waiting_position` 1~19 중복·결락 없음
- [ ] 같은 시나리오 3회 반복 모두 통과
- [ ] M-Beta 마일스톤 진입 가능
