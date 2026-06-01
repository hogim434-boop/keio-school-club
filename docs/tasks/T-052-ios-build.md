# T-052: iOS 빌드 + Xcode Signing & Capabilities

| 항목 | 내용 |
|---|---|
| **Phase** | 1.5 |
| **우선순위** | High |
| **예상 소요** | 2일 |
| **의존성** | T-048 · T-050 |
| **관련 기능 ID** | — |
| **PRD 참조** | PRD 9-7-5 · 13장 51단계 |

## 산출물

- Xcode 프로젝트 Signing & Capabilities 설정
- 빌드 가능한 iOS 앱 (.ipa)

## 검증 기준

- Xcode 빌드 성공 (실기기 archive)
- TestFlight 업로드 가능

## 세부 작업

- [ ] `npx cap open ios` → Xcode 열기
- [ ] Bundle Identifier 확인 (`jp.keio.kclub`)
- [ ] Signing & Capabilities — Apple Developer 팀 선택, 자동 서명
- [ ] Push Notifications capability 활성화
- [ ] Background Modes capability (Remote Notifications)
- [ ] Info.plist 권한 텍스트 (NSCameraUsageDescription·NSPhotoLibraryUsageDescription 등) 일본어
- [ ] Archive → Validate App
- [ ] TestFlight 업로드

## 위험·주의사항

- ⚠️ **Provisioning Profile 자동/수동** — 자동 서명 권장. 수동 시 인증서 만료 함정 多.
- ⚠️ **권한 텍스트 일본어 카피** — 「写真ライブラリへのアクセスを許可してください」 같은 자연스러운 일본어. Apple 가이드라인.

## 테스트 체크리스트

- [ ] Archive 성공
- [ ] Validate App 통과
- [ ] TestFlight 업로드 성공
