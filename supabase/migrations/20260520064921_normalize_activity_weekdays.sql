-- activity_days(text) 에서 요일을 추출하는 IMMUTABLE 파서 함수.
-- 규칙 1: "X曜" 형식 → X 가 요일 (예: 第3水曜日→水). "曜日"의 日은 X 가 아니므로 제외.
-- 규칙 2: "曜" 가 전혀 없는 bare 형식 → "・" 토큰이 요일 (예: 月・水・金).
CREATE OR REPLACE FUNCTION parse_activity_weekdays(src text)
RETURNS text[] LANGUAGE sql IMMUTABLE AS $$
  SELECT COALESCE(ARRAY(
    SELECT wd FROM unnest(ARRAY['月','火','水','木','金','土','日']) AS wd
    WHERE src LIKE '%' || wd || '曜%'
       OR (position('曜' in src) = 0
           AND wd = ANY(string_to_array(src, '・')))
  ), '{}');
$$;

-- 필터 전용 생성 컬럼 — activity_days 에서 자동 추출, 쓰기마다 자동 유지.
ALTER TABLE circles
  ADD COLUMN activity_weekdays text[]
  GENERATED ALWAYS AS (parse_activity_weekdays(activity_days)) STORED;
