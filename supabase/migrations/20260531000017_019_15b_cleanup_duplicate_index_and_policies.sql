-- ============================================================
-- 019_15b_cleanup_duplicate_index_and_policies
-- Phase 1-1 T-007 보정: 중복 인덱스 제거 + circle_members 정책 통합
-- ============================================================

-- ── 1. 중복 인덱스 제거 ─────────────────────────────────────
-- idx_events_starts_at 와 동일한 역할. 이전 마이그레이션에서 이미 존재하므로
-- T-007 에서 생성한 idx_events_upcoming 을 제거
DROP INDEX IF EXISTS public.idx_events_upcoming;

-- ── 2. circle_members SELECT 정책 통합 ──────────────────────
-- 기존: members_select_circle_visibility + members_select_self (OR 관계로 분리됨)
-- → 두 정책의 OR 조합으로 단일 정책 생성 (multiple_permissive_policies 경고 해소)
DROP POLICY IF EXISTS members_select_circle_visibility ON public.circle_members;
DROP POLICY IF EXISTS members_select_self ON public.circle_members;

CREATE POLICY members_select_self_or_staff
  ON public.circle_members
  FOR SELECT
  USING (
    -- 본인 행은 항상 조회 가능
    user_id = (SELECT auth.uid())
    OR
    -- 해당 동아리의 owner/staff 는 전체 멤버 조회 가능
    EXISTS (
      SELECT 1
      FROM public.circle_members cm_staff
      WHERE
        cm_staff.circle_id = circle_members.circle_id
        AND cm_staff.user_id = (SELECT auth.uid())
        AND cm_staff.role IN ('owner', 'staff')
    )
  );

-- ── 3. circle_members INSERT 정책 통합 ──────────────────────
-- 기존: members_insert_admin_owner + members_insert_owner_staff (OR 관계로 분리됨)
-- → 두 정책의 OR 조합으로 단일 정책 생성 (multiple_permissive_policies 경고 해소)
DROP POLICY IF EXISTS members_insert_admin_owner ON public.circle_members;
DROP POLICY IF EXISTS members_insert_owner_staff ON public.circle_members;

CREATE POLICY members_insert_admin_or_owner_staff
  ON public.circle_members
  FOR INSERT
  WITH CHECK (
    -- admin 은 owner 역할을 등록할 수 있음
    (role = 'owner' AND is_admin())
    OR
    -- 동아리 owner 는 staff 역할을 등록할 수 있음
    (
      role = 'staff'
      AND EXISTS (
        SELECT 1
        FROM public.circle_members cm_owner
        WHERE
          cm_owner.circle_id = circle_members.circle_id
          AND cm_owner.user_id = (SELECT auth.uid())
          AND cm_owner.role = 'owner'
      )
    )
  );
