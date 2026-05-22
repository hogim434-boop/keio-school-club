/**
 * lib/circles/submit-activity-report.ts
 *
 * 역할:
 *  - 활동 리포트 작성·수정·삭제 폼 제출 시 실행되는 메인 비즈니스 로직
 *  - 브라우저(Client Component) 전용 — createClient() 브라우저 클라이언트 사용
 *
 * 제출 순서 (submit-registration.ts 구조를 모방, 순차 실행):
 *  1. 인증 확인 → 미로그인이면 즉시 { error } 반환
 *  2. activity_reports 테이블 INSERT → reportId 획득 (핵심 단계)
 *  3. imageFiles 각각 uploadReportImage → URL 수집 (best-effort)
 *  4. activity_report_images INSERT + 첫 이미지를 activity_reports.image_url 에 UPDATE (best-effort)
 *
 * 에러 처리 정책:
 *  - activity_reports INSERT/UPDATE/DELETE 실패만 { error: string } 반환
 *  - 이미지 업로드·갤러리 INSERT 실패는 best-effort (글 자체는 생성된 상태 유지, console.error 로깅)
 *
 * 주의:
 *  - 이 파일은 "use client" 컴포넌트에서만 호출해야 합니다
 *  - Server Action / Route Handler 에서는 lib/supabase/server.ts 의 createClient() 사용
 *  - uploadReportImage 는 Canvas API 를 사용하므로 브라우저 전용
 */

import { createClient } from "@/lib/supabase/client";
import { uploadReportImage } from "@/lib/storage/strip-exif";
import type { ReportValues } from "./report-schema";

// ─────────────────────────────────────────
// 이미지 통합 모델 (작성/수정 공용)
// ─────────────────────────────────────────

/**
 * 이미지 아이템 — 기존 URL 이미지(existing)와 새로 업로드할 File(new)을 통합.
 *
 * - existing: DB 에 이미 저장된 이미지. url 은 Supabase Storage 의 공개 URL.
 * - new: 사용자가 새로 선택한 이미지 파일.
 *
 * 수정 폼에서 기존 이미지를 유지하거나 삭제하고 새 이미지를 추가할 때 이 타입으로 관리.
 */
export type ReportImageItem = { kind: "existing"; url: string } | { kind: "new"; file: File };

// ─────────────────────────────────────────
// 반환 타입
// ─────────────────────────────────────────

/** 등록 성공 시 반환값 */
type SubmitSuccess = { ok: true; id: string };

/** 등록 실패 시 반환값 */
type SubmitError = { error: string };

/** submitActivityReport 반환 유니언 타입 */
export type SubmitReportResult = SubmitSuccess | SubmitError;

/** 수정 성공 시 반환값 */
type UpdateSuccess = { ok: true };

/** updateActivityReport 반환 유니언 타입 */
export type UpdateReportResult = UpdateSuccess | SubmitError;

/** 삭제 성공 시 반환값 */
type DeleteSuccess = { ok: true };

/** deleteActivityReport 반환 유니언 타입 */
export type DeleteReportResult = DeleteSuccess | SubmitError;

// ─────────────────────────────────────────
// 메인 함수
// ─────────────────────────────────────────

/**
 * 활동 리포트 폼 데이터를 Supabase 에 저장합니다.
 *
 * @param circleId   - 리포트를 등록할 서클 UUID
 * @param values     - reportSchema 로 검증된 폼 값
 * @param imageFiles - 업로드할 이미지 파일 배열 (0~8장, 폼 밖 state 에서 전달)
 * @returns 성공 시 { ok: true; id: string }, 실패 시 { error: string }
 *
 * @example
 * const result = await submitActivityReport(circleId, formValues, imageFiles);
 * if ("error" in result) {
 *   toast.error(result.error);
 * } else {
 *   toast.success("投稿しました");
 *   router.refresh();
 * }
 */
export async function submitActivityReport(
  circleId: string,
  values: ReportValues,
  imageFiles: File[]
): Promise<SubmitReportResult> {
  // 브라우저 클라이언트 생성 (Client Component 전용)
  const supabase = createClient();

  // ── 단계 1: 인증 확인 ─────────────────────────────────

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // 미로그인 — proxy.ts 가 보호하지만 클라이언트 사이드 이중 검사로 안전성 확보
    return { error: "ログインが必要です。再度ログインしてください。" };
  }

  // ── 단계 2: activity_reports INSERT (핵심 단계) ────────

  // 활동 날짜(任意) — 설정 시 created_at 으로 저장(표시·정렬 기준), 미설정 시 키 생략 → DB default now().
  // "YYYY-MM-DD" → ISO. 표시(formatJpDate)는 날짜 부분만 쓰므로 timezone 영향 없음.
  const createdAtField =
    values.event_date && values.event_date.trim()
      ? { created_at: new Date(values.event_date).toISOString() }
      : {};

  const { data: reportRow, error: insertError } = await supabase
    .from("activity_reports")
    .insert({
      circle_id: circleId,
      title: values.title,
      body: values.body,
      // content 는 body 와 동일한 내용 저장 (목록 요약은 표시단 line-clamp 로 처리)
      content: values.body,
      // activity_type: undefined → null (DB nullable)
      activity_type: values.activity_type ?? null,
      // location: 빈 문자열 → null (DB 컬럼 nullable, 빈 문자열 혼재 방지)
      location: values.location?.trim() || null,
      // 활동 날짜 설정 시에만 created_at 포함 (미설정 시 default now())
      ...createdAtField,
    })
    .select("id")
    .single();

  if (insertError || !reportRow) {
    // activity_reports INSERT 실패 — 전체 실패로 처리
    const message = insertError?.message ?? "投稿に失敗しました";
    return { error: message };
  }

  const reportId = reportRow.id;

  // ── 단계 3 + 4: 이미지 업로드 + 갤러리 INSERT (best-effort) ──

  if (imageFiles.length > 0) {
    try {
      // 이미지 순차 업로드 — 성공한 것만 URL 수집 (sort_order = index)
      const uploadedUrls: string[] = [];

      for (const file of imageFiles) {
        const uploadResult = await uploadReportImage(supabase, circleId, reportId, file);

        if ("url" in uploadResult) {
          uploadedUrls.push(uploadResult.url);
        } else {
          // 개별 이미지 실패 — best-effort, 나머지 계속 진행
          console.error("[submitActivityReport] 이미지 업로드 실패:", uploadResult.error);
        }
      }

      if (uploadedUrls.length > 0) {
        // activity_report_images 에 성공한 이미지들 INSERT
        const imageRows = uploadedUrls.map((url, index) => ({
          report_id: reportId,
          image_url: url,
          sort_order: index,
        }));

        const { error: imagesInsertError } = await supabase
          .from("activity_report_images")
          .insert(imageRows);

        if (imagesInsertError) {
          // 갤러리 INSERT 실패 — best-effort
          console.error(
            "[submitActivityReport] activity_report_images INSERT 실패:",
            imagesInsertError
          );
        }

        // 첫 번째 이미지 URL 을 activity_reports.image_url(썸네일)로 UPDATE
        const { error: thumbnailUpdateError } = await supabase
          .from("activity_reports")
          .update({ image_url: uploadedUrls[0] })
          .eq("id", reportId);

        if (thumbnailUpdateError) {
          // 썸네일 UPDATE 실패 — best-effort
          console.error("[submitActivityReport] image_url UPDATE 실패:", thumbnailUpdateError);
        }
      }
    } catch (err) {
      // 예상치 못한 에러 — best-effort
      console.error("[submitActivityReport] 이미지 처리 중 예외 발생:", err);
    }
  }

  // 모든 핵심 단계 성공
  return { ok: true, id: reportId };
}

// ─────────────────────────────────────────
// 수정 함수
// ─────────────────────────────────────────

/**
 * 활동 리포트를 수정합니다.
 *
 * 처리 순서:
 *  1. 인증 확인 → 미로그인이면 { error } 반환
 *  2. activity_reports UPDATE (title, body, content, activity_type, location, created_at)
 *  3. 기존 activity_report_images 전부 DELETE
 *  4. images 배열 순서대로 재삽입:
 *     - existing: url 그대로 사용
 *     - new: uploadReportImage 후 url 획득
 *  5. 첫 이미지 url 을 activity_reports.image_url 로 UPDATE (best-effort)
 *
 * @param reportId  - 수정할 리포트 UUID
 * @param circleId  - 소속 서클 UUID (uploadReportImage 에 필요)
 * @param values    - reportSchema 로 검증된 폼 값
 * @param images    - 통합 이미지 배열 (existing url + new File 혼합)
 * @returns 성공 시 { ok: true }, 실패 시 { error: string }
 */
export async function updateActivityReport(
  reportId: string,
  circleId: string,
  values: ReportValues,
  images: ReportImageItem[]
): Promise<UpdateReportResult> {
  // 브라우저 클라이언트 생성 (Client Component 전용)
  const supabase = createClient();

  // ── 단계 1: 인증 확인 ─────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "ログインが必要です。再度ログインしてください。" };
  }

  // ── 단계 2: activity_reports UPDATE ────────────────────
  // event_date → ISO 문자열 변환. created_at 을 활동 날짜로 사용하는 설계이므로
  // 수정 시에도 동일하게 갱신.
  const createdAt = new Date(values.event_date).toISOString();

  const { error: updateError } = await supabase
    .from("activity_reports")
    .update({
      title: values.title,
      body: values.body,
      content: values.body,
      activity_type: values.activity_type ?? null,
      location: values.location?.trim() || null,
      created_at: createdAt,
    })
    .eq("id", reportId);

  if (updateError) {
    return { error: updateError.message ?? "更新に失敗しました" };
  }

  // ── 단계 3: 기존 activity_report_images 전부 DELETE ────
  // 삭제 실패 시에도 계속 진행 (best-effort — 이후 재삽입이 더 중요)
  const { error: deleteImagesError } = await supabase
    .from("activity_report_images")
    .delete()
    .eq("report_id", reportId);

  if (deleteImagesError) {
    console.error("[updateActivityReport] 기존 이미지 DELETE 실패:", deleteImagesError);
  }

  // ── 단계 4+5: 이미지 재삽입 + 썸네일 UPDATE (best-effort) ──
  if (images.length > 0) {
    try {
      const uploadedUrls: string[] = [];

      for (const item of images) {
        if (item.kind === "existing") {
          // 기존 이미지 — URL 그대로 사용
          uploadedUrls.push(item.url);
        } else {
          // 새 이미지 — Storage 업로드
          const uploadResult = await uploadReportImage(supabase, circleId, reportId, item.file);
          if ("url" in uploadResult) {
            uploadedUrls.push(uploadResult.url);
          } else {
            console.error("[updateActivityReport] 이미지 업로드 실패:", uploadResult.error);
          }
        }
      }

      if (uploadedUrls.length > 0) {
        // activity_report_images 재삽입 (sort_order = 배열 인덱스)
        const imageRows = uploadedUrls.map((url, index) => ({
          report_id: reportId,
          image_url: url,
          sort_order: index,
        }));

        const { error: imagesInsertError } = await supabase
          .from("activity_report_images")
          .insert(imageRows);

        if (imagesInsertError) {
          console.error(
            "[updateActivityReport] activity_report_images INSERT 실패:",
            imagesInsertError
          );
        }

        // 첫 번째 이미지 URL 을 썸네일로 UPDATE
        const { error: thumbnailError } = await supabase
          .from("activity_reports")
          .update({ image_url: uploadedUrls[0] })
          .eq("id", reportId);

        if (thumbnailError) {
          console.error("[updateActivityReport] image_url UPDATE 실패:", thumbnailError);
        }
      } else {
        // 이미지가 전부 제거된 경우 → image_url null 로 초기화
        const { error: clearThumbnailError } = await supabase
          .from("activity_reports")
          .update({ image_url: null })
          .eq("id", reportId);

        if (clearThumbnailError) {
          console.error("[updateActivityReport] image_url null UPDATE 실패:", clearThumbnailError);
        }
      }
    } catch (err) {
      console.error("[updateActivityReport] 이미지 처리 중 예외 발생:", err);
    }
  } else {
    // images 배열 자체가 빈 경우 → 썸네일 null 로 초기화
    try {
      await supabase.from("activity_reports").update({ image_url: null }).eq("id", reportId);
    } catch (err) {
      console.error("[updateActivityReport] image_url null 초기화 예외:", err);
    }
  }

  return { ok: true };
}

// ─────────────────────────────────────────
// 삭제 함수
// ─────────────────────────────────────────

/**
 * 활동 리포트를 삭제합니다.
 *
 * RLS 정책 `activity_reports_delete_owner_or_admin` 이 소유자 삭제를 허용.
 * `activity_report_images` 는 ON DELETE CASCADE 이므로 이미지 행은 자동 정리됨.
 *
 * @param reportId - 삭제할 리포트 UUID
 * @returns 성공 시 { ok: true }, 실패 시 { error: string }
 */
export async function deleteActivityReport(reportId: string): Promise<DeleteReportResult> {
  const supabase = createClient();

  // ── 인증 확인 ─────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "ログインが必要です。再度ログインしてください。" };
  }

  // ── activity_reports DELETE (CASCADE 로 이미지 자동 정리) ──
  const { error: deleteError } = await supabase
    .from("activity_reports")
    .delete()
    .eq("id", reportId);

  if (deleteError) {
    return { error: deleteError.message ?? "削除に失敗しました" };
  }

  return { ok: true };
}
