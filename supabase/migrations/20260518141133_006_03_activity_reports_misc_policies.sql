-- ============================================================
-- M-006-03: 활동 리포트 + 보조 테이블 RLS 정책
-- ============================================================
-- 대상: activity_reports, activity_report_images, app_settings
-- inquiry_events: 의도된 deny (정책 0건) — T-007 RPC SECURITY DEFINER만 INSERT
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- [1] activity_reports 정책 (4개)
-- ────────────────────────────────────────────────────────────

-- 부모 서클이 approved이거나 오너/관리자면 활동 리포트 조회 가능 (anon 포함)
CREATE POLICY activity_reports_select_public
  ON public.activity_reports
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.circles c
      WHERE c.id = circle_id
        AND (
          c.status = 'approved'
          OR c.owner_id = auth.uid()
          OR is_admin()
        )
    )
  );

-- 부모 서클 오너 또는 관리자만 활동 리포트 작성 가능
CREATE POLICY activity_reports_insert_owner_or_admin
  ON public.activity_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.circles c
      WHERE c.id = circle_id
        AND (c.owner_id = auth.uid() OR is_admin())
    )
  );

-- 부모 서클 오너 또는 관리자만 활동 리포트 수정 가능
CREATE POLICY activity_reports_update_owner_or_admin
  ON public.activity_reports
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.circles c
      WHERE c.id = circle_id
        AND (c.owner_id = auth.uid() OR is_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.circles c
      WHERE c.id = circle_id
        AND (c.owner_id = auth.uid() OR is_admin())
    )
  );

-- 부모 서클 오너 또는 관리자만 활동 리포트 삭제 가능
CREATE POLICY activity_reports_delete_owner_or_admin
  ON public.activity_reports
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.circles c
      WHERE c.id = circle_id
        AND (c.owner_id = auth.uid() OR is_admin())
    )
  );


-- ────────────────────────────────────────────────────────────
-- [2] activity_report_images 정책 (2개)
-- ────────────────────────────────────────────────────────────
-- 2단계 EXISTS: activity_reports → circles 조인으로 부모 가시성 확인

-- 조회: 리포트의 부모 서클이 approved이거나 오너/관리자면 이미지 조회 가능
CREATE POLICY activity_report_images_select_public
  ON public.activity_report_images
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.activity_reports ar
      JOIN public.circles c ON c.id = ar.circle_id
      WHERE ar.id = report_id
        AND (
          c.status = 'approved'
          OR c.owner_id = auth.uid()
          OR is_admin()
        )
    )
  );

-- 쓰기: 리포트의 부모 서클 오너 또는 관리자만 이미지 추가/수정/삭제 가능
CREATE POLICY activity_report_images_write_owner_or_admin
  ON public.activity_report_images
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.activity_reports ar
      JOIN public.circles c ON c.id = ar.circle_id
      WHERE ar.id = report_id
        AND (c.owner_id = auth.uid() OR is_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.activity_reports ar
      JOIN public.circles c ON c.id = ar.circle_id
      WHERE ar.id = report_id
        AND (c.owner_id = auth.uid() OR is_admin())
    )
  );


-- ────────────────────────────────────────────────────────────
-- [3] inquiry_events: 의도된 deny (정책 0건 유지)
-- ────────────────────────────────────────────────────────────
-- 이 테이블에는 RLS 정책을 추가하지 않습니다.
-- RLS가 활성화된 상태에서 정책이 없으면 모든 접근이 기본 거부됩니다.
-- T-007에서 SECURITY DEFINER RPC(increment_inquiry_count)가 유일한 INSERT 경로.
-- get_advisors에 INFO 1건 잔여 — 의도된 설계이므로 무시.
COMMENT ON TABLE public.inquiry_events IS
  'RLS deny-by-default (정책 0건 의도). T-007 increment_inquiry_count RPC(SECURITY DEFINER)만 INSERT 가능. UNIQUE(user_id, circle_id, event_date)로 일별 중복 방지.';


-- ────────────────────────────────────────────────────────────
-- [4] app_settings 정책 (2개)
-- ────────────────────────────────────────────────────────────

-- 앱 설정은 누구나 조회 가능 (비로그인 포함 — 운영 토글값 필요)
CREATE POLICY app_settings_select_all
  ON public.app_settings
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 앱 설정 추가/수정/삭제는 관리자만 가능
CREATE POLICY app_settings_write_admin
  ON public.app_settings
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
