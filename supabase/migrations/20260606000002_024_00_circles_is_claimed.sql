-- ============================================================
-- M-024: circles.is_claimed 컬럼 추가
-- 목적: 미claim(시드) 동아리는 인앱 DM 비활성 → 公式SNS 핸드오프
-- ============================================================

-- 1. 컬럼 추가 (DEFAULT false — 이후 신규 시드 insert 는 미claim 상태)
ALTER TABLE public.circles
  ADD COLUMN is_claimed boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.circles.is_claimed IS
  '실제 운영자가 소유권을 확정(claim)했는지. '
  'false=시드(미claim) 리스팅 — 인앱 문의 비활성, 公式SNS 핸드오프. '
  'true=운영자가 직접 등록 또는 claim 완료 — 인앱 DM 활성.';

-- 2. 기존 행 전부 true 로 백필
--    (현행 동작 보존 — 지금까지 등록된 동아리는 그대로 인앱 문의 가능)
UPDATE public.circles SET is_claimed = true;

-- 3. 권한 정책:
--    - authenticated UPDATE 화이트리스트에 is_claimed 는 넣지 않는다.
--      (일반 사용자가 임의로 claim 할 수 없도록)
--    - INSERT 는 submitRegistration(본인 등록)에서 is_claimed=true 를 명시적으로 넘기므로
--      INSERT 컬럼 목록에는 추가 GRANT 불필요 (Supabase 의 INSERT 는 컬럼 화이트리스트가 없음).
--    - UPDATE 는 007c 마이그레이션의 화이트리스트에서 is_claimed 를 제외한 채로 유지.
--      → service_role / admin RPC 에서만 변경 가능.

-- 확인용 (마이그레이션 검증 시 주석 해제)
-- SELECT id, name, is_claimed FROM public.circles LIMIT 5;
