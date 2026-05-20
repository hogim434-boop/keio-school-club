-- ============================================================
-- T-007 M-007b: Supabase 자동 anon EXECUTE 제거 보강
-- increment_inquiry_count 는 authenticated 전용 — anon REVOKE
-- ============================================================

-- Supabase 가 CREATE FUNCTION 후 anon 에게 자동 EXECUTE 부여하는 현상 대응
REVOKE EXECUTE ON FUNCTION public.increment_inquiry_count(uuid) FROM anon;

-- 최종 확인용: authenticated 만 남아야 함
-- (검증은 routine_privileges 조회로 별도 수행)
