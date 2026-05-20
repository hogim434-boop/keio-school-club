-- ============================================================
-- M-008: circles-public 버킷 생성 + storage.objects RLS 4 정책
-- ============================================================

-- 1. 버킷 생성 (이미 존재하면 설정만 업데이트)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'circles-public',
  'circles-public',
  true,
  4194304,  -- 4MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public            = EXCLUDED.public,
  file_size_limit   = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. SELECT 정책: anon, authenticated 모두 조회 가능 (퍼블릭 버킷)
CREATE POLICY circles_public_select_all
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'circles-public');

-- 3. INSERT 정책: 인증된 사용자 중 owner 또는 admin만, path prefix 'circles/' 강제
CREATE POLICY circles_public_insert_owner_or_admin
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'circles-public'
    AND split_part(name, '/', 1) = 'circles'
    AND EXISTS (
      SELECT 1 FROM public.circles
      WHERE id::text = split_part(name, '/', 2)
        AND (owner_id = auth.uid() OR public.is_admin())
    )
  );

-- 4. UPDATE 정책: USING(기존 행 검사) + WITH CHECK(새 값 검사) 모두 적용
CREATE POLICY circles_public_update_owner_or_admin
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'circles-public'
    AND EXISTS (
      SELECT 1 FROM public.circles
      WHERE id::text = split_part(name, '/', 2)
        AND (owner_id = auth.uid() OR public.is_admin())
    )
  )
  WITH CHECK (
    bucket_id = 'circles-public'
    AND split_part(name, '/', 1) = 'circles'
    AND EXISTS (
      SELECT 1 FROM public.circles
      WHERE id::text = split_part(name, '/', 2)
        AND (owner_id = auth.uid() OR public.is_admin())
    )
  );

-- 5. DELETE 정책: owner 또는 admin만 삭제 가능
CREATE POLICY circles_public_delete_owner_or_admin
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'circles-public'
    AND EXISTS (
      SELECT 1 FROM public.circles
      WHERE id::text = split_part(name, '/', 2)
        AND (owner_id = auth.uid() OR public.is_admin())
    )
  );
