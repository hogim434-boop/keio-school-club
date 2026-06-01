-- ============================================================
-- 019_02_event_interests: 軽量モード参加意思表示 (PRD 8-1)
-- rsvp_mode='light' のイベントで使用
-- ============================================================

-- ------------------------------------------------------------
-- 1. テーブル作成
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.event_interests (
  event_id        uuid        NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id         uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  status          text        NOT NULL
                    CHECK (status IN ('interested', 'going')),
  show_profile    boolean     NOT NULL DEFAULT false,

  created_at      timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (event_id, user_id)
);

COMMENT ON TABLE public.event_interests IS
  '軽量モード参加意思 (T-004). rsvp_mode=light のイベント専用.';

-- ------------------------------------------------------------
-- 2. FKインデックス
-- ------------------------------------------------------------
-- event_id は PK に含まれるため自動インデックス済み
-- user_id は PK の第2キーだが単独クエリ用インデックス追加
CREATE INDEX IF NOT EXISTS idx_event_interests_user_id  ON public.event_interests(user_id);
CREATE INDEX IF NOT EXISTS idx_event_interests_event_id ON public.event_interests(event_id);

-- ------------------------------------------------------------
-- 3. RLS 有効化
-- ------------------------------------------------------------
ALTER TABLE public.event_interests ENABLE ROW LEVEL SECURITY;

-- 参加カウント取得用: anon も SELECT 可
CREATE POLICY event_interests_select ON public.event_interests
  FOR SELECT
  USING (true);

-- 本人のみ INSERT
CREATE POLICY event_interests_insert ON public.event_interests
  FOR INSERT
  WITH CHECK (
    user_id = (select auth.uid())
  );

-- 本人のみ UPDATE (status / show_profile 変更)
CREATE POLICY event_interests_update ON public.event_interests
  FOR UPDATE
  USING (
    user_id = (select auth.uid())
  )
  WITH CHECK (
    user_id = (select auth.uid())
  );

-- 本人のみ DELETE (参加取消)
CREATE POLICY event_interests_delete ON public.event_interests
  FOR DELETE
  USING (
    user_id = (select auth.uid())
  );

-- ------------------------------------------------------------
-- 4. GRANT
-- ------------------------------------------------------------
GRANT SELECT ON public.event_interests TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.event_interests TO authenticated;
