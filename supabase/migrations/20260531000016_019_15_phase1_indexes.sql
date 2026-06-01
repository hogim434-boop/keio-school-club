-- ============================================================
-- 019_15_phase1_indexes
-- Phase 1-1 T-007: PRD 8-2 복합 인덱스 + 부분 인덱스 추가
-- FK 인덱스는 T-004·T-005·T-006에서 이미 추가됨
-- ============================================================

-- ── events ──────────────────────────────────────────────────
-- 동아리별 이벤트를 최신순으로 조회하는 복합 인덱스
CREATE INDEX IF NOT EXISTS idx_events_circle_starts
  ON public.events (circle_id, starts_at DESC);

-- 예정된 이벤트 목록 조회용 인덱스
-- 주의: WHERE starts_at > now() 는 partial index 에 사용 불가 (now()는 IMMUTABLE 아님)
-- → 일반 인덱스로 생성하고 쿼리에서 WHERE 절로 필터링하면 플래너가 이 인덱스 활용
CREATE INDEX IF NOT EXISTS idx_events_upcoming
  ON public.events (starts_at);

-- ── event_interests ─────────────────────────────────────────
-- 이벤트별 참가 의사 상태 조회 (관리자 집계용)
CREATE INDEX IF NOT EXISTS idx_event_interests_event_status
  ON public.event_interests (event_id, status);

-- 사용자별 참가 의사 목록을 최신순으로 조회
CREATE INDEX IF NOT EXISTS idx_event_interests_user_created
  ON public.event_interests (user_id, created_at DESC);

-- ── event_rsvps ─────────────────────────────────────────────
-- 이벤트별 참가 신청 상태 조회
CREATE INDEX IF NOT EXISTS idx_event_rsvps_event_status
  ON public.event_rsvps (event_id, status);

-- 대기자 명단 정렬용 부분 인덱스 (status='waiting' 인 행만)
CREATE INDEX IF NOT EXISTS idx_event_rsvps_waiting
  ON public.event_rsvps (event_id, waiting_position)
  WHERE status = 'waiting';

-- 사용자별 참가 신청 내역을 최신순으로 조회
CREATE INDEX IF NOT EXISTS idx_event_rsvps_user_created
  ON public.event_rsvps (user_id, created_at DESC);

-- ── event_change_logs ───────────────────────────────────────
-- 이벤트별 변경 이력을 최신순으로 조회
CREATE INDEX IF NOT EXISTS idx_event_change_logs_event_created
  ON public.event_change_logs (event_id, created_at DESC);

-- 미발송 알림 큐 조회용 부분 인덱스 (notified_at IS NULL 인 행만)
CREATE INDEX IF NOT EXISTS idx_event_change_logs_unsent
  ON public.event_change_logs (notified_at)
  WHERE notified_at IS NULL;

-- ── inquiries ───────────────────────────────────────────────
-- 동아리별 문의 스레드를 최신 메시지 순으로 조회
CREATE INDEX IF NOT EXISTS idx_inquiries_circle_last_msg
  ON public.inquiries (circle_id, last_message_at DESC);

-- 발신자별 문의 스레드를 최신 메시지 순으로 조회
CREATE INDEX IF NOT EXISTS idx_inquiries_sender_last_msg
  ON public.inquiries (sender_user_id, last_message_at DESC);

-- ── inquiry_messages ────────────────────────────────────────
-- 문의 스레드 내 메시지를 시간 순으로 조회
CREATE INDEX IF NOT EXISTS idx_inquiry_messages_inquiry_created
  ON public.inquiry_messages (inquiry_id, created_at);

-- ── circle_galleries ────────────────────────────────────────
-- 동아리 갤러리를 촬영일 기준 최신순으로 조회
CREATE INDEX IF NOT EXISTS idx_circle_galleries_circle_taken
  ON public.circle_galleries (circle_id, taken_at DESC);

-- ── circle_members ──────────────────────────────────────────
-- 동아리별 멤버를 역할(role)로 필터링/그룹핑
CREATE INDEX IF NOT EXISTS idx_circle_members_circle_role
  ON public.circle_members (circle_id, role);
