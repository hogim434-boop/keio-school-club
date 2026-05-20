-- T-009-01: tags 시드 10종
-- lib/circles/filter-labels.ts TAG_SEEDS (7종) + foreign_welcome + PRD 보강 2종
-- ON CONFLICT (slug) DO UPDATE → idempotent

INSERT INTO public.tags (slug, label_ja, kind) VALUES
  ('beginner_ok',      '初心者歓迎',     'feature'),
  ('kenser_ok',        '兼サー可',       'feature'),
  ('yurui',            'ゆるい',         'atmosphere'),
  ('gachi',            'ガチ',           'atmosphere'),
  ('has_camp',         '合宿あり',       'activity'),
  ('foreign_welcome',  '外国人歓迎',     'feature'),
  ('intl_activity',    '海外活動あり',   'activity'),
  ('online_ok',        'オンライン可',   'feature'),
  ('free_to_join',     '見学自由',       'feature'),
  ('scholarship_ok',   '奨学生OK',       'feature')
ON CONFLICT (slug) DO UPDATE
  SET label_ja = EXCLUDED.label_ja,
      kind     = EXCLUDED.kind;
