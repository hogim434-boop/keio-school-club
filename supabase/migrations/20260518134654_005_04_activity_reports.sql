-- M-005-04: activity_reports + activity_report_images (T-034 의존 해소)
-- T-005 DB 스키마 마이그레이션 1차

-- 1. activity_reports — 활동 리포트 본문
-- lib/types/domain.ts ActivityReport interface SSOT (line 85-104)
-- image_url 은 카드 썸네일 (images[0] mirror, 인덱스/검색 친화).
CREATE TABLE public.activity_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id uuid NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  body text NOT NULL,
  image_url text,
  location text,
  activity_type public.activity_report_type_enum,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.activity_reports IS '活動レポート (T-005, T-034, F-NEW). lib/dummy/activity-reports.ts 의 100건이 T-009 시점 시드.';
COMMENT ON COLUMN public.activity_reports.content IS '1-2줄 미리보기 (掲示板 리스트, 미리보기 캐러셀)';
COMMENT ON COLUMN public.activity_reports.body IS '풀 본문 (whitespace-pre-line 렌더)';
COMMENT ON COLUMN public.activity_reports.image_url IS '카드 썸네일 — activity_report_images sort_order=0 와 동일하지만 인덱스 친화';

-- 2. activity_report_images — 리포트 갤러리 (circle_images 패턴 일관성)
CREATE TABLE public.activity_report_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.activity_reports(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0
);

COMMENT ON TABLE public.activity_report_images IS '리포트 갤러리 (T-005). 리포트당 3-5장 (lib/dummy/activity-reports.ts shape).';

-- 3. 인덱스 — 「掲示板」 탭 + 미리보기 캐러셀의 최신순 정렬 최적화
CREATE INDEX activity_reports_circle_created
  ON public.activity_reports (circle_id, created_at DESC);
