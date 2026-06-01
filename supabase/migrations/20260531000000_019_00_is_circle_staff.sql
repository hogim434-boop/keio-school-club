-- T-003: RLS 헬퍼 함수 is_circle_staff()
-- ============================================================
-- 목적: 동아리별 스태프(owner/staff) 여부를 판별하는 헬퍼 함수
--       RLS 정책의 USING/WITH CHECK 절에서 호출됨
-- ============================================================
-- 참조 테이블: public.circle_members (T-005에서 생성 예정)
--   → 함수 정의 시점에 테이블이 존재하지 않아도 SQL 함수 바디는 정의 가능
--     (STABLE 언어 내 참조이므로 컴파일 시 체크하지 않음)
--     단, 실제 호출은 circle_members 테이블 생성(T-005) 이후에 동작함
--
-- ⚠ 순환 의존 주의 (T-005 작성자에게):
--   circle_members 테이블의 SELECT RLS 정책에서 is_circle_staff()를 호출하면
--   SELECT → is_circle_staff() → circle_members SELECT → is_circle_staff() → ...
--   무한 재귀가 발생합니다.
--   circle_members 자체 SELECT 정책에는 이 함수를 사용하지 마세요.
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_circle_staff(_circle_id uuid)
RETURNS boolean
LANGUAGE sql
-- STABLE: 동일 트랜잭션 내 같은 인수면 결과를 캐시
-- RLS row-by-row 호출 시 성능 최적화를 위해 반드시 필요
STABLE
-- SECURITY INVOKER: 호출자(사용자) 권한으로 실행
-- DEFINER는 사용하지 않음 — circle_members RLS가 호출자 컨텍스트로 평가되어야 함
SECURITY INVOKER
SET search_path = public  -- search_path 인젝션 방어
AS $$
  -- 현재 로그인한 사용자(auth.uid())가 대상 동아리(_circle_id)에서
  -- owner 또는 staff 역할을 가지고 있는지 확인
  -- auth.uid()가 NULL(비로그인/anon)이면 EXISTS는 false를 반환하므로 안전
  SELECT EXISTS (
    SELECT 1
    FROM public.circle_members
    WHERE circle_id  = _circle_id
      AND user_id    = auth.uid()
      AND role IN ('owner', 'staff')
  );
$$;

-- 실행 권한 부여
-- authenticated: 로그인 사용자 (스태프 본인)
-- anon: 비로그인 사용자 — auth.uid()가 NULL이므로 항상 false 반환, 안전
GRANT EXECUTE ON FUNCTION public.is_circle_staff(uuid) TO authenticated, anon;
