-- ============================================================
-- M-006-04: 트리거 함수 외부 호출 차단
-- ============================================================
-- check_circles_status_change()는 트리거 전용 함수이므로
-- anon/authenticated/PUBLIC이 직접 RPC 호출하지 못하도록 REVOKE.
-- 트리거는 함수 EXECUTE 권한과 무관하게 항상 실행됨.
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.check_circles_status_change() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_circles_status_change() FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_circles_status_change() FROM authenticated;
