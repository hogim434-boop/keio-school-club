-- ============================================================
-- M-008d: 헬퍼 함수 search_path 고정 (advisor WARN 해소)
--
-- function_search_path_mutable WARN:
--   storage_circles_public_check_prefix / check_owner 함수에
--   SET search_path = '' 추가 → search_path injection 방지
-- ============================================================

CREATE OR REPLACE FUNCTION public.storage_circles_public_check_prefix(object_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT split_part(object_name, '/', 1) = 'circles';
$$;

CREATE OR REPLACE FUNCTION public.storage_circles_public_check_owner(object_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.circles c
    WHERE c.id::text = split_part(object_name, '/', 2)
      AND (c.owner_id = auth.uid() OR public.is_admin())
  );
$$;

-- EXECUTE 권한 재확인 (CREATE OR REPLACE 후에도 유지되지만 명시)
REVOKE ALL ON FUNCTION public.storage_circles_public_check_prefix(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.storage_circles_public_check_owner(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.storage_circles_public_check_prefix(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.storage_circles_public_check_owner(text) TO authenticated;
