-- 이메일 도메인이 慶應(keio.jp 또는 *.keio.jp)인지 판정하는 헬퍼.
-- split_part 로 @ 뒤 도메인만 추출해 검사 → keio.jp.evil.com / notkeio.jp 같은 위장 차단.
-- NULL(OAuth 등) 은 false.
CREATE OR REPLACE FUNCTION public.is_keio_email(email text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path TO ''
AS $$
  SELECT CASE
    WHEN email IS NULL THEN false
    ELSE lower(split_part(email, '@', 2)) = 'keio.jp'
      OR lower(split_part(email, '@', 2)) LIKE '%.keio.jp'
  END;
$$;

-- 트리거 내부 전용 — 외부 role 의 직접 실행 권한 회수 (advisor 청결).
REVOKE EXECUTE ON FUNCTION public.is_keio_email(text) FROM public, anon, authenticated;

-- 가입 시 profiles 생성 + keio_verified 자동 부여로 보강 (본문만 교체, 기존 ACL 보존).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, keio_verified)
  VALUES (NEW.id, public.is_keio_email(NEW.email))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 기존 사용자 백필 — 慶應 도메인인데 아직 false 인 행만 true 로 (영향 0행 확인됨, 멱등).
UPDATE public.profiles p
SET keio_verified = true
FROM auth.users u
WHERE u.id = p.id
  AND public.is_keio_email(u.email)
  AND p.keio_verified = false;
