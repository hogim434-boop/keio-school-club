# T-024: 운영자 명단·승인 게이팅 페이지 + CSV + 일괄 알림

| 항목 | 내용 |
|---|---|
| **Phase** | 1-3 |
| **우선순위** | High |
| **예상 소요** | 4일 |
| **의존성** | T-020 · T-023 |
| **관련 기능 ID** | F046·F047 |
| **PRD 참조** | PRD 5-4 F046·F047 · 13장 18~20단계 |

## 산출물

- `app/circles/[id]/events/[eventId]/manage/page.tsx`
- `app/circles/[id]/events/[eventId]/manage/csv/route.ts` — CSV 다운로드
- `lib/server-actions/event-broadcast.ts` — 일괄 알림

## 검증 기준

- 신청자 목록 (이름·닉네임·신청일·상태 필터)
- 강함 + `requires_approval=true` 일 때 「承認 / 拒否」 버튼 (사유 입력 가능)
- 승인 시 정원 차감 (T-023 트리거)
- CSV 다운로드 정상
- 일괄 알림 발송 후 신청자 전원 앱 내 알림 + 이메일

## 세부 작업

- [ ] 페이지 가드 (`is_circle_staff`)
- [ ] 신청자 명단 테이블 (필터: 全て / 行く / pending / waiting / cancelled)
- [ ] pending row 에 승인/거절 버튼 + 사유 입력 다이얼로그
- [ ] 승인 → `event_rsvps.status='going'`, `approved_at`, `approved_by` 갱신 (T-023 트리거가 정원 차감)
- [ ] 거절 → `status='declined'`, `rejected_at`, `rejection_reason`
- [ ] CSV route — `Content-Type: text/csv; charset=utf-8` + BOM
- [ ] 일괄 알림 Server Action — 신청자 전원에 메시지 발송 (DM 알림 또는 별도 notifications)

## 위험·주의사항

- ⚠️ **승인 게이팅 미응답 정체** — pending 이 무기한 쌓이면 시스템 신뢰도 ↓. UI 에 「○日以内に承認推奨」 표시.
- ⚠️ **CSV 인코딩** — Excel 에서 깨짐 방지 UTF-8 BOM (`﻿` prefix).
- ⚠️ **일괄 알림 Rate limit** — 500명 동시 발송 시 메일 서비스 한도. 배치 처리.
- ⚠️ **앱 내 알림** Phase 1.5 에서 Capacitor Push 도입 (T-048). Phase 1 은 앱 내 배지 + 이메일.

## 테스트 체크리스트

- [ ] 운영자 진입 → 명단 표시
- [ ] pending row 승인 → going + 정원 차감
- [ ] CSV 다운로드 → 한글·일본어 깨짐 없음
- [ ] 일괄 알림 후 신청자 인박스에 메시지
