-- ============================================================
-- T-007 M-007c: circles 컬럼 권한 재설계
-- T-006 컬럼 REVOKE가 테이블 수준 GRANT ALL 때문에 무효화된 상태 수정
-- 올바른 방법: 테이블 UPDATE REVOKE → 허용 컬럼만 재 GRANT
-- ============================================================

-- ① anon: circles UPDATE 전체 회수
REVOKE UPDATE ON public.circles FROM anon;

-- ② authenticated: circles UPDATE 전체 회수
REVOKE UPDATE ON public.circles FROM authenticated;

-- ③ authenticated에게 업데이트 허용 컬럼만 GRANT (inquiry_count, view_count, role 제외)
GRANT UPDATE (
  name,
  category,
  official_type,
  activity_frequency,
  annual_fee_yen,
  description,
  activity_days,
  member_count,
  recruitment_status,
  activity_time_band,
  cover_image_url,
  contact_instagram,
  contact_x,
  contact_line,
  submission_note,
  pledge_accepted_at,
  updated_at
) ON public.circles TO authenticated;

-- ④ anon: circles UPDATE 없음 (SELECT/INSERT만 — Supabase 기본 설정, RLS가 실제 통제)
--    anon은 서클 수정 불가 (RLS owner 정책이 막지만, 컬럼 권한도 없어야 함)
--    단, SELECT는 필요하므로 유지

COMMENT ON TABLE public.circles IS '단체 핵심 테이블 (T-005). annual_fee_yen 보존 (정책 박스 💴 UI 만 제거), freshmen_ratio 미포함. T-007c: inquiry_count/view_count/role UPDATE 권한 회수 (anon/authenticated).';

-- ⑤ admin 전용 컬럼: status, reviewed_by, reviewed_at, rejection_reason
--    이 컬럼들은 T-006 is_admin() 정책으로 보호 + UPDATE 권한도 제한
--    authenticated에게 UPDATE 없음 (이미 위에서 회수됨)
--    service_role/postgres는 전체 권한 유지 (관리자 작업용)
