# T-056: Play Store 메타데이터 + Internal → Closed → Production

| 항목 | 내용 |
|---|---|
| **Phase** | 1.5 |
| **우선순위** | High |
| **예상 소요** | 3일 + 심사 3-7일 |
| **의존성** | T-055 |
| **관련 기능 ID** | — |
| **PRD 참조** | PRD 9-7-6 · 13장 58·59단계 |

## 산출물

- Play Store 메타데이터 (일본어)
- Production 출시

## 검증 기준 ⭐ M-StoreLaunch (Android) 게이트

- 앱 이름·짧은 설명·전체 설명 일본어
- 그래픽 어셋 (Feature Graphic 1024×500 + 스크린샷)
- 콘텐츠 등급 설문 완료
- 데이터 안전 섹션 완료
- 타깃 연령 16+ (대학생)
- 양 스토어 동시 출시일 결정 + 웹에 「アプリをダウンロード」 배너 활성화

## 세부 작업

- [ ] 메인 스토어 등록 (Internal → Closed Beta → Production 트랙)
- [ ] Feature Graphic 1024×500
- [ ] 스크린샷 (폰·태블릿)
- [ ] 짧은 설명 (80자)
- [ ] 전체 설명 (4000자)
- [ ] 콘텐츠 등급 설문
- [ ] 데이터 안전 섹션 — Supabase·Vercel Analytics 등 모두 신고
- [ ] Closed Beta 진행 (5-10명, 1주)
- [ ] Production 트랙 출시
- [ ] 웹사이트 「アプリをダウンロード」 배너 활성화 (T-051 의 모달 + 메인 페이지 배너)

## 위험·주의사항

- ⚠️ **데이터 안전 섹션 거절** — Supabase 의 모든 수집 데이터 신고 필수. 누락 시 거절.
- ⚠️ **양 스토어 출시일 어긋남** — iOS 심사가 더 까다로워 보통 더 늦음. Android 우선 출시도 OK.
- ⚠️ **버전 관리** — 양 스토어 동시 업데이트 어려움. hosted URL 모드 활용 (T-047) — 웹 변경은 즉시 반영, 앱 빌드는 네이티브 변경 시에만.

## 테스트 체크리스트 ⭐ M-StoreLaunch (Android) → 종합 M-StoreLaunch

- [ ] Production 트랙 출시
- [ ] Play Store 다운로드 가능
- [ ] iOS App Store 동시 출시 확인 (T-054 종료)
- [ ] 푸시 양 플랫폼 동작
- [ ] 「アプリで使う」 모달 웹에서 표시
- [ ] 딥링크 양 플랫폼 작동
- [ ] M-StoreLaunch 마일스톤 달성
- [ ] M-KPI-Start 진입 — 4주 후 KPI 측정 시작
