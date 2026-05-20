-- ============================================================
-- M-006-01c: is_admin() — anon 역할 EXECUTE 권한 부여
-- ============================================================
-- 문제: circles SELECT 정책이 TO anon, authenticated 이고
--       USING절에 is_admin()이 포함되어 있음.
--       anon이 SELECT 시 is_admin()을 호출하려 하면 42501 오류 발생.
--
-- 해결: anon에게도 EXECUTE 권한 부여.
--       is_admin()은 auth.uid()가 NULL(anon)이면 EXISTS가 false를 반환하므로
--       권한 부여해도 안전함 — anon이 admin이 될 수 없음.
-- ============================================================

GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO anon;
