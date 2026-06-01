# T-055: Android 빌드 (Google Play Console + AAB + 서명 키 백업)

| 항목 | 내용 |
|---|---|
| **Phase** | 1.5 |
| **우선순위** | High |
| **예상 소요** | 3일 |
| **의존성** | T-048 · T-050 |
| **관련 기능 ID** | — |
| **PRD 참조** | PRD 13장 55·56·57단계 |

## 산출물

- 키스토어 (.jks) + 안전한 백업
- AAB (Android App Bundle) 빌드
- Internal Testing 동작

## 검증 기준

- AAB 빌드 성공 + 서명 정상
- Google Play Console Internal Testing 동작
- 키스토어 백업 완료 (비밀번호 관리자 또는 안전한 스토리지)

## 세부 작업

- [ ] Android Studio 에서 `npx cap open android`
- [ ] `applicationId` 확인 (`jp.keio.kclub`)
- [ ] 키스토어 생성 (`keytool -genkey`)
- [ ] **키스토어 백업 즉시** (1Password·Bitwarden·외부 저장)
- [ ] `build.gradle` 서명 설정
- [ ] AAB 빌드 (`./gradlew bundleRelease`)
- [ ] Google Play Console Internal Testing 트랙 업로드
- [ ] 베타 테스터 5-10명 추가

## 위험·주의사항

- ⚠️ **서명 키 분실 = 복구 불가** — 키스토어 분실 시 동일 앱 ID 로 업데이트 불가. **반드시 백업** + 비밀번호 관리자.
- ⚠️ **Play App Signing 활성화** — Google 이 서명 키 관리. 분실 위험 줄어들지만 일부 권한 변경 시 까다로움.
- ⚠️ **AAB vs APK** — Google Play 는 AAB 필수 (2021 이후).

## 테스트 체크리스트

- [ ] 키스토어 백업 확인
- [ ] AAB 빌드 성공
- [ ] Internal Testing 트랙 업로드
- [ ] 테스터 5명 설치 + 푸시 수신
