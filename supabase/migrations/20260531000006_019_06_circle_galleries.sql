-- T-005-1: circle_galleries 테이블
-- 활동 갤러리 (B축 핵심) — 동아리별 사진 아카이브
-- Phase 1-1 마이그레이션: circle_members 보다 먼저 적용 (의존성 없음)

-- ─── 1. 테이블 생성 ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.circle_galleries (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id    uuid        NOT NULL REFERENCES public.circles(id)  ON DELETE CASCADE,
  uploaded_by  uuid                    REFERENCES public.profiles(id) ON DELETE SET NULL,
  image_url    text        NOT NULL,
  caption      text        NOT NULL DEFAULT '',
  taken_at     timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.circle_galleries               IS '활동 갤러리 (T-005-1). 동아리별 사진 아카이브.';
COMMENT ON COLUMN public.circle_galleries.circle_id    IS '소속 동아리 FK (circles.id)';
COMMENT ON COLUMN public.circle_galleries.uploaded_by  IS '업로드 한 사용자 FK (profiles.id). 탈퇴 시 NULL';
COMMENT ON COLUMN public.circle_galleries.image_url    IS 'Storage 퍼블릭 URL';
COMMENT ON COLUMN public.circle_galleries.caption      IS '사진 설명 (빈 문자열 허용)';
COMMENT ON COLUMN public.circle_galleries.taken_at     IS '촬영 일시 (선택)';

-- ─── 2. 인덱스 ────────────────────────────────────────────────────────────
-- circle_id 로 갤러리 목록 조회 시 사용되는 인덱스
CREATE INDEX IF NOT EXISTS idx_circle_galleries_circle_id
  ON public.circle_galleries (circle_id);

-- created_at 역순 정렬 인덱스 (최신 사진 먼저)
CREATE INDEX IF NOT EXISTS idx_circle_galleries_created_at
  ON public.circle_galleries (created_at DESC);

-- ─── 3. RLS 활성화 ───────────────────────────────────────────────────────
ALTER TABLE public.circle_galleries ENABLE ROW LEVEL SECURITY;

-- ─── 4. RLS 정책 ─────────────────────────────────────────────────────────

-- [SELECT] 모두 허용 — anon 포함 공개 갤러리
CREATE POLICY circle_galleries_select
  ON public.circle_galleries
  FOR SELECT
  USING (true);

-- [INSERT / UPDATE / DELETE] 동아리 owner·staff 또는 admin 만 허용
-- 순환 의존 방지: is_circle_staff() 미사용, circles.owner_id 직접 비교
CREATE POLICY circle_galleries_write
  ON public.circle_galleries
  FOR ALL        -- INSERT, UPDATE, DELETE 포괄
  USING (
    -- admin 체크 (Phase 0 헬퍼 재사용)
    is_admin()
    OR
    -- 해당 동아리의 owner 본인인지 직접 확인
    EXISTS (
      SELECT 1
      FROM   public.circles c
      WHERE  c.id       = circle_galleries.circle_id
        AND  c.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    is_admin()
    OR
    EXISTS (
      SELECT 1
      FROM   public.circles c
      WHERE  c.id       = circle_galleries.circle_id
        AND  c.owner_id = auth.uid()
    )
  );

-- ─── 5. GRANT ─────────────────────────────────────────────────────────────
-- 컬럼 GRANT 함정 방지: 테이블 레벨 GRANT 명시
GRANT SELECT ON public.circle_galleries TO anon;
GRANT SELECT ON public.circle_galleries TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.circle_galleries TO authenticated;
