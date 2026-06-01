# T-037: owner 승급 큐 admin 페이지

| 항목 | 내용 |
|---|---|
| **Phase** | 1-5 |
| **우선순위** | High |
| **예상 소요** | 2일 |
| **의존성** | T-005 |
| **관련 기능 ID** | F073 |
| **PRD 참조** | PRD 5-7 F073 |

## 산출물

- `app/admin/owner-approvals/page.tsx`

## 검증 기준

- admin 가드 (`is_admin`)
- 「新規 owner 申請」 리스트 (동아리명·신청자·신청일·사칭 의심도)
- 승인 시 `circle_members.role='owner'`, `approved_by_admin=true` 갱신
- 거절 시 row 삭제 또는 별도 status

## 세부 작업

- [ ] admin 가드
- [ ] 신청 큐 리스트 (`approved_by_admin = false` 인 owner 후보)
- [ ] 승인 버튼 → UPDATE `approved_by_admin=true`
- [ ] 거절 버튼 → row 삭제 또는 status 추가
- [ ] 사칭 의심도 표시 (동명 동아리 검색 등)

## 위험·주의사항

- ⚠️ **사칭 동아리** — 누구나 등록 가능. 본 큐에서 차단해야 출시 후 안전. SLA KPI 측정.
- ⚠️ **owner 승인 누락 → DM 답변 불가** — 동아리 등록 후 승인 대기 중에는 `is_circle_staff` false. admin SLA 모니터링.

## 테스트 체크리스트

- [ ] 동아리 등록 후 큐 진입
- [ ] 승인 → owner 권한 부여 + DM 답변 가능
- [ ] 거절 → 큐에서 제거
