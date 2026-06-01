-- T-005-2: circle_members 테이블
-- 동아리 멤버십 & 권한 3단계 (owner / staff / member)
-- ⚠️ 순환 의존 회피 필수: SELECT 정책에서 is_circle_staff() 절대 호출 금지
--    → EXISTS 서브쿼리로 circle_members cm2 별칭으로 직접 참조

-- ─── 1. 테이블 생성 ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.circle_members (
  circle_id          uuid    NOT NULL REFERENCES public.circles(id)  ON DELETE CASCADE,
  user_id            uuid    NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role               text    NOT NULL
                             CHECK (role IN ('owner', 'staff', 'member')),
  approved_by_admin  boolean NOT NULL DEFAULT false,
  created_at         timestamptz NOT NULL DEFAULT now(),

  -- 복합 PK: 한 사용자는 동일 동아리에 하나의 역할만
  PRIMARY KEY (circle_id, user_id)
);

COMMENT ON TABLE  public.circle_members                      IS '동아리 멤버십 권한 (T-005-2). role: owner/staff/member. MVP 에서는 owner+staff 만 운용.';
COMMENT ON COLUMN public.circle_members.circle_id           IS '소속 동아리 FK (circles.id)';
COMMENT ON COLUMN public.circle_members.user_id             IS '멤버 사용자 FK (profiles.id)';
COMMENT ON COLUMN public.circle_members.role                IS '권한 레벨: owner / staff / member (member 는 Phase 2 활성)';
COMMENT ON COLUMN public.circle_members.approved_by_admin   IS 'admin 이 승인한 레코드 여부';

-- ─── 2. 인덱스 ────────────────────────────────────────────────────────────
-- user_id 로 내 소속 동아리 목록 조회 시 사용
CREATE INDEX IF NOT EXISTS idx_circle_members_user_id
  ON public.circle_members (user_id);

-- circle_id 로 멤버 목록 조회 시 사용
CREATE INDEX IF NOT EXISTS idx_circle_members_circle_id
  ON public.circle_members (circle_id);

-- ─── 3. RLS 활성화 ───────────────────────────────────────────────────────
ALTER TABLE public.circle_members ENABLE ROW LEVEL SECURITY;

-- ─── 4. RLS 정책 ─────────────────────────────────────────────────────────

-- [SELECT-1] 본인 row 조회 허용 — 자신의 멤버십 확인
CREATE POLICY members_select_self
  ON public.circle_members
  FOR SELECT
  USING (user_id = auth.uid());

-- [SELECT-2] 같은 동아리의 owner·staff 가 멤버 목록 조회 허용
-- ⚠️ is_circle_staff() 호출 금지! 무한 재귀 위험
--    cm2 별칭으로 동일 테이블을 안전하게 서브쿼리 참조
CREATE POLICY members_select_circle_visibility
  ON public.circle_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM   public.circle_members cm2
      WHERE  cm2.circle_id = circle_members.circle_id
        AND  cm2.user_id   = auth.uid()
        AND  cm2.role IN ('owner', 'staff')
    )
  );

-- [INSERT-1] owner 등록 — admin 만 가능 (Phase 0 is_admin() 헬퍼 재사용)
CREATE POLICY members_insert_admin_owner
  ON public.circle_members
  FOR INSERT
  WITH CHECK (
    role = 'owner'
    AND is_admin()
  );

-- [INSERT-2] staff 등록 — 같은 동아리의 owner 가 가능
CREATE POLICY members_insert_owner_staff
  ON public.circle_members
  FOR INSERT
  WITH CHECK (
    role = 'staff'
    AND EXISTS (
      SELECT 1
      FROM   public.circle_members cm_owner
      WHERE  cm_owner.circle_id = circle_members.circle_id
        AND  cm_owner.user_id   = auth.uid()
        AND  cm_owner.role      = 'owner'
    )
  );

-- [UPDATE] approved_by_admin 변경 등 — admin 만 허용
CREATE POLICY members_update_admin
  ON public.circle_members
  FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- [DELETE] admin 또는 해당 동아리 owner 가 멤버 삭제 가능
CREATE POLICY members_delete_admin_or_owner
  ON public.circle_members
  FOR DELETE
  USING (
    is_admin()
    OR EXISTS (
      SELECT 1
      FROM   public.circle_members cm_owner
      WHERE  cm_owner.circle_id = circle_members.circle_id
        AND  cm_owner.user_id   = auth.uid()
        AND  cm_owner.role      = 'owner'
    )
  );

-- ─── 5. GRANT ─────────────────────────────────────────────────────────────
-- 컬럼 GRANT 함정 방지: 테이블 레벨 GRANT 명시
GRANT SELECT ON public.circle_members TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.circle_members TO authenticated;
