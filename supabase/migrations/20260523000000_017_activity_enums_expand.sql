-- ============================================================
-- 017: 活動頻度 · 活動時間帯 enum 값 확장 (2026-05)
--
-- 1) activity_frequency_enum
--    - 'daily'(毎日) · 'weekly_3_4'(週3-4回) 추가
--    - 기존 weekly_1 / weekly_2_3 / monthly 는 그대로 유지
--
-- 2) activity_time_band_enum
--    - 'morning'(朝) / 'noon'(昼) / 'evening'(夜) / 'irregular'(不定期) 추가
--    - 기존 weekday_day / weekday_night / weekend 는 레거시로 잔존(UI 미노출,
--      구 데이터 표시 호환용으로만 라벨 유지)
--
-- ADD VALUE 는 멱등(IF NOT EXISTS)이라 재실행해도 안전.
-- 신규 값을 같은 트랜잭션에서 곧바로 사용하지는 않으므로 PG12+ 에서 문제 없음.
-- 관련 상수: lib/constants/activity-frequency.ts · lib/constants/activity-time-band.ts
-- ============================================================

ALTER TYPE public.activity_frequency_enum ADD VALUE IF NOT EXISTS 'daily';
ALTER TYPE public.activity_frequency_enum ADD VALUE IF NOT EXISTS 'weekly_3_4';

ALTER TYPE public.activity_time_band_enum ADD VALUE IF NOT EXISTS 'morning';
ALTER TYPE public.activity_time_band_enum ADD VALUE IF NOT EXISTS 'noon';
ALTER TYPE public.activity_time_band_enum ADD VALUE IF NOT EXISTS 'evening';
ALTER TYPE public.activity_time_band_enum ADD VALUE IF NOT EXISTS 'irregular';
