-- ============================================================
-- M-025: circle_claims 테이블 — 동아리 권한 이양(claim) 기능
-- 목적: 시드 등록된 미claim 동아리를 실제 운영자가 인수 신청 → admin 수동 승인
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. 테이블 생성
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.circle_claims (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id     uuid        NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  requester_id  uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_note  text        NOT NULL,           -- 신청자 본인 증명 정보(공식 SNS/연락처 등)
  status        text        NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  reviewed_at   timestamptz,
  reviewed_by   uuid        REFERENCES auth.users(id)
);

COMMENT ON TABLE public.circle_claims IS
  '동아리 권한 이양 신청 테이블. 미claim 동아리(circles.is_claimed=false)에 대해 '
  '실제 운영자가 신청(pending) → admin이 수동 승인(approved)/거부(rejected)하는 플로우.';

COMMENT ON COLUMN public.circle_claims.contact_note IS
  '신청자가 입력한 본인 증명 정보. 공식 SNS URL, 연락처, 운영자임을 증명하는 한 마디 등.';

-- ─────────────────────────────────────────────────────────────
-- 2. 인덱스
-- ─────────────────────────────────────────────────────────────
-- 중복 신청 방지: 같은 동아리에 같은 사용자가 pending 상태로 2건 이상 신청 불가
CREATE UNIQUE INDEX circle_claims_unique_pending
  ON public.circle_claims (circle_id, requester_id)
  WHERE status = 'pending';

-- 관리자 큐 조회 최적화: pending 우선 + 최신순
CREATE INDEX circle_claims_status_created_at_idx
  ON public.circle_claims (status, created_at DESC);

-- 본인 신청 내역 조회 최적화
CREATE INDEX circle_claims_requester_id_idx
  ON public.circle_claims (requester_id);

-- ─────────────────────────────────────────────────────────────
-- 3. RLS 활성화
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.circle_claims ENABLE ROW LEVEL SECURITY;

-- INSERT: 인증된 사용자가 본인 이름으로, 아직 claim 안 된 동아리에만 신청 가능
CREATE POLICY circle_claims_insert_authenticated
  ON public.circle_claims
  FOR INSERT
  TO authenticated
  WITH CHECK (
    requester_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.circles
      WHERE id = circle_id
        AND is_claimed = false
    )
  );

-- SELECT(본인): 자신의 신청 내역만 조회 가능
CREATE POLICY circle_claims_select_own
  ON public.circle_claims
  FOR SELECT
  TO authenticated
  USING (requester_id = auth.uid());

-- SELECT(admin): admin은 전체 조회 가능 — is_admin() 헬퍼 활용 (기존 패턴 동일)
CREATE POLICY circle_claims_select_admin
  ON public.circle_claims
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'admin'
    )
  );

-- UPDATE(admin): admin은 전체 행 UPDATE 가능 (RPC 내부에서 사용)
-- 일반 사용자의 UPDATE는 금지 — is_claimed 보호 원칙과 일관
CREATE POLICY circle_claims_update_admin
  ON public.circle_claims
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'admin'
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 4. GRANT — authenticated 에 select, insert 부여
--    (admin UPDATE는 RPC SECURITY DEFINER 에서 처리)
-- ─────────────────────────────────────────────────────────────
GRANT SELECT, INSERT ON public.circle_claims TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- 5. RPC: approve_circle_claim
--    SECURITY DEFINER — 호출자 권한 대신 함수 정의자(service_role) 권한으로 실행
--    처리: admin 검증 → circles.owner_id + is_claimed 갱신 → claims.status 갱신
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.approve_circle_claim(p_claim_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claim     record;
  v_caller_id uuid := auth.uid();
BEGIN
  -- 1. 호출자 admin 검증
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_caller_id AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'permission_denied: caller is not admin';
  END IF;

  -- 2. claim 조회
  SELECT * INTO v_claim
  FROM public.circle_claims
  WHERE id = p_claim_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found: claim % does not exist', p_claim_id;
  END IF;

  -- 3. 이미 처리된 claim 재처리 방지
  IF v_claim.status <> 'pending' THEN
    RAISE EXCEPTION 'already_processed: claim status is %', v_claim.status;
  END IF;

  -- 4. 대상 동아리가 아직 미claim 상태인지 확인 (방어 코드)
  IF NOT EXISTS (
    SELECT 1 FROM public.circles
    WHERE id = v_claim.circle_id AND is_claimed = false
  ) THEN
    RAISE EXCEPTION 'already_claimed: circle % is already claimed', v_claim.circle_id;
  END IF;

  -- 5. circles 갱신: owner_id 이전 + is_claimed = true
  UPDATE public.circles
  SET owner_id  = v_claim.requester_id,
      is_claimed = true
  WHERE id = v_claim.circle_id;

  -- 6. claim 상태 갱신
  UPDATE public.circle_claims
  SET status      = 'approved',
      reviewed_at = now(),
      reviewed_by = v_caller_id
  WHERE id = p_claim_id;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 6. RPC: reject_circle_claim
--    SECURITY DEFINER — admin 검증 후 status='rejected' 로 갱신
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.reject_circle_claim(p_claim_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claim     record;
  v_caller_id uuid := auth.uid();
BEGIN
  -- 1. 호출자 admin 검증
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_caller_id AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'permission_denied: caller is not admin';
  END IF;

  -- 2. claim 조회
  SELECT * INTO v_claim
  FROM public.circle_claims
  WHERE id = p_claim_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found: claim % does not exist', p_claim_id;
  END IF;

  -- 3. 이미 처리된 claim 재처리 방지
  IF v_claim.status <> 'pending' THEN
    RAISE EXCEPTION 'already_processed: claim status is %', v_claim.status;
  END IF;

  -- 4. claim 상태 갱신
  UPDATE public.circle_claims
  SET status      = 'rejected',
      reviewed_at = now(),
      reviewed_by = v_caller_id
  WHERE id = p_claim_id;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 7. RPC EXECUTE GRANT — authenticated 에 부여, anon 은 명시적 회수
--    (RPC 내부에서 admin 여부를 검증하므로 일반 사용자 호출은 예외 발생)
-- ─────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.approve_circle_claim(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_circle_claim(uuid)  TO authenticated;
REVOKE EXECUTE ON FUNCTION public.approve_circle_claim(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.reject_circle_claim(uuid)  FROM anon;
