-- 보안 강화: handle_new_user 는 auth.users 트리거에서만 호출되어야 함
-- /rest/v1/rpc/handle_new_user 로 anon/authenticated 가 직접 호출하지 못하게 EXECUTE 회수
-- (security advisor WARN 0028/0029 해소)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
