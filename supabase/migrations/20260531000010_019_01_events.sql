-- ============================================================
-- 019_01_events: イベントコアテーブル (PRD 8-1)
-- T-005 パターン適用:
--   1. (select auth.uid()) でRLS評価1回化
--   2. FOR ALL 回避 → INSERT/UPDATE/DELETE 個別ポリシー
--   3. FKインデックス追加
--   4. v2.1カラム6本への明示的GRANT UPDATE
-- ============================================================

-- ------------------------------------------------------------
-- 1. テーブル作成
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.events (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id           uuid        NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  created_by          uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- 基本情報
  title               text        NOT NULL,
  description         text,
  starts_at           timestamptz NOT NULL,
  ends_at             timestamptz,
  location            text,
  cover_image_url     text,
  category            text,

  -- 公開範囲
  visibility          text        NOT NULL DEFAULT 'public'
                        CHECK (visibility IN ('public', 'members')),
  is_all_day          boolean     NOT NULL DEFAULT false,

  -- v2.1: RSVP拡張カラム (6本)
  rsvp_mode           text        NOT NULL DEFAULT 'light'
                        CHECK (rsvp_mode IN ('light', 'strict')),
  capacity            integer,
  rsvp_deadline       timestamptz,
  requires_approval   boolean     NOT NULL DEFAULT false,
  cancelled_at        timestamptz,
  cancellation_reason text,

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.events IS
  'イベント (T-004). rsvp_mode=light→event_interests, strict→event_rsvps.';

-- ------------------------------------------------------------
-- 2. updated_at 自動更新トリガー
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_events_updated_at()
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

CREATE TRIGGER trg_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE PROCEDURE public.set_events_updated_at();

-- ------------------------------------------------------------
-- 3. FKインデックス (unindexed_foreign_keys 回避)
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_events_circle_id   ON public.events(circle_id);
CREATE INDEX IF NOT EXISTS idx_events_created_by  ON public.events(created_by);
-- 検索最適化インデックス
CREATE INDEX IF NOT EXISTS idx_events_starts_at   ON public.events(starts_at);
CREATE INDEX IF NOT EXISTS idx_events_visibility  ON public.events(visibility);

-- ------------------------------------------------------------
-- 4. RLS 有効化
-- ------------------------------------------------------------
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- 公開 or ログイン済みユーザーは閲覧可
-- (select auth.uid()) → 1回評価
CREATE POLICY events_select ON public.events
  FOR SELECT
  USING (
    visibility = 'public'
    OR (select auth.uid()) IS NOT NULL
  );

-- 運営スタッフ or 管理者のみ INSERT
CREATE POLICY events_insert ON public.events
  FOR INSERT
  WITH CHECK (
    is_circle_staff(circle_id)
    OR is_admin()
  );

-- 運営スタッフ or 管理者のみ UPDATE
CREATE POLICY events_update ON public.events
  FOR UPDATE
  USING (
    is_circle_staff(circle_id)
    OR is_admin()
  )
  WITH CHECK (
    is_circle_staff(circle_id)
    OR is_admin()
  );

-- 運営スタッフ or 管理者のみ DELETE
CREATE POLICY events_delete ON public.events
  FOR DELETE
  USING (
    is_circle_staff(circle_id)
    OR is_admin()
  );

-- ------------------------------------------------------------
-- 5. GRANT
-- ------------------------------------------------------------
GRANT SELECT ON public.events TO anon, authenticated;
GRANT INSERT, DELETE ON public.events TO authenticated;

-- 全カラムUPDATE (基本)
GRANT UPDATE ON public.events TO authenticated;

-- v2.1拡張カラム6本を明示的にGRANT (将来の権限絞り込み対応)
GRANT UPDATE (
  rsvp_mode,
  capacity,
  rsvp_deadline,
  requires_approval,
  cancelled_at,
  cancellation_reason
) ON public.events TO authenticated;
