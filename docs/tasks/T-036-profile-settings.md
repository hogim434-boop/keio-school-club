# T-036: 프로필 설정 + `show_profile` DEFAULT false

| 항목 | 내용 |
|---|---|
| **Phase** | 1-5 |
| **우선순위** | High |
| **예상 소요** | 1.5일 |
| **의존성** | T-001 |
| **관련 기능 ID** | F064 |
| **PRD 참조** | PRD 5-6 F064 · 12-1 A-3 안티패턴 |

## 산출물

- `app/(tabs)/mypage/profile/page.tsx`
- `profiles.show_profile boolean DEFAULT false` 마이그레이션 확인

## 검증 기준

- 닉네임·아바타·자기소개 편집
- **`show_profile` 토글 — DEFAULT false** (회원가입 직후 비공개)
- 토글 OFF 시 다른 사용자에게 닉네임 「○○さん」 익명 표시
- 마이그레이션·UI 둘 다 OFF 기본

## 세부 작업

- [ ] `profiles.show_profile` 컬럼 DEFAULT false 확인 (마이그레이션 갱신 필요 시)
- [ ] GRANT UPDATE (show_profile) 컬럼 명시 [[circles-column-grant-trap]]
- [ ] 프로필 편집 폼
- [ ] 아바타 업로드 (Storage)
- [ ] `show_profile` 토글
- [ ] OFF 시 다른 페이지 (이벤트 참가자, 댓글 등) 에서 익명 표시 로직 정합

## 위험·주의사항

- ⚠️ **A-3 안티패턴** — `show_profile` 기본값이 true 면 출시 즉시 안티패턴 위반. 마이그레이션 + UI 둘 다 확인.
- ⚠️ **익명 표시 일관성** — 이벤트 참가자 목록 (T-024), 댓글 (T-022) 등 모든 곳에서 익명 처리.

## 테스트 체크리스트

- [ ] 새 가입 user → `show_profile=false`
- [ ] 토글 OFF 상태로 이벤트 참가 → 명단에 「○○さん」 익명 표시
- [ ] 토글 ON 후 → 닉네임 표시
