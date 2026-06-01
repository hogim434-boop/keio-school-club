-- ============================================================
-- 021_02_trg_event_rsvp_promote
-- RSVP 자동 승격 트리거 등록
--
-- BEFORE UPDATE OF status: status 컬럼 변경 시에만 발화
-- FOR EACH ROW: 행 단위 처리
-- BEFORE 사용 이유: 분기 B 에서 NEW.status 를 수정해야 하므로
-- ============================================================

-- 기존 트리거 제거 (재실행 안전)
DROP TRIGGER IF EXISTS trg_event_rsvp_promote ON public.event_rsvps;

-- 트리거 등록
CREATE TRIGGER trg_event_rsvp_promote
  BEFORE UPDATE OF status
  ON public.event_rsvps
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_event_rsvp_promote();
