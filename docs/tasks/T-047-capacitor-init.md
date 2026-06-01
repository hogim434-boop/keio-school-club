# T-047: Capacitor 환경 설정 + iOS/Android 폴더 생성

| 항목 | 내용 |
|---|---|
| **Phase** | 1.5 |
| **우선순위** | High |
| **예상 소요** | 2일 |
| **의존성** | T-045 (Phase 1 베타 완료) |
| **관련 기능 ID** | PRD 9-7-1 |
| **PRD 참조** | PRD 9-7-2 구성 · 13장 42·43단계 |

## 산출물

- `capacitor.config.ts` (hosted URL 모드)
- `ios/` 폴더 (Xcode 프로젝트)
- `android/` 폴더 (Android Studio 프로젝트)

## 검증 기준

- `npx cap sync` 동작
- Xcode 에서 `npx cap open ios` 시 프로젝트 열림
- Android Studio 에서 `npx cap open android` 시 프로젝트 열림

## 세부 작업

- [ ] `npm install @capacitor/core @capacitor/cli`
- [ ] `npm install @capacitor/ios @capacitor/android`
- [ ] `npx cap init "K CLUB" "jp.keio.kclub"` — Bundle ID 결정
- [ ] `capacitor.config.ts` 작성:
  - [ ] `server.url: 'https://kclub.app'` (hosted URL 모드)
  - [ ] iOS `contentInset: 'always'`
  - [ ] Push·Splash 플러그인 옵션 자리
- [ ] `npx cap add ios` `npx cap add android`
- [ ] 첫 빌드 시도 (Xcode·Android Studio 정상 열림 확인)
- [ ] `.gitignore` 갱신 (ios/Pods, android/build 등)
- [ ] context7 MCP 로 Capacitor 최신 문서 확인

## 위험·주의사항

- ⚠️ **Bundle ID 변경 불가** — 한 번 결정하면 스토어 등록 후 변경 어려움. **`jp.keio.kclub`** 확정 (PRD).
- ⚠️ **hosted URL 모드** — Vercel 웹 빌드 그대로 사용 → 웹 변경 시 앱 재빌드 불필요. 단 오프라인 에러 처리 필요 (T-050).
- ⚠️ **macOS + Xcode 필수** — iOS 빌드는 Mac 만 가능. Windows·Linux 환경이면 GitHub Actions iOS runner 필요.
- ⚠️ **Capacitor 버전 일관성** — core 와 platform 패키지 버전 동일해야 함.

## 테스트 체크리스트

- [ ] `npx cap sync` 에러 없음
- [ ] Xcode 에서 build → simulator 실행 → 웹사이트 표시
- [ ] Android Studio 에서 build → emulator 실행
