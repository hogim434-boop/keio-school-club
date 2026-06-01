-- ============================================================
-- 021_01_fn_event_rsvp_promote
-- RSVP 자동 승격 함수 (BEFORE UPDATE 트리거용)
--
-- 분기 A: going → cancelled/declined 시 waiting 1번 자동 승격
-- 분기 B: pending → going 승인 시 정원 초과면 waiting 강제 전환
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_event_rsvp_promote()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_event       public.events%ROWTYPE;
  v_promoted_id uuid;
  v_going_count int;
BEGIN
  -- 이벤트 row lock: 동일 event_id 동시 업데이트 직렬화
  SELECT * INTO v_event
    FROM public.events
   WHERE id = NEW.event_id
     FOR UPDATE;

  -- ──────────────────────────────────────────────────────────
  -- 분기 A: going → cancelled / declined 전환 시
  --         waiting 1순위 사용자 자동 going 승격
  -- ──────────────────────────────────────────────────────────
  IF NEW.status IN ('cancelled', 'declined') AND OLD.status = 'going' THEN

    -- waiting 1순위 row 를 going 으로 변경 (FOR UPDATE 로 동시성 보호)
    UPDATE public.event_rsvps
       SET status          = 'going',
           waiting_position = NULL
     WHERE (event_id, user_id) = (
       SELECT event_id, user_id
         FROM public.event_rsvps
        WHERE event_id = NEW.event_id
          AND status   = 'waiting'
        ORDER BY waiting_position ASC
        LIMIT 1
          FOR UPDATE
     )
    RETURNING user_id INTO v_promoted_id;

    -- 나머지 waiting 행 position 1씩 감소 (승격된 행 제외됨)
    IF v_promoted_id IS NOT NULL THEN
      UPDATE public.event_rsvps
         SET waiting_position = waiting_position - 1
       WHERE event_id = NEW.event_id
         AND status   = 'waiting';
    END IF;

    -- 승격 알림 INSERT
    IF v_promoted_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, circle_id, circle_name, body)
      SELECT v_promoted_id,
             'event_rsvp_promoted',
             v_event.circle_id,
             c.name,
             '繰り上がりで参加が確定しました: ' || v_event.title
        FROM public.circles c
       WHERE c.id = v_event.circle_id;
    END IF;

  END IF;

  -- ──────────────────────────────────────────────────────────
  -- 분기 B: pending → going 승인 시 정원 초과 여부 검사
  --         초과 시 NEW.status 를 'waiting' 으로 강제 전환
  --         (BEFORE 트리거이므로 NEW 수정 가능)
  -- ──────────────────────────────────────────────────────────
  IF NEW.status = 'going' AND OLD.status = 'pending'
     AND v_event.capacity IS NOT NULL
  THEN

    -- 현재 going 수 집계 (이미 going 인 행만, 본 UPDATE 반영 전)
    SELECT count(*) INTO v_going_count
      FROM public.event_rsvps
     WHERE event_id = NEW.event_id
       AND status   = 'going';

    IF v_going_count >= v_event.capacity THEN
      -- 정원 초과 → waiting 으로 강제 전환
      NEW.status           := 'waiting';
      NEW.waiting_position := v_going_count - v_event.capacity + 1;

      INSERT INTO public.notifications (user_id, type, circle_id, circle_name, body)
      SELECT NEW.user_id,
             'event_rsvp_waiting_assigned',
             v_event.circle_id,
             c.name,
             'キャンセル待ち ' || NEW.waiting_position || '番目に登録されました: ' || v_event.title
        FROM public.circles c
       WHERE c.id = v_event.circle_id;

    ELSE
      -- 정원 이내 → 정상 going 승인 알림
      INSERT INTO public.notifications (user_id, type, circle_id, circle_name, body)
      SELECT NEW.user_id,
             'event_rsvp_approved',
             v_event.circle_id,
             c.name,
             '参加が承認されました: ' || v_event.title
        FROM public.circles c
       WHERE c.id = v_event.circle_id;

    END IF;

  END IF;

  RETURN NEW;
END;
$$;
