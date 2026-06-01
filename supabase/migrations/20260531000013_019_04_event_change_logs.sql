-- ============================================================
-- 019_04_event_change_logs: イベント変更履歴 (PRD 8-1)
-- イベント内容変更時の差分ログ。通知送信フラグ付き。
-- notified_at の partial index は T-007 で一括追加
-- ============================================================

-- ------------------------------------------------------------
-- 1. テーブル作成
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.event_change_logs (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        uuid        NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  changed_by      uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  field_name      text        NOT NULL,
  old_value       text,
  new_value       text,

  -- 通知済みフラグ (T-007 で partial index 追加予定)
  notified_at     timestamptz,

  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.event_change_logs IS
  'イベント変更ログ (T-004). notified_at の partial index は T-007 で追加.';

-- ------------------------------------------------------------
-- 2. FKインデックス
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_event_change_logs_event_id    ON public.event_change_logs(event_id);
CREATE INDEX IF NOT EXISTS idx_event_change_logs_changed_by  ON public.event_change_logs(changed_by);

-- ------------------------------------------------------------
-- 3. RLS 有効化
-- ------------------------------------------------------------
ALTER TABLE public.event_change_logs ENABLE ROW LEVEL SECURITY;

-- イベントの公開範囲に準じて閲覧可
-- (公開イベントなら anon でも, メンバー限定なら認証済みのみ)
CREATE POLICY event_change_logs_select ON public.event_change_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id
        AND (
          e.visibility = 'public'
          OR (select auth.uid()) IS NOT NULL
        )
    )
  );

-- 運営スタッフ or 管理者のみ INSERT
CREATE POLICY event_change_logs_insert ON public.event_change_logs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id
        AND (
          is_circle_staff(e.circle_id)
          OR is_admin()
        )
    )
  );

-- ------------------------------------------------------------
-- 4. GRANT
-- ------------------------------------------------------------
GRANT SELECT ON public.event_change_logs TO anon, authenticated;
GRANT INSERT ON public.event_change_logs TO authenticated;
