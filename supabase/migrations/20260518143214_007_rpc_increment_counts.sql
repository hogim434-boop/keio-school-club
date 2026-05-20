-- ============================================================
-- T-007 M-007: RPC 2종 등록
-- increment_inquiry_count (authenticated 전용, 일별 디바운스)
-- increment_view_count (anon+authenticated, 단순 +1)
-- ============================================================

-- ① increment_inquiry_count
CREATE OR REPLACE FUNCTION public.increment_inquiry_count(p_circle_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  -- 비인증 호출 차단
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  -- status='approved' 검증: pending/rejected 서클은 조용히 무시
  IF NOT EXISTS (
    SELECT 1 FROM public.circles WHERE id = p_circle_id AND status = 'approved'
  ) THEN
    RETURN;
  END IF;

  -- 일별 (user_id, circle_id, day) 유니크 제약으로 디바운스
  -- CONFLICT 시 DO NOTHING → FOUND = false → count 증가 안 함
  INSERT INTO public.inquiry_events (user_id, circle_id, day)
  VALUES (v_user_id, p_circle_id, CURRENT_DATE)
  ON CONFLICT (user_id, circle_id, day) DO NOTHING;

  -- 새 row 가 실제 삽입된 경우에만 카운트 증가
  IF FOUND THEN
    UPDATE public.circles
    SET inquiry_count = inquiry_count + 1
    WHERE id = p_circle_id;
  END IF;
END;
$func$;

REVOKE ALL ON FUNCTION public.increment_inquiry_count(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_inquiry_count(uuid) TO authenticated;

COMMENT ON FUNCTION public.increment_inquiry_count(uuid)
  IS 'T-007 F012 채널 모달 클릭 디바운스 카운트 (M-NEW-2)';

-- ② increment_view_count
CREATE OR REPLACE FUNCTION public.increment_view_count(p_circle_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
BEGIN
  -- status='approved' 인 서클만 view_count 증가 (WHERE 로 silent skip)
  UPDATE public.circles
  SET view_count = view_count + 1
  WHERE id = p_circle_id AND status = 'approved';
END;
$func$;

REVOKE ALL ON FUNCTION public.increment_view_count(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_view_count(uuid) TO anon, authenticated;

COMMENT ON FUNCTION public.increment_view_count(uuid)
  IS 'T-007 서클 상세 진입 view_count +1 (T-009 세션 디바운스)';
