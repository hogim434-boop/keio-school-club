# T-050: 스플래시·상태바·아이콘·딥링크

| 항목 | 내용 |
|---|---|
| **Phase** | 1.5 |
| **우선순위** | High (Apple 4.2 통과 핵심) |
| **예상 소요** | 2일 |
| **의존성** | T-047 |
| **관련 기능 ID** | — (PRD 9-7-5) |
| **PRD 참조** | PRD 9-7-5 Apple 4.2 통과 전략 · 13장 46·47단계 |

## 산출물

- 1024×1024 마스터 아이콘 → 모든 사이즈 자동 생성
- iOS Launch Screen storyboard
- Android `splashscreen.xml` (Material 3)
- 딥링크 핸들러 (`kclub://events/[id]` 등)

## 검증 기준

- 앱 실행 시 스플래시 1.5초 → 메인 화면
- 상태바 다크/라이트 모드 자동
- `kclub://events/[id]` URL 으로 외부에서 앱 열기 → 해당 이벤트 페이지

## 세부 작업

- [ ] `npm install -D @capacitor/assets`
- [ ] 1024×1024 마스터 아이콘 + 2732×2732 스플래시 준비
- [ ] `npx capacitor-assets generate`
- [ ] `@capacitor/splash-screen` `@capacitor/status-bar` 통합
- [ ] `@capacitor/app` 딥링크 핸들러 + Next.js Router 연결
- [ ] iOS Universal Links 설정 (선택)
- [ ] Android App Links 설정 (선택)

## 위험·주의사항

- ⚠️ **마스터 아이콘 투명 배경 X** — Apple 거절 사유. 1024×1024 정사각 + 불투명 배경.
- ⚠️ **딥링크 vs Universal Links** — Universal Links 는 https URL → 앱. Phase 1.5 는 단순 `kclub://` 스킴 우선.
- ⚠️ **Apple 4.2 통과 핵심** — 스플래시·상태바·딥링크 모두 통과 기준.

## 테스트 체크리스트

- [ ] 앱 실행 시 스플래시 표시
- [ ] 상태바 다크 모드 전환 정상
- [ ] Safari 에서 `kclub://events/test` 진입 → 앱 열림 + 해당 페이지
