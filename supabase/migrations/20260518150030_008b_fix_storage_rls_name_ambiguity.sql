-- ============================================================
-- M-008b: storage RLS 정책 수정 — name 컬럼 모호성 해소
--
-- 문제: INSERT/UPDATE/DELETE 정책의 EXISTS 서브쿼리 안에서
--       split_part(name, '/', N) 의 'name' 이
--       storage.objects.name 이 아닌 circles.name 으로
--       잘못 바인딩됨 (T-008-3 SQL 검증 S4 에서 발견).
--
-- 해결: EXISTS 서브쿼리 내에서 circles.name 대신 c alias 사용,
--       외부의 name 은 storage.objects 컬럼으로 명확히 구분되도록
--       circles 테이블에만 별칭 c 부여.
-- ============================================================

-- 기존 정책 삭제
DROP POLICY IF EXISTS circles_public_insert_owner_or_admin ON storage.objects;
DROP POLICY IF EXISTS circles_public_update_owner_or_admin ON storage.objects;
DROP POLICY IF EXISTS circles_public_delete_owner_or_admin ON storage.objects;

-- INSERT 정책 재생성
-- circles 테이블에 별칭 c 를 사용해 c.name 이 circles.name 임을 명확히 하고,
-- split_part 에 전달되는 비별칭 name 은 storage.objects.name 으로 바인딩됨
CREATE POLICY circles_public_insert_owner_or_admin
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'circles-public'
    AND split_part(name, '/', 1) = 'circles'
    AND EXISTS (
      SELECT 1 FROM public.circles c
      WHERE c.id::text = split_part(name, '/', 2)
        AND (c.owner_id = auth.uid() OR public.is_admin())
    )
  );

-- UPDATE 정책 재생성
CREATE POLICY circles_public_update_owner_or_admin
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'circles-public'
    AND EXISTS (
      SELECT 1 FROM public.circles c
      WHERE c.id::text = split_part(name, '/', 2)
        AND (c.owner_id = auth.uid() OR public.is_admin())
    )
  )
  WITH CHECK (
    bucket_id = 'circles-public'
    AND split_part(name, '/', 1) = 'circles'
    AND EXISTS (
      SELECT 1 FROM public.circles c
      WHERE c.id::text = split_part(name, '/', 2)
        AND (c.owner_id = auth.uid() OR public.is_admin())
    )
  );

-- DELETE 정책 재생성
CREATE POLICY circles_public_delete_owner_or_admin
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'circles-public'
    AND EXISTS (
      SELECT 1 FROM public.circles c
      WHERE c.id::text = split_part(name, '/', 2)
        AND (c.owner_id = auth.uid() OR public.is_admin())
    )
  );
