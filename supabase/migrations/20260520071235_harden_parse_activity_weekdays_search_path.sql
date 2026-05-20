-- 직전 normalize_activity_weekdays 마이그레이션에서 누락된 search_path 고정 (security advisor 보강).
-- 본문은 동일(요일 파서) — pg_catalog 내장 함수만 사용하므로 search_path='' 안전.
-- 생성 컬럼 activity_weekdays 가 이 함수에 의존하나, 시그니처·반환형 불변이라 CREATE OR REPLACE 안전.
CREATE OR REPLACE FUNCTION public.parse_activity_weekdays(src text)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
SET search_path TO ''
AS $$
  SELECT COALESCE(ARRAY(
    SELECT wd FROM unnest(ARRAY['月','火','水','木','金','土','日']) AS wd
    WHERE src LIKE '%' || wd || '曜%'
       OR (position('曜' in src) = 0
           AND wd = ANY(string_to_array(src, '・')))
  ), '{}');
$$;
