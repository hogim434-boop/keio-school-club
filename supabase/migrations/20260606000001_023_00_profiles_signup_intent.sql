-- 가입 의도(signup_intent) 컬럼 추가
-- 온보딩 UX 분기·분석용으로만 사용. 권한 게이트 아님.
-- 기존 사용자는 기본값 'general'로 채워진다.

ALTER TABLE public.profiles
  ADD COLUMN signup_intent text NOT NULL DEFAULT 'general'
    CHECK (signup_intent IN ('general', 'operator'));

COMMENT ON COLUMN public.profiles.signup_intent IS
  '가입 의도(general/operator). 온보딩 UX·분석용. 권한 게이트 아님.';
