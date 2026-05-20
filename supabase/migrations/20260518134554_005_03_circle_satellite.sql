-- M-005-03: circles 위성 테이블 5종
-- T-005 DB 스키마 마이그레이션 1차

-- 1. tags 마스터 (PRD 시드 10종 + T-009 시점 INSERT)
CREATE TABLE public.tags (
  id serial PRIMARY KEY,
  slug text UNIQUE NOT NULL,
  label_ja text NOT NULL,
  kind public.tag_kind_enum NOT NULL
);

COMMENT ON TABLE public.tags IS '태그 마스터 (T-005). T-009 시드로 PRD 「タグシード」 10종 INSERT.';

-- 2. circle_tags N:M 조인 (composite PK)
CREATE TABLE public.circle_tags (
  circle_id uuid NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  tag_id integer NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (circle_id, tag_id)
);

COMMENT ON TABLE public.circle_tags IS '서클 ↔ 태그 N:M (T-005). 카드당 최대 5개 (T-018 등록 폼 검증).';

-- 3. circle_images 갤러리 (서클당 최대 8장)
CREATE TABLE public.circle_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id uuid NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0
);

COMMENT ON TABLE public.circle_images IS '단체 갤러리 (T-005). 서클당 최대 8장 — T-018 등록 폼에서 검증.';

-- 4. favorites 즐겨찾기 (user × circle composite PK)
CREATE TABLE public.favorites (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  circle_id uuid NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, circle_id)
);

COMMENT ON TABLE public.favorites IS '즐겨찾기 (T-005, F007). 현재 lib/circles/use-favorites.ts 가 sessionStorage 사용 중 — T-009 와이어업 시점에 본 테이블로 이관.';
