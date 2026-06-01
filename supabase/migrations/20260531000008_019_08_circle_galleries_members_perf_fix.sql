-- T-005-3: circle_galleries·circle_members 성능 보정
-- 어드바이저 WARN 수정:
--   1. auth_rls_initplan — auth.uid() → (select auth.uid()) 로 row-by-row 재평가 방지
--   2. multiple_permissive_policies — circle_galleries_write FOR ALL 을
--      INSERT/UPDATE/DELETE 전용으로 분리 (SELECT 와 중복 방지)
--   3. unindexed_foreign_keys — circle_galleries.uploaded_by 커버링 인덱스 추가

-- ─── circle_galleries 정책 재작성 ─────────────────────────────────────────

-- 기존 write 정책 삭제 (FOR ALL → INSERT/UPDATE/DELETE 분리)
DROP POLICY IF EXISTS circle_galleries_write ON public.circle_galleries;

-- [INSERT / UPDATE / DELETE] 전용 — SELECT 와 중복 없음
-- (select auth.uid()) 패턴으로 initplan 최적화
CREATE POLICY circle_galleries_write
  ON public.circle_galleries
  FOR INSERT
  WITH CHECK (
    is_admin()
    OR EXISTS (
      SELECT 1
      FROM   public.circles c
      WHERE  c.id       = circle_galleries.circle_id
        AND  c.owner_id = (select auth.uid())
    )
  );

CREATE POLICY circle_galleries_update
  ON public.circle_galleries
  FOR UPDATE
  USING (
    is_admin()
    OR EXISTS (
      SELECT 1
      FROM   public.circles c
      WHERE  c.id       = circle_galleries.circle_id
        AND  c.owner_id = (select auth.uid())
    )
  )
  WITH CHECK (
    is_admin()
    OR EXISTS (
      SELECT 1
      FROM   public.circles c
      WHERE  c.id       = circle_galleries.circle_id
        AND  c.owner_id = (select auth.uid())
    )
  );

CREATE POLICY circle_galleries_delete
  ON public.circle_galleries
  FOR DELETE
  USING (
    is_admin()
    OR EXISTS (
      SELECT 1
      FROM   public.circles c
      WHERE  c.id       = circle_galleries.circle_id
        AND  c.owner_id = (select auth.uid())
    )
  );

-- ─── circle_galleries.uploaded_by 인덱스 추가 ─────────────────────────────
-- unindexed_foreign_keys 경고 해소
CREATE INDEX IF NOT EXISTS idx_circle_galleries_uploaded_by
  ON public.circle_galleries (uploaded_by);

-- ─── circle_members 정책 재작성 (auth.uid() 최적화) ──────────────────────

-- 기존 정책 일괄 삭제
DROP POLICY IF EXISTS members_select_self             ON public.circle_members;
DROP POLICY IF EXISTS members_select_circle_visibility ON public.circle_members;
DROP POLICY IF EXISTS members_insert_admin_owner       ON public.circle_members;
DROP POLICY IF EXISTS members_insert_owner_staff       ON public.circle_members;
DROP POLICY IF EXISTS members_update_admin             ON public.circle_members;
DROP POLICY IF EXISTS members_delete_admin_or_owner    ON public.circle_members;

-- [SELECT-1] 본인 row — (select auth.uid()) 최적화
CREATE POLICY members_select_self
  ON public.circle_members
  FOR SELECT
  USING (user_id = (select auth.uid()));

-- [SELECT-2] 같은 동아리 owner·staff — cm2 서브쿼리 + 최적화
-- ⚠️ is_circle_staff() 호출 금지 (무한 재귀)
CREATE POLICY members_select_circle_visibility
  ON public.circle_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM   public.circle_members cm2
      WHERE  cm2.circle_id = circle_members.circle_id
        AND  cm2.user_id   = (select auth.uid())
        AND  cm2.role IN ('owner', 'staff')
    )
  );

-- [INSERT-1] owner 등록 — admin 만
CREATE POLICY members_insert_admin_owner
  ON public.circle_members
  FOR INSERT
  WITH CHECK (
    role = 'owner'
    AND is_admin()
  );

-- [INSERT-2] staff 등록 — 같은 동아리 owner 가능
CREATE POLICY members_insert_owner_staff
  ON public.circle_members
  FOR INSERT
  WITH CHECK (
    role = 'staff'
    AND EXISTS (
      SELECT 1
      FROM   public.circle_members cm_owner
      WHERE  cm_owner.circle_id = circle_members.circle_id
        AND  cm_owner.user_id   = (select auth.uid())
        AND  cm_owner.role      = 'owner'
    )
  );

-- [UPDATE] admin 만
CREATE POLICY members_update_admin
  ON public.circle_members
  FOR UPDATE
  USING  (is_admin())
  WITH CHECK (is_admin());

-- [DELETE] admin 또는 해당 동아리 owner
CREATE POLICY members_delete_admin_or_owner
  ON public.circle_members
  FOR DELETE
  USING (
    is_admin()
    OR EXISTS (
      SELECT 1
      FROM   public.circle_members cm_owner
      WHERE  cm_owner.circle_id = circle_members.circle_id
        AND  cm_owner.user_id   = (select auth.uid())
        AND  cm_owner.role      = 'owner'
    )
  );
