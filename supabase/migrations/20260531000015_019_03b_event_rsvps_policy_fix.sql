-- ============================================================
-- 019_03b_event_rsvps_policy_fix
-- multiple_permissive_policies 警告修正
-- UPDATE ポリシー2本 (update_self + staff_approve) → 1本に統合
-- ============================================================

-- 既存の2本を削除
DROP POLICY IF EXISTS event_rsvps_update_self    ON public.event_rsvps;
DROP POLICY IF EXISTS event_rsvps_staff_approve  ON public.event_rsvps;

-- 1本に統合: 本人 OR スタッフ OR admin
-- USING: 既存行の可視性チェック
-- WITH CHECK: 書き込み後の整合性チェック
CREATE POLICY event_rsvps_update ON public.event_rsvps
  FOR UPDATE
  USING (
    -- 本人の行
    user_id = (select auth.uid())
    -- または対象イベントの運営スタッフ
    OR EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id
        AND is_circle_staff(e.circle_id)
    )
    OR is_admin()
  )
  WITH CHECK (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id
        AND is_circle_staff(e.circle_id)
    )
    OR is_admin()
  );
