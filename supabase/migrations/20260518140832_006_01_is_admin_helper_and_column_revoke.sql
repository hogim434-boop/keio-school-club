-- ============================================================
-- M-006-01: is_admin() 헬퍼 함수 + column REVOKE
-- ============================================================
-- 목적: 모든 RLS 정책에서 관리자 판별에 사용할 헬퍼 함수 생성
--        민감 컬럼(inquiry_count/view_count/role) 직접 UPDATE 차단
-- ============================================================

-- 1. is_admin() 헬퍼 함수 생성
--    SECURITY DEFINER: 함수 소유자(postgres) 권한으로 실행 — RLS 우회 없이 profiles 읽기 가능
--    SET search_path = public: search_path 인젝션 방어
--    STABLE: 동일 트랜잭션 내 같은 인수면 결과 캐시 (성능 최적화)
--    DEFAULT auth.uid(): 정책 내에서 인수 없이 호출 시 현재 사용자 UUID 자동 사용
CREATE OR REPLACE FUNCTION public.is_admin(uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS(
    SELECT 1
    FROM public.profiles
    WHERE id = uid
      AND role = 'admin'
  )
$$;

-- 2. is_admin() 실행 권한 제어
--    PUBLIC(모든 사용자)에서 실행 권한 제거
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC;
--    authenticated(로그인 사용자)에게만 실행 권한 부여
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;

-- 3. 민감 컬럼 직접 UPDATE 차단 (column-level privilege)
--    RLS 평가 전 PG ACL 단계에서 차단 — T-007 RPC SECURITY DEFINER만 갱신 가능
REVOKE UPDATE (inquiry_count, view_count) ON public.circles FROM anon, authenticated;
REVOKE UPDATE (role) ON public.profiles FROM anon, authenticated;
