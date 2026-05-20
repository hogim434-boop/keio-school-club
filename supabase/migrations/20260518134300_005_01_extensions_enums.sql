-- M-005-01: Extensions + 8 Enums
-- T-005 DB 스키마 마이그레이션 1차 — Phase 1.2 출발점
-- SSOT: lib/constants/*.ts (as const 값과 1:1 일치)

-- 1. moddatetime 확장 (extensions 스키마, Supabase 권장)
CREATE EXTENSION IF NOT EXISTS moddatetime SCHEMA extensions;

-- 2. 8개 enum 생성 — lib/constants/* SSOT 1:1 인용

-- category_enum (8종) — lib/constants/category.ts
CREATE TYPE public.category_enum AS ENUM (
  'sports',
  'culture_art',
  'music',
  'academic',
  'international',
  'event',
  'volunteer',
  'media'
);

-- official_type_enum (5종, DB 보존 / UI 는 athletics·intercollegiate 2종만 노출) — lib/constants/official-type.ts
CREATE TYPE public.official_type_enum AS ENUM (
  'athletics',
  'official',
  'unofficial',
  'intercollegiate',
  'other'
);

-- activity_frequency_enum (3종) — lib/constants/activity-frequency.ts
CREATE TYPE public.activity_frequency_enum AS ENUM (
  'weekly_1',
  'weekly_2_3',
  'monthly'
);

-- circle_status_enum (3종) — lib/constants/circle-status.ts
CREATE TYPE public.circle_status_enum AS ENUM (
  'pending',
  'approved',
  'rejected'
);

-- tag_kind_enum (4종) — lib/constants/tag-kind.ts
CREATE TYPE public.tag_kind_enum AS ENUM (
  'atmosphere',
  'cost',
  'frequency',
  'gender'
);

-- recruitment_status_enum (3종, 신규) — lib/constants/recruitment-status.ts
CREATE TYPE public.recruitment_status_enum AS ENUM (
  'open',
  'newcomer_only',
  'year_round'
);

-- activity_time_band_enum (3종, 신규) — lib/constants/activity-time-band.ts
CREATE TYPE public.activity_time_band_enum AS ENUM (
  'weekday_day',
  'weekday_night',
  'weekend'
);

-- activity_report_type_enum (5종, 신규) — lib/constants/activity-report-type.ts
CREATE TYPE public.activity_report_type_enum AS ENUM (
  'practice',
  'camp',
  'event',
  'meeting',
  'other'
);
