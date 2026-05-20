-- T-009-00: tag_kind_enum 확장 — feature / activity 추가
-- 기존: atmosphere, cost, frequency, gender
-- 추가: feature (입문자OK, 兼サー可 등 서클 특성), activity (합숙, 해외활동 등 활동 종류)

ALTER TYPE public.tag_kind_enum ADD VALUE IF NOT EXISTS 'feature';
ALTER TYPE public.tag_kind_enum ADD VALUE IF NOT EXISTS 'activity';
