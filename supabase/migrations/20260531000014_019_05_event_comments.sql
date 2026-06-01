-- ============================================================
-- 019_05_event_comments: イベントコメント (PRD 8-1)
-- 自己参照FK (parent_id) によるスレッド構造対応
-- ============================================================

-- ------------------------------------------------------------
-- 1. テーブル作成
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.event_comments (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    uuid        NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- 返信スレッド用 自己参照FK
  parent_id   uuid        REFERENCES public.event_comments(id) ON DELETE CASCADE,

  body        text        NOT NULL,

  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.event_comments IS
  'イベントコメント (T-004). parent_id による返信スレッド構造対応.';

-- ------------------------------------------------------------
-- 2. FKインデックス
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_event_comments_event_id   ON public.event_comments(event_id);
CREATE INDEX IF NOT EXISTS idx_event_comments_user_id    ON public.event_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_event_comments_parent_id  ON public.event_comments(parent_id);

-- ------------------------------------------------------------
-- 3. RLS 有効化
-- ------------------------------------------------------------
ALTER TABLE public.event_comments ENABLE ROW LEVEL SECURITY;

-- 全員閲覧可 (イベントページでコメント一覧表示)
CREATE POLICY event_comments_select ON public.event_comments
  FOR SELECT
  USING (true);

-- 認証済みユーザーのみ投稿可
CREATE POLICY event_comments_insert ON public.event_comments
  FOR INSERT
  WITH CHECK (
    (select auth.uid()) IS NOT NULL
    AND user_id = (select auth.uid())
  );

-- 本人 or 管理者のみ編集可
CREATE POLICY event_comments_update ON public.event_comments
  FOR UPDATE
  USING (
    user_id = (select auth.uid())
    OR is_admin()
  )
  WITH CHECK (
    user_id = (select auth.uid())
    OR is_admin()
  );

-- 本人 or 管理者のみ削除可
CREATE POLICY event_comments_delete ON public.event_comments
  FOR DELETE
  USING (
    user_id = (select auth.uid())
    OR is_admin()
  );

-- ------------------------------------------------------------
-- 4. GRANT
-- ------------------------------------------------------------
GRANT SELECT ON public.event_comments TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.event_comments TO authenticated;
