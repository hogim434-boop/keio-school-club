-- ============================================================
-- M-006-01b: is_admin() anon EXECUTE 권한 재 REVOKE
-- ============================================================
-- Supabase가 CREATE FUNCTION 후 자동으로 anon에도 EXECUTE를 부여하므로
-- 별도 마이그레이션으로 다시 REVOKE합니다.
-- ============================================================

-- anon 역할에서 is_admin() 실행 권한 제거
-- authenticated만 호출 가능해야 함 (정책 내 USING절에서 호출됨)
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
