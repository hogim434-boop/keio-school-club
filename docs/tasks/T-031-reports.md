# T-031: 신고 UI + admin 신고 검토 페이지

| 항목 | 내용 |
|---|---|
| **Phase** | 1-4 |
| **우선순위** | Med |
| **예상 소요** | 2일 |
| **의존성** | T-028 |
| **관련 기능 ID** | F053 |
| **PRD 참조** | PRD 5-5 F053 |

## 산출물

- 메시지 우측 메뉴 「報告する」 UI
- `app/admin/inquiry-reports/page.tsx`

## 검증 기준

- 검토자·운영진 모두 메시지 신고 가능
- 신고 → `inquiry_reports` INSERT → admin 큐 진입
- admin 페이지에서 신고 검토 + 조치 (해결/거부)

## 세부 작업

- [ ] DropdownMenu (shadcn) — 메시지마다 「報告する」 옵션
- [ ] 신고 사유 입력 다이얼로그
- [ ] `inquiry_reports` INSERT Server Action
- [ ] admin 페이지 가드 — `is_admin()`
- [ ] admin 페이지 리스트 — `admin_resolved_at IS NULL` 우선
- [ ] 조치 버튼 — `admin_resolved_at = now()` UPDATE + 발신자 권한 정지 옵션

## 위험·주의사항

- ⚠️ **신고 어그로** — 정당한 메시지에 신고 폭탄. admin 측에서 신고자 패턴 모니터링.
- ⚠️ **`is_admin()` 확인** — Phase 0 코드에 헬퍼 있는지 확인. 없으면 T-003 에서 함께.

## 테스트 체크리스트

- [ ] 메시지 신고 → `inquiry_reports` row
- [ ] admin 큐 진입
- [ ] 조치 후 큐에서 제거
