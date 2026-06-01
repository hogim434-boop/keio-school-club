# T-011: 활동 갤러리 표시 + Storage RLS

| 항목 | 내용 |
|---|---|
| **Phase** | 1-2 |
| **우선순위** | High |
| **예상 소요** | 2일 |
| **의존성** | T-005 · T-010 |
| **관련 기능 ID** | F021 (활동 후기·갤러리, B축 핵심) |
| **PRD 참조** | PRD 5-3 F021 |

## 산출물

- 갤러리 그리드 컴포넌트
- Supabase Storage 버킷 `circle_galleries` + 정책
- 학기·연도별 필터

## 검증 기준

- 운영진 업로드 이미지가 동아리 상세에 표시
- 학기 필터 변경 시 결과 좁혀짐
- 이미지 클릭 시 lightbox 또는 풀스크린

## 세부 작업

- [ ] Supabase Storage 버킷 `circle_galleries` 생성
- [ ] Storage RLS — INSERT/DELETE: 운영진만, SELECT: 모두
- [ ] 갤러리 그리드 컴포넌트 (3열 또는 2열)
- [ ] 학기 필터 (전체 / 2026年 春学期 / 2026年 秋学期 ...)
- [ ] 이미지 lightbox (shadcn `Dialog`)
- [ ] 빈 상태 「まだ갤러리がありません」

## 위험·주의사항

- ⚠️ **이미지 최적화** — Next/Image `<Image>` 사용 시 Supabase Storage URL 도메인 next.config 에 추가.
- ⚠️ **lazy loading** — 30장+ 이미지 한 번에 로드하지 말고 IntersectionObserver 또는 next/image 기본 lazy.
- ⚠️ **JOIN 으로 업로더 정보** — `select('*, uploader:profiles(name)')` 한 번에 가져오기.

## 테스트 체크리스트

- [ ] 운영자 user 로 이미지 업로드 → 화면 표시
- [ ] 학기 필터 변경 → 결과 변화
- [ ] 비운영자 user 로 직접 Storage URL 접근 시 SELECT 통과 (public)
- [ ] 비운영자 user 로 Storage INSERT 시도 → 거부
