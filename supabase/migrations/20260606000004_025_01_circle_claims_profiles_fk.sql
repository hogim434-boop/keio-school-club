-- M-025-01: circle_claims.requester_id FK 교체 — auth.users → public.profiles
-- PostgREST 가 public 스키마 내 FK 를 통해 JOIN 할 수 있도록 교체.
-- profiles.id = auth.users.id (1:1 트리거) 이므로 데이터 정합성 동일.

-- 1. 기존 FK 삭제 (auth.users 참조)
ALTER TABLE public.circle_claims
  DROP CONSTRAINT circle_claims_requester_id_fkey;

-- 2. profiles(id) 를 참조하는 FK 추가
ALTER TABLE public.circle_claims
  ADD CONSTRAINT circle_claims_requester_id_fkey
  FOREIGN KEY (requester_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
