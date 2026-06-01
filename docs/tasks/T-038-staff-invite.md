# T-038: 운영자가 staff 멤버 초대·추가 UI

| 항목 | 내용 |
|---|---|
| **Phase** | 1-5 |
| **우선순위** | Med |
| **예상 소요** | 1.5일 |
| **의존성** | T-037 |
| **관련 기능 ID** | F072 |
| **PRD 참조** | PRD 5-7 F072 |

## 산출물

- 운영자 관리 페이지 (예: `app/circles/[id]/manage/members/page.tsx`)
- staff 초대 UI

## 검증 기준

- owner 만 진입 가능
- 사용자 이메일/닉네임 검색 → staff 추가
- 추가 후 즉시 `is_circle_staff` true 반환

## 세부 작업

- [ ] 가드 — owner 만 (`circle_members.role='owner'`)
- [ ] 사용자 검색 (이메일 또는 닉네임)
- [ ] staff 추가 → `circle_members` INSERT (role='staff', approved_by_admin=true)
- [ ] staff 제거 (DELETE)

## 위험·주의사항

- ⚠️ **member 권한 활성 X** — Phase 2. MVP 는 staff 만.
- ⚠️ **staff 승인 admin 안 거침** — owner 가 직접 추가 가능. 사칭 방지는 owner 승인 단계에서.

## 테스트 체크리스트

- [ ] owner 가 staff 추가 → DM 인박스 진입 가능
- [ ] staff 제거 → 즉시 인박스 진입 거부
