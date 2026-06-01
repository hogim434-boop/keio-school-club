# T-042: KPI 측정용 이벤트 로깅 (다단계 깔때기 포함)

| 항목 | 내용 |
|---|---|
| **Phase** | 1-6 |
| **우선순위** | High |
| **예상 소요** | 2일 |
| **의존성** | Phase 1-5 종료 |
| **관련 기능 ID** | F050·F060~F064·다단계 깔때기 (v2.3) |
| **PRD 참조** | PRD 11장 KPI 표 |

## 산출물

- 이벤트 로깅 라이브러리 (예: `lib/analytics.ts`)
- 다단계 깔때기 자리 (Phase 1.5 에서 활성화)

## 검증 기준 (PRD 11장)

- 「運営に問い合わせる」 클릭 카운트
- DM 카테고리 `interest` 비율 측정 쿼리
- 갤러리 조회 / 동아리 상세 진입 비율
- 검색 사용 횟수 / DAU
- **웹→앱 다운로드 전환율 자리** (v2.3 신규, Phase 1.5 에서 활성화)
- **앱 DAU / 웹 DAU 비율 자리** (v2.3 신규)
- 측정값 0 아님 (베타에서 실데이터 발생)

## 세부 작업

- [ ] 로깅 라이브러리 — Vercel Analytics 또는 자체 (Supabase RPC)
- [ ] 주요 이벤트 정의:
  - `circle_detail_view` (`circle_id`)
  - `cta_inquiry_click` (`circle_id`)
  - `inquiry_send` (`circle_id`, `category`)
  - `event_interest_toggle` (`event_id`, `status`)
  - `search_query` (`query`, `result_count`)
  - `gallery_section_view` (`circle_id`)
  - `app_download_modal_show` (Phase 1.5)
  - `app_download_modal_click` (Phase 1.5)
- [ ] 베타 단계에서 측정값 발생 확인

## 위험·주의사항

- ⚠️ **개인정보 보호** — user_id 직접 로깅 X. hashed user_id 사용.
- ⚠️ **로깅 비용** — Vercel Analytics 무료 한도 확인. 초과 시 자체 테이블.
- ⚠️ **다단계 깔때기 자리** — Phase 1 은 자리만, Phase 1.5 T-051 에서 활성화.

## 테스트 체크리스트

- [ ] dev 에서 각 이벤트 발생 → analytics 콘솔 확인
- [ ] 베타 5명 사용 후 카운트 0 아님
