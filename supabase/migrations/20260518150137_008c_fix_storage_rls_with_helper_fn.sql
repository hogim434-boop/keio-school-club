-- ============================================================
-- M-008c: storage RLS 정책 최종 수정
--
-- 문제의 원인:
--   RLS 정책 EXISTS 서브쿼리 내 unqualified `name` 컬럼이
--   PostgreSQL 파서에 의해 FROM 절의 circles.name 으로 바인딩됨.
--
-- 해결:
--   public 스키마에 path 검증 헬퍼 함수 2개 생성.
--   함수 파라미터로 object_name 명시 수신 → 모호성 완전 제거.
-- ============================================================

-- 헬퍼 1: circles-public path prefix 검증 ('circles/' 로 시작하는지)
CREATE OR REPLACE FUNCTION public.storage_circles_public_check_prefix(object_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT split_part(object_name, '/', 1) = 'circles';
$$;

-- 헬퍼 2: path 에서 circle_id 추출 → 호출자가 owner 또는 admin 인지 확인
CREATE OR REPLACE FUNCTION public.storage_circles_public_check_owner(object_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.circles c
    WHERE c.id::text = split_part(object_name, '/', 2)
      AND (c.owner_id = auth.uid() OR public.is_admin())
  );
$$;

-- 헬퍼 함수 EXECUTE 권한
REVOKE ALL ON FUNCTION public.storage_circles_public_check_prefix(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.storage_circles_public_check_owner(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.storage_circles_public_check_prefix(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.storage_circles_public_check_owner(text) TO authenticated;

-- 기존 3 정책 삭제
DROP POLICY IF EXISTS circles_public_insert_owner_or_admin ON storage.objects;
DROP POLICY IF EXISTS circles_public_update_owner_or_admin ON storage.objects;
DROP POLICY IF EXISTS circles_public_delete_owner_or_admin ON storage.objects;

-- INSERT 정책 재생성: name 을 함수 인자로 명시 전달
CREATE POLICY circles_public_insert_owner_or_admin
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'circles-public'
    AND public.storage_circles_public_check_prefix(name)
    AND public.storage_circles_public_check_owner(name)
  );

-- UPDATE 정책 재생성
CREATE POLICY circles_public_update_owner_or_admin
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'circles-public'
    AND public.storage_circles_public_check_owner(name)
  )
  WITH CHECK (
    bucket_id = 'circles-public'
    AND public.storage_circles_public_check_prefix(name)
    AND public.storage_circles_public_check_owner(name)
  );

-- DELETE 정책 재생성
CREATE POLICY circles_public_delete_owner_or_admin
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'circles-public'
    AND public.storage_circles_public_check_owner(name)
  );
