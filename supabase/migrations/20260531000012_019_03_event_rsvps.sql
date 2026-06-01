-- ============================================================
-- 019_03_event_rsvps: 強力モード出欠管理 (PRD 8-1)
-- rsvp_mode='strict' のイベントで使用
-- 本人行ポリシー + スタッフ承認ポリシーの重層構造
-- ============================================================

-- ------------------------------------------------------------
-- 1. テーブル作成
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.event_rsvps (
  event_id            uuid        NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id             uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- ステータス: 6種類
  status              text        NOT NULL
                        CHECK (status IN (
                          'going', 'maybe', 'declined',
                          'pending', 'waiting', 'cancelled'
                        )),
  show_profile        boolean     NOT NULL DEFAULT false,
  waiting_position    integer,

  -- 承認フロー
  approved_at         timestamptz,
  approved_by         uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  rejected_at         timestamptz,
  rejection_reason    text,
  cancelled_at        timestamptz,

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (event_id, user_id)
);

COMMENT ON TABLE public.event_rsvps IS
  '強力モード出欠管理 (T-004). rsvp_mode=strict 専用. 承認フロー対応.';

-- ------------------------------------------------------------
-- 2. updated_at 自動更新トリガー
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_event_rsvps_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_event_rsvps_updated_at
  BEFORE UPDATE ON public.event_rsvps
  FOR EACH ROW EXECUTE PROCEDURE public.set_event_rsvps_updated_at();

-- ------------------------------------------------------------
-- 3. FKインデックス
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_event_rsvps_event_id    ON public.event_rsvps(event_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_user_id     ON public.event_rsvps(user_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_approved_by ON public.event_rsvps(approved_by);
-- 待機リスト管理用
CREATE INDEX IF NOT EXISTS idx_event_rsvps_status      ON public.event_rsvps(status);

-- ------------------------------------------------------------
-- 4. RLS 有効化
-- ------------------------------------------------------------
ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;

-- 本人 or 該当イベントの運営スタッフ が SELECT 可
CREATE POLICY event_rsvps_select ON public.event_rsvps
  FOR SELECT
  USING (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id
        AND is_circle_staff(e.circle_id)
    )
    OR is_admin()
  );

-- 本人のみ INSERT (自己申込)
CREATE POLICY event_rsvps_insert_self ON public.event_rsvps
  FOR INSERT
  WITH CHECK (
    user_id = (select auth.uid())
  );

-- 本人 OR スタッフ OR admin が UPDATE 可
-- (本人: show_profile/cancelled_at 等, スタッフ: 承認/却下)
CREATE POLICY event_rsvps_update ON public.event_rsvps
  FOR UPDATE
  USING (
    user_id = (select auth.uid())
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

-- 本人のみ DELETE (申込取消)
CREATE POLICY event_rsvps_delete_self ON public.event_rsvps
  FOR DELETE
  USING (
    user_id = (select auth.uid())
  );

-- ------------------------------------------------------------
-- 5. GRANT
-- ------------------------------------------------------------
GRANT SELECT ON public.event_rsvps TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.event_rsvps TO authenticated;
