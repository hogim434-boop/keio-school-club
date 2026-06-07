-- T-003 후속: is_circle_staff() 를 「owner 단독 운영」 모델에 맞게 수정
-- ============================================================
-- 배경(버그):
--   기존 is_circle_staff() 는 circle_members 테이블의 role IN ('owner','staff')
--   행만 확인했다. 그러나 본 서비스는 「owner 한 명이 단독 운영」 모델이라
--   사용자가 동아리를 만들 때 circle_members 에 행을 넣지 않는다
--   (owner 는 circles.owner_id 로만 추적, staff 초대 기능은 운용하지 않음).
--
--   그 결과 모든 실제 owner 에 대해 is_circle_staff() 가 false 를 반환하여,
--   owner 본인이 자기 동아리의 운영 기능에서 차단되는 문제가 있었다:
--     - /circles/[id]/events (이벤트 관리) 진입 시 상세로 redirect
--     - events INSERT/UPDATE, event_rsvps SELECT, notifications INSERT,
--       inquiries SELECT 등 RLS 정책 차단 (이벤트 생성·신청자 조회·알림 불가)
--     - DM 인박스 / 갤러리 업로드 차단
--
-- 추가 문제(재귀):
--   circle_members 의 SELECT 정책(members_select_self_or_staff)은
--     (user_id = auth.uid())
--     OR EXISTS (SELECT 1 FROM circle_members ... )   ← 자기 자신을 재조회
--   형태라, is_circle_staff() 가 circle_members 를 읽으면
--   "infinite recursion detected in policy for relation circle_members"
--   에러가 발생할 수 있다.
--
-- 수정:
--   owner 단독 운영 모델이므로 circle_members 를 읽지 않고
--   circles.owner_id = auth.uid() 만으로 운영자(=owner) 여부를 판별한다.
--     → 모든 페이지 가드와 RLS 정책이 owner 를 정상 허용
--     → circle_members 미참조 → 자기참조 정책 재귀 원천 차단
--
-- 재귀/권한 안전성:
--   circles SELECT 정책은
--     (status='approved' OR owner_id = auth.uid() OR is_admin())
--   로 is_circle_staff() 를 호출하지 않으므로 순환 재귀가 없다.
--   SECURITY INVOKER 컨텍스트에서도 owner 는 자기 동아리 행을 항상 SELECT 할 수 있다
--   (owner_id 분기). 따라서 함수가 정상적으로 true 를 반환한다.
--
--   ※ 향후 staff 초대(Phase 2) 를 도입할 경우, circle_members 분기를 다시 추가하되
--     그때는 circle_members 의 자기참조 SELECT 정책 재귀부터 먼저 해소해야 한다.
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_circle_staff(_circle_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  -- 현재 로그인 사용자(auth.uid())가 대상 동아리(_circle_id)의 owner 인지 확인.
  -- auth.uid() 가 NULL(비로그인)이면 매칭되는 행이 없어 false 를 반환하므로 안전.
  SELECT EXISTS (
    SELECT 1
    FROM public.circles
    WHERE id       = _circle_id
      AND owner_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_circle_staff(uuid) TO authenticated, anon;
