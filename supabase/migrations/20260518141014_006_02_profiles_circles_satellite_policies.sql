-- ============================================================
-- M-006-02: 코어(profiles + circles) + 위성 테이블 RLS 정책
--           + circles status 변경 admin 전용 트리거
-- ============================================================
-- 정책 명명 규칙: {table}_{action}_{scope}
-- 4 컨텍스트: anon / authenticated / owner / admin
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- [1] profiles 정책 (3개)
-- ────────────────────────────────────────────────────────────

-- 자기 프로필 또는 관리자는 모든 프로필 조회 가능
CREATE POLICY profiles_select_own_or_admin
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR is_admin());

-- 자기 프로필만 수정 가능 (role 컬럼은 column REVOKE로 별도 차단)
CREATE POLICY profiles_update_own
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 관리자만 프로필 삭제 가능
CREATE POLICY profiles_delete_admin
  ON public.profiles
  FOR DELETE
  TO authenticated
  USING (is_admin());

-- ※ profiles INSERT는 handle_new_user 트리거(SECURITY DEFINER)가 처리하므로 정책 없음


-- ────────────────────────────────────────────────────────────
-- [2] circles 정책 (4개)
-- ────────────────────────────────────────────────────────────

-- 비로그인(anon)도 approved 서클 조회 가능, 오너/관리자는 전체 조회
-- 🗺️ /shuffle 페이지: anon은 status='approved'인 서클만 노출
CREATE POLICY circles_select_public_or_owner_or_admin
  ON public.circles
  FOR SELECT
  TO anon, authenticated
  USING (
    status = 'approved'
    OR owner_id = auth.uid()
    OR is_admin()
  );

-- 로그인 사용자만 서클 등록 가능, 반드시 자기 소유 + pending 상태로만 생성
CREATE POLICY circles_insert_authenticated
  ON public.circles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND status = 'pending'
  );

-- 오너 또는 관리자만 서클 수정 가능
CREATE POLICY circles_update_owner_or_admin
  ON public.circles
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid() OR is_admin())
  WITH CHECK (owner_id = auth.uid() OR is_admin());

-- 오너 또는 관리자만 서클 삭제 가능
CREATE POLICY circles_delete_owner_or_admin
  ON public.circles
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid() OR is_admin());


-- ────────────────────────────────────────────────────────────
-- [3] circles status 변경 admin 전용 트리거
-- ────────────────────────────────────────────────────────────
-- RLS UPDATE 정책은 OLD/NEW 컬럼 비교가 불가능하므로
-- BEFORE UPDATE 트리거로 status 변경을 admin만 할 수 있도록 강제

CREATE OR REPLACE FUNCTION public.check_circles_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- status 값이 실제로 바뀌는 경우에만 검사
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    -- 관리자가 아니면 status 변경 차단
    IF NOT is_admin() THEN
      RAISE EXCEPTION 'Only admin can change circle status'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER circles_status_admin_check
  BEFORE UPDATE ON public.circles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_circles_status_change();


-- ────────────────────────────────────────────────────────────
-- [4] tags 정책 (2개)
-- ────────────────────────────────────────────────────────────

-- 태그는 누구나 조회 가능 (비로그인 포함)
CREATE POLICY tags_select_all
  ON public.tags
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 태그 생성/수정/삭제는 관리자만 가능
CREATE POLICY tags_write_admin
  ON public.tags
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());


-- ────────────────────────────────────────────────────────────
-- [5] circle_tags 정책 (2개)
-- ────────────────────────────────────────────────────────────

-- 부모 서클이 approved이거나 오너/관리자면 태그 연결 조회 가능
CREATE POLICY circle_tags_select_visible_circle
  ON public.circle_tags
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.circles c
      WHERE c.id = circle_id
        AND (
          c.status = 'approved'
          OR c.owner_id = auth.uid()
          OR is_admin()
        )
    )
  );

-- 부모 서클 오너 또는 관리자만 태그 연결 추가/수정/삭제 가능
CREATE POLICY circle_tags_write_owner_or_admin
  ON public.circle_tags
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.circles c
      WHERE c.id = circle_id
        AND (c.owner_id = auth.uid() OR is_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.circles c
      WHERE c.id = circle_id
        AND (c.owner_id = auth.uid() OR is_admin())
    )
  );


-- ────────────────────────────────────────────────────────────
-- [6] circle_images 정책 (2개)
-- ────────────────────────────────────────────────────────────

-- 부모 서클이 approved이거나 오너/관리자면 이미지 조회 가능
CREATE POLICY circle_images_select_visible_circle
  ON public.circle_images
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.circles c
      WHERE c.id = circle_id
        AND (
          c.status = 'approved'
          OR c.owner_id = auth.uid()
          OR is_admin()
        )
    )
  );

-- 부모 서클 오너 또는 관리자만 이미지 추가/수정/삭제 가능
CREATE POLICY circle_images_write_owner_or_admin
  ON public.circle_images
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.circles c
      WHERE c.id = circle_id
        AND (c.owner_id = auth.uid() OR is_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.circles c
      WHERE c.id = circle_id
        AND (c.owner_id = auth.uid() OR is_admin())
    )
  );


-- ────────────────────────────────────────────────────────────
-- [8] favorites 정책 (3개)
-- ────────────────────────────────────────────────────────────

-- 자기 즐겨찾기만 조회 가능
CREATE POLICY favorites_select_own
  ON public.favorites
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 자기 즐겨찾기만 추가 가능
CREATE POLICY favorites_insert_own
  ON public.favorites
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 자기 즐겨찾기만 삭제 가능
CREATE POLICY favorites_delete_own
  ON public.favorites
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
