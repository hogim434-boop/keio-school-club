-- M-005-02: profiles + circles + 트리거
-- T-005 DB 스키마 마이그레이션 1차

-- 1. profiles 테이블
-- auth.users 의 1:1 확장. handle_new_user 트리거로 자동 생성.
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  keio_verified boolean NOT NULL DEFAULT false,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.profiles IS '사용자 프로필 — auth.users 1:1 (T-005). T-015 에서 이메일 도메인 기반 keio_verified 자동 부여 로직 추가';

-- 2. handle_new_user 트리거 함수 + auth.users 트리거
-- auth.users 에 새 사용자 INSERT 시 profiles 행 자동 생성 (ON CONFLICT DO NOTHING 으로 중복 방어).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 3. circles 핵심 테이블
-- lib/types/database.ts 의 Tables<'circles'>.Row 정의를 인용 + 신규 5컬럼 추가.
-- annual_fee_yen 보존 (정책 박스 💴), freshmen_ratio 미포함 (DB 도 정리).
CREATE TABLE public.circles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category public.category_enum NOT NULL,
  official_type public.official_type_enum NOT NULL,
  status public.circle_status_enum NOT NULL DEFAULT 'pending',
  activity_frequency public.activity_frequency_enum NOT NULL,
  annual_fee_yen integer NOT NULL DEFAULT 0,
  description text NOT NULL DEFAULT '',
  activity_days text NOT NULL DEFAULT '',
  member_count integer NOT NULL DEFAULT 0,
  recruitment_status public.recruitment_status_enum NOT NULL DEFAULT 'open',
  activity_time_band public.activity_time_band_enum[] NOT NULL DEFAULT '{}',
  cover_image_url text,
  owner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  view_count integer NOT NULL DEFAULT 0,
  inquiry_count integer NOT NULL DEFAULT 0,
  contact_instagram text,
  contact_x text,
  contact_line text,
  rejection_reason text,
  pledge_accepted_at timestamptz,
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  slug text UNIQUE NOT NULL,
  submission_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT circles_contact_at_least_one CHECK (
    contact_instagram IS NOT NULL
    OR contact_x IS NOT NULL
    OR contact_line IS NOT NULL
  )
);

COMMENT ON TABLE public.circles IS '단체 핵심 테이블 (T-005). annual_fee_yen 보존 (정책 박스 💴 UI 만 제거), freshmen_ratio 미포함.';
COMMENT ON COLUMN public.circles.recruitment_status IS '신규 (2026-05): open/newcomer_only/year_round';
COMMENT ON COLUMN public.circles.activity_time_band IS '신규 (2026-05): weekday_day/weekday_night/weekend 배열, OR 매칭';

-- 4. updated_at 자동 갱신 트리거 (moddatetime, extensions 스키마)
CREATE TRIGGER circles_set_updated_at
  BEFORE UPDATE ON public.circles
  FOR EACH ROW
  EXECUTE FUNCTION extensions.moddatetime(updated_at);
