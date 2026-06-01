# T-049: 네이티브 카메라 통합 (갤러리 업로드)

| 항목 | 내용 |
|---|---|
| **Phase** | 1.5 |
| **우선순위** | Med |
| **예상 소요** | 2일 |
| **의존성** | T-047 · T-012 |
| **관련 기능 ID** | F021 (네이티브 카메라 옵션) |
| **PRD 참조** | PRD 9-7-5 Apple 4.2 통과 전략 · 13장 45단계 |

## 산출물

- T-012 갤러리 업로드 UI 에 카메라 옵션 추가

## 검증 기준

- 운영자가 갤러리 업로드 UI 진입 → 「카메라로 촬영」 / 「라이브러리에서 선택」 선택
- 카메라 권한 요청 + 권한 부여 후 촬영
- 촬영 이미지 → Storage 업로드 + DB row

## 세부 작업

- [ ] `npm install @capacitor/camera`
- [ ] iOS `Info.plist` — `NSCameraUsageDescription` 추가
- [ ] Android — `AndroidManifest.xml` 카메라 권한
- [ ] T-012 의 업로드 UI 분기 — `Capacitor.isNativePlatform()` true 면 카메라 옵션 표시
- [ ] `Camera.getPhoto({ resultType: CameraResultType.Uri })` 호출
- [ ] Uri → Blob → Storage 업로드

## 위험·주의사항

- ⚠️ **권한 거부 처리** — 거부 시 폴백 UI (파일 선택).
- ⚠️ **이미지 크기** — 카메라 원본 5MB+. 압축 후 업로드.
- ⚠️ **Apple 4.2 통과** — 카메라는 4.2 통과 핵심 기능 중 하나.

## 테스트 체크리스트

- [ ] 카메라 권한 다이얼로그 표시
- [ ] 촬영 → 미리보기 → 업로드
- [ ] 권한 거부 시 폴백 동작
