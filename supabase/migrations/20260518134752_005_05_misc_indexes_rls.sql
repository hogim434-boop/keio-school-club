-- M-005-05: inquiry_events + app_settings + 인덱스 4종 + RLS enable
-- T-005 DB 스키마 마이그레이션 1차

-- 1. inquiry_events — T-007 RPC 디바운스용 (M-NEW-2)
-- user_id 는 FK 없이 uuid (anon 호환). day 는 ISO date.
CREATE TABLE public.inquiry_events (
  user_id uuid NOT NULL,
  circle_id uuid NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  day date NOT NULL,
  PRIMARY KEY (user_id, circle_id, day)
);

COMMENT ON TABLE public.inquiry_events IS '서버측 디바운스 (T-005, T-007, M-NEW-2). increment_inquiry_count RPC 가 UNIQUE 검사로 같은 (user,circle,day) 두 번째 호출을 무시.';

-- 2. app_settings — T-021 운영 토글
CREATE TABLE public.app_settings (
  key text PRIMARY KEY,
  value text NOT NULL
);

COMMENT ON TABLE public.app_settings IS '글로벌 운영 설정 (T-005, T-021). circle_submission_paused 같은 토글 키.';

-- 3. 추가 인덱스 — 자주 쓰는 쿼리 최적화
-- circles 공개 목록 (status = 'approved' 최신순)
CREATE INDEX circles_status_created
  ON public.circles (status, created_at DESC)
  WHERE status = 'approved';

-- circles 카테고리 필터
CREATE INDEX circles_category
  ON public.circles (category);

-- favorites 즐겨찾기 페이지 (사용자별 최신순)
CREATE INDEX favorites_user_created
  ON public.favorites (user_id, created_at DESC);

-- 4. RLS enable — 모든 신규 테이블 (정책 없이, T-006 에서 세분화)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circle_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circle_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_report_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiry_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
