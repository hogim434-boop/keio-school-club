# T-012: 운영자 갤러리 업로드 UI

| 항목 | 내용 |
|---|---|
| **Phase** | 1-2 |
| **우선순위** | Med |
| **예상 소요** | 2일 |
| **의존성** | T-011 |
| **관련 기능 ID** | F021 |
| **PRD 참조** | PRD 5-3 F021 |

## 산출물

- `app/circles/[id]/galleries/upload/page.tsx` (운영자 전용)
- 이미지 업로드 UI + 캡션 입력 + 촬영일 선택

## 검증 기준

- 운영자 user 로만 진입 가능 (RLS + 페이지 가드)
- 이미지 업로드 → Storage 적재 + DB row 생성
- 자유 비율 업로드 가능 (커버 16:9 와 달리 갤러리는 자유)

## 세부 작업

- [ ] 페이지 가드 — `is_circle_staff` 통과 안 하면 redirect
- [ ] 이미지 파일 선택 (drag&drop 또는 파일 입력)
- [ ] 캡션 입력 (선택)
- [ ] 촬영일 선택 (정렬용, 기본 today)
- [ ] Storage 업로드 후 `circle_galleries` INSERT
- [ ] 업로드 후 상세 페이지로 redirect + `revalidateTag("circles:public")`

## 위험·주의사항

- ⚠️ **파일 크기 제한** — Supabase Storage 기본 50MB. 이미지는 5MB 정도로 제한 권장.
- ⚠️ **이미지 압축** — 클라이언트에서 압축 (browser-image-compression 등) 또는 서버에서 sharp.
- ⚠️ **Phase 1.5 네이티브 카메라** — T-049 에서 `@capacitor/camera` 통합.

## 테스트 체크리스트

- [ ] 비운영자 진입 시 redirect
- [ ] 운영자 업로드 → 상세에 즉시 반영 (revalidate)
- [ ] 5MB 초과 파일 거부
