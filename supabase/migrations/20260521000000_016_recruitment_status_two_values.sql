-- 모집 상태 2분류 개편: open(現在募集中) 제거 → newcomer_only(新歓シーズン) + year_round(通年募集)
-- 「지금 가입 가능」 중심으로 단순화. '실시간 상태(open)'와 '모집 정책'이 섞이는 혼란을 제거하고,
-- 기존 open 행은 year_round(언제든 가입 OK)로 이관한다.

-- 1. 기본값 제거 — old enum 의 'open' 참조를 끊어야 타입 재생성 가능
ALTER TABLE circles ALTER COLUMN recruitment_status DROP DEFAULT;

-- 2. 'open' 데이터를 'year_round' 로 이관
UPDATE circles SET recruitment_status = 'year_round' WHERE recruitment_status = 'open';

-- 3. enum 재생성 (open 제거). Postgres 는 enum 값 직접 삭제가 불가하므로 타입을 새로 만든다.
ALTER TYPE recruitment_status_enum RENAME TO recruitment_status_enum_old;
CREATE TYPE recruitment_status_enum AS ENUM ('newcomer_only', 'year_round');
ALTER TABLE circles
  ALTER COLUMN recruitment_status TYPE recruitment_status_enum
  USING recruitment_status::text::recruitment_status_enum;
DROP TYPE recruitment_status_enum_old;

-- 4. 새 기본값 — 통년 모집(언제든 가입 OK)을 안전한 기본값으로
ALTER TABLE circles ALTER COLUMN recruitment_status SET DEFAULT 'year_round';
