-- ============================================================
-- 021_00_notifications_type_extend
-- notifications.type CHECK 제약 확장
-- 기존 2개 → 5개 type 허용
-- ============================================================

-- 기존 CHECK 제약 제거
ALTER TABLE public.notifications
  DROP CONSTRAINT notifications_type_check;

-- 새 CHECK 제약 추가 (기존 2개 + 신규 3개)
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type = ANY (ARRAY[
    'circle_approved'::text,
    'circle_rejected'::text,
    'event_rsvp_promoted'::text,
    'event_rsvp_approved'::text,
    'event_rsvp_waiting_assigned'::text
  ]));
