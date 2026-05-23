-- ============================================================
-- 018: 태그 9종 추가 — 活動場所 / 入会方法 / 募集対象
--
-- 사용자 정책(2026-05): 활동장소·가입방식·학년제한을 별도 컬럼이 아닌 「태그」로 운영.
--   → 새 enum/컬럼 불필요. tags 테이블에 행만 추가하면
--     등록 폼 태그 선택(step-tags) + 검색 필터 「タグ」 섹션에 자동 반영된다.
--   (lib/circles/filter-labels.ts TAG_SEEDS 와 slug·라벨 일치)
--
-- kind: 기존 tag_kind_enum 값(activity / feature) 재사용 (009_00 에서 확장됨).
--   - 活動場所 → activity
--   - 入会方法 / 募集対象 → feature
-- ON CONFLICT (slug) DO UPDATE → 재실행 안전(멱등).
-- ============================================================

INSERT INTO public.tags (slug, label_ja, kind) VALUES
  -- 活動場所
  ('on_campus',    '校内',         'activity'),
  ('off_campus',   '学外',         'activity'),
  ('online_place', 'オンライン',   'activity'),
  ('hybrid',       '混合',         'activity'),
  -- 入会方法
  ('first_come',   '先着順',       'feature'),
  ('interview',    '面接',         'feature'),
  ('lottery',      '抽選',         'feature'),
  ('no_screening', '選考なし',     'feature'),
  -- 募集対象
  ('grade_limited', '学年制限あり', 'feature')
ON CONFLICT (slug) DO UPDATE
  SET label_ja = EXCLUDED.label_ja,
      kind     = EXCLUDED.kind;
