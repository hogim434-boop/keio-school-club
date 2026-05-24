/**
 * lib/circles/submit-registration.ts
 *
 * 역할:
 *  - 서클 등록 폼 제출 시 실행되는 메인 비즈니스 로직
 *  - 브라우저(Client Component) 전용 — createClient() 브라우저 클라이언트 사용
 *
 * 제출 순서 (중요: 순차 실행, Supabase JS 는 멀티 트랜잭션 미지원):
 *  1. 인증 확인 → 미로그인이면 즉시 { error } 반환
 *  2. circles 테이블 INSERT → 실패 시 { error } 반환 (핵심 단계)
 *  3. coverFile 있으면 Storage 업로드 → 성공 시 cover_image_url UPDATE
 *     (best-effort: 실패해도 전체 실패 처리 하지 않음, console.error 로깅)
 *  4. tags 있으면 tags 테이블에서 slug→id 매핑 후 circle_tags INSERT
 *     (best-effort: 실패해도 전체 실패 처리 하지 않음, console.error 로깅)
 *
 * 에러 처리 정책:
 *  - circles INSERT 실패만 { error: string } 반환
 *  - 이미지·태그 실패는 best-effort (서클 자체는 생성된 상태 유지)
 *
 * 주의:
 *  - 이 파일은 "use client" 컴포넌트에서만 호출해야 합니다
 *  - Server Action / Route Handler 에서는 lib/supabase/server.ts 의 createClient() 사용
 */

import { createClient } from "@/lib/supabase/client";
import { uploadCoverCollectionImage } from "@/lib/storage/strip-exif";

import { makeCircleSlug } from "./slug";
import type { RegistrationValues } from "./registration-schema";
import { instagramHandleToUrl, xHandleToUrl, lineIdToUrl } from "./sns";

// ─────────────────────────────────────────
// 반환 타입
// ─────────────────────────────────────────

/** 등록 성공 시 반환값 */
type SubmitSuccess = { ok: true; id: string };

/** 등록 실패 시 반환값 */
type SubmitError = { error: string };

/** submitRegistration 반환 유니언 타입 */
export type SubmitRegistrationResult = SubmitSuccess | SubmitError;

// ─────────────────────────────────────────
// 메인 함수
// ─────────────────────────────────────────

/**
 * 서클 등록 폼 데이터를 Supabase 에 저장합니다.
 *
 * @param values - registrationSchema 로 검증된 폼 값
 * @param coverFiles - 커버 이미지 파일 배열 (최대 5장, 빈 배열이면 업로드 생략)
 * @returns 성공 시 { ok: true; id: string }, 실패 시 { error: string }
 *
 * @example
 * const result = await submitRegistration(formValues, selectedFiles);
 * if ("error" in result) {
 *   toast.error(result.error);
 * } else {
 *   router.push(`/circles/${result.id}`);
 * }
 */
export async function submitRegistration(
  values: RegistrationValues,
  coverFiles: File[]
): Promise<SubmitRegistrationResult> {
  // 브라우저 클라이언트 생성 (Client Component 전용)
  const supabase = createClient();

  // ── 단계 1: 인증 확인 ─────────────────────────────────

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // 미로그인 — proxy.ts 가 /circles/new 를 보호하고 있지만
    // 클라이언트 사이드 이중 검사로 안전성 확보
    return { error: "ログインが必要です。再度ログインしてください。" };
  }

  const ownerId = user.id;

  // ── 단계 2: circles 테이블 INSERT (핵심 단계) ─────────

  const slug = makeCircleSlug(values.name);

  const { data: circleRow, error: insertError } = await supabase
    .from("circles")
    .insert({
      name: values.name,
      category: values.category,
      official_type: values.official_type,
      activity_frequency: values.activity_frequency,
      // 모집 상태: 신규 등록은 募集中(year_round) 으로 고정 — 이후 마이페이지 토글로 조절.
      recruitment_status: "year_round",
      // 활동 시간대: 칩 다중 선택 배열 그대로 (빈 배열이면 '{}' 저장).
      activity_time_band: values.activity_time_band,
      // 활동 요일: ["月","水"] → "月・水" text 로 저장 → 생성 컬럼 activity_weekdays 자동 파싱.
      activity_days: values.activity_weekdays.join("・"),
      slug,
      // DB default 가 '' 이므로 undefined/null 대신 빈 문자열 보장
      description: values.description ?? "",
      // member_count → member_band 로 교체. 未選択(undefined) 은 null 로 저장.
      member_band: values.member_band ?? null,
      owner_id: ownerId,
      // 핸들/ID → 전체 URL 변환 후 저장
      // 빈 값(handleToUrl 결과가 "") 은 null 로 변환 (DB 컬럼 nullable)
      // instagramHandleToUrl("keio_tennis") → "https://instagram.com/keio_tennis"
      // xHandleToUrl("keio_tennis")         → "https://x.com/keio_tennis"
      // lineIdToUrl("@keio_tennis")         → "https://line.me/R/ti/p/%40keio_tennis"
      contact_instagram: instagramHandleToUrl(values.contact_instagram?.trim()) || null,
      contact_x: xHandleToUrl(values.contact_x?.trim()) || null,
      contact_line: lineIdToUrl(values.contact_line?.trim()) || null,
      // 서약 동의 시각 기록 (pledge1·pledge2 모두 z.literal(true) 로 보증됨)
      pledge_accepted_at: new Date().toISOString(),
      // status, annual_fee_yen 은 DB default('pending', 0) 을 사용하므로 미지정
    })
    .select("id")
    .single();

  if (insertError || !circleRow) {
    // circles INSERT 실패 — 전체 실패로 처리
    const message = insertError?.message ?? "サークルの登録に失敗しました";
    return { error: message };
  }

  const circleId = circleRow.id;

  // ── 단계 3: 커버 이미지 복수 업로드 → circle_images INSERT → cover_image_url 동기화 (best-effort) ──

  const safeFiles = coverFiles.slice(0, 5); // 최대 5장 방어
  if (safeFiles.length > 0) {
    try {
      // 각 파일을 순차 업로드해 URL 수집 (EXIF 제거 포함 — uploadCoverCollectionImage 내부)
      const uploadedUrls: string[] = [];
      for (const file of safeFiles) {
        const result = await uploadCoverCollectionImage(supabase, circleId, file);
        if ("url" in result) {
          uploadedUrls.push(result.url);
        } else {
          console.error("[submitRegistration] 커버 이미지 업로드 실패:", result.error);
        }
      }

      if (uploadedUrls.length > 0) {
        // circle_images 다건 INSERT (sort_order = 배열 인덱스)
        const imageRows = uploadedUrls.map((url, idx) => ({
          circle_id: circleId,
          image_url: url,
          sort_order: idx,
        }));
        const { error: imgInsertError } = await supabase.from("circle_images").insert(imageRows);
        if (imgInsertError) {
          console.error("[submitRegistration] circle_images INSERT 실패:", imgInsertError);
        }

        // 첫 장 URL 을 cover_image_url 에 동기화 (캐시 버스팅 포함)
        // 캐시 버스팅: 경로가 UUID 기반으로 항상 다르지만, 동일 URL 의 재업로드 방어용
        const firstCoverUrl = `${uploadedUrls[0]}?v=${Date.now()}`;
        const { error: updateError } = await supabase
          .from("circles")
          .update({ cover_image_url: firstCoverUrl })
          .eq("id", circleId);
        if (updateError) {
          console.error("[submitRegistration] cover_image_url 업데이트 실패:", updateError);
        }
      }
    } catch (err) {
      // 예상치 못한 에러 — best-effort (서클은 이미 생성됨)
      console.error("[submitRegistration] 커버 이미지 처리 중 예외 발생:", err);
    }
  }

  // ── 단계 4: 태그 연결 (best-effort) ──────────────────

  if (values.tags && values.tags.length > 0) {
    try {
      // tags 테이블에서 slug → id 매핑 조회
      const { data: tagRows, error: tagFetchError } = await supabase
        .from("tags")
        .select("id, slug")
        .in("slug", values.tags);

      if (tagFetchError) {
        console.error("[submitRegistration] 태그 조회 실패:", tagFetchError);
      } else if (tagRows && tagRows.length > 0) {
        // circle_tags 배열 생성 후 INSERT
        const circleTags = tagRows.map((tag) => ({
          circle_id: circleId,
          tag_id: tag.id,
        }));

        const { error: tagInsertError } = await supabase.from("circle_tags").insert(circleTags);

        if (tagInsertError) {
          // 태그 연결 실패 — 서클은 이미 생성됨, best-effort
          console.error("[submitRegistration] circle_tags INSERT 실패:", tagInsertError);
        }
      }
    } catch (err) {
      // 예상치 못한 에러 — best-effort
      console.error("[submitRegistration] 태그 처리 중 예외 발생:", err);
    }
  }

  // 모든 핵심 단계 성공
  return { ok: true, id: circleId };
}

// ─────────────────────────────────────────
// 수정(UPDATE) 함수
// ─────────────────────────────────────────

/**
 * 본인 소유 서클의 기본 정보를 수정합니다 (등록 폼 재사용 편집 화면에서 호출).
 *
 * 정책:
 *  - slug / status / pledge_accepted_at 는 변경하지 않는다.
 *    (slug 는 URL 안정성, status 는 재심사 없이 즉시 반영, pledge 는 최초 동의 시각 보존)
 *  - 권한은 RLS circles_update_owner_or_admin 이 강제하지만, .eq("id") 만으로도
 *    owner 본인 행만 매칭된다(RLS 가 다른 owner 행 UPDATE 를 차단).
 *
 * 제출 순서 (circle_tags DELETE→재INSERT 패턴과 동일하게 순차·best-effort):
 *  1. 인증 확인
 *  2. circles UPDATE (핵심)
 *  3. 커버 이미지 재설정: circle_images 전체 DELETE → (keepImageUrls + 신규 업로드 URL) 재INSERT → 첫 장 cover_image_url 동기화 (best-effort)
 *  4. circle_tags 전체 DELETE 후 신규 INSERT (best-effort)
 *
 * @param circleId - 수정할 서클 UUID
 * @param values - registrationSchema 로 검증된 폼 값 (수정 화면은 서약 UI 를 숨기고 pledge=true 로 채움)
 * @param coverFiles - 새로 추가할 커버 이미지 파일 배열 (빈 배열이면 신규 업로드 없음)
 * @param keepImageUrls - 유지할 기존 circle_images URL 배열 (삭제하지 않을 이미지)
 */
export async function updateCircle(
  circleId: string,
  values: RegistrationValues,
  coverFiles: File[],
  keepImageUrls: string[] = []
): Promise<SubmitRegistrationResult> {
  const supabase = createClient();

  // ── 단계 1: 인증 확인 ─────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "ログインが必要です。再度ログインしてください。" };
  }

  // ── 단계 2: 현재 status 조회 — 재제출 분기 판단 ──────
  // rejected → pending 재신청 / pending → pending 유지 / approved → approved 유지
  const { data: currentRow, error: fetchError } = await supabase
    .from("circles")
    .select("status")
    .eq("id", circleId)
    .single();

  if (fetchError || !currentRow) {
    return { error: fetchError?.message ?? "サークル情報の取得に失敗しました" };
  }

  const currentStatus = currentRow.status as string;

  // ── 단계 3: circles UPDATE (핵심 단계) ────────────────
  // slug / pledge_accepted_at 는 변경하지 않음(URL 안정성·최초 동의 시각 보존).
  // status 분기:
  //   - rejected: status='pending', rejection_reason=null 포함 → 재신청
  //               (트리거 check_circles_status_change 가 소유자의 rejected→pending 만 허용)
  //   - pending / approved: status 변경 없음 → 트리거 조건(NEW.status IS DISTINCT FROM OLD.status)
  //                         미충족이므로 트리거 예외 미발생
  const statusFields =
    currentStatus === "rejected" ? { status: "pending" as const, rejection_reason: null } : {};

  const { error: updateError } = await supabase
    .from("circles")
    .update({
      name: values.name,
      category: values.category,
      official_type: values.official_type,
      activity_frequency: values.activity_frequency,
      // 모집 상태(recruitment_status)는 편집 시 건드리지 않음 — 마이페이지 토글로 설정한 값 보존.
      // 활동 시간대·활동 요일은 등록과 동일하게 수정 반영.
      activity_time_band: values.activity_time_band,
      activity_days: values.activity_weekdays.join("・"),
      description: values.description ?? "",
      // member_count → member_band 로 교체. 未選択(undefined) 은 null 로 저장.
      member_band: values.member_band ?? null,
      // 핸들/ID → 전체 URL 변환 후 저장 (submitRegistration 과 동일 로직)
      contact_instagram: instagramHandleToUrl(values.contact_instagram?.trim()) || null,
      contact_x: xHandleToUrl(values.contact_x?.trim()) || null,
      contact_line: lineIdToUrl(values.contact_line?.trim()) || null,
      updated_at: new Date().toISOString(),
      // 재신청 시에만 status/rejection_reason 포함, 나머지는 현재 값 유지
      ...statusFields,
    })
    .eq("id", circleId);

  if (updateError) {
    return { error: updateError.message };
  }

  // ── 단계 3: 커버 이미지 재설정 (best-effort) ─────────────────────────────
  // circle_tags 의 DELETE→재INSERT 패턴을 차용.
  // 1) 기존 circle_images 전부 DELETE
  // 2) (keepImageUrls + 신규 업로드 URL) 을 sort_order 순으로 재INSERT
  // 3) 첫 장 URL 을 cover_image_url 에 동기화
  // keepImageUrls + coverFiles 합산이 0장이면 cover_image_url 를 건드리지 않는다(기존 유지).
  const safeNewFiles = coverFiles.slice(0, 5);
  const totalCount = keepImageUrls.length + safeNewFiles.length;

  if (totalCount > 0) {
    try {
      // 기존 circle_images 전부 제거
      const { error: deleteImgError } = await supabase
        .from("circle_images")
        .delete()
        .eq("circle_id", circleId);
      if (deleteImgError) {
        console.error("[updateCircle] 기존 circle_images DELETE 실패:", deleteImgError);
      }

      // 신규 파일 업로드 → URL 수집
      const newUploadedUrls: string[] = [];
      for (const file of safeNewFiles) {
        const result = await uploadCoverCollectionImage(supabase, circleId, file);
        if ("url" in result) {
          newUploadedUrls.push(result.url);
        } else {
          console.error("[updateCircle] 커버 이미지 업로드 실패:", result.error);
        }
      }

      // (유지 URL 먼저, 이후 신규 URL) 순서로 sort_order 재부여
      const allUrls = [...keepImageUrls, ...newUploadedUrls].slice(0, 5);
      const imageRows = allUrls.map((url, idx) => ({
        circle_id: circleId,
        image_url: url,
        sort_order: idx,
      }));

      if (imageRows.length > 0) {
        const { error: imgInsertError } = await supabase
          .from("circle_images")
          .insert(imageRows);
        if (imgInsertError) {
          console.error("[updateCircle] circle_images INSERT 실패:", imgInsertError);
        }

        // 첫 장 URL 을 cover_image_url 에 동기화 (캐시 버스팅 포함)
        const firstCoverUrl = `${allUrls[0]}?v=${Date.now()}`;
        const { error: coverError } = await supabase
          .from("circles")
          .update({ cover_image_url: firstCoverUrl })
          .eq("id", circleId);
        if (coverError) {
          console.error("[updateCircle] cover_image_url 업데이트 실패:", coverError);
        }
      }
    } catch (err) {
      console.error("[updateCircle] 커버 이미지 처리 중 예외 발생:", err);
    }
  }

  // ── 단계 4: 태그 재설정 — 기존 전체 DELETE 후 신규 INSERT (best-effort) ──
  try {
    // 기존 연결 모두 제거 (RLS circle_tags_write_owner_or_admin 가 권한 보장)
    const { error: deleteError } = await supabase
      .from("circle_tags")
      .delete()
      .eq("circle_id", circleId);

    if (deleteError) {
      console.error("[updateCircle] 기존 circle_tags DELETE 실패:", deleteError);
    }

    if (values.tags && values.tags.length > 0) {
      const { data: tagRows, error: tagFetchError } = await supabase
        .from("tags")
        .select("id, slug")
        .in("slug", values.tags);

      if (tagFetchError) {
        console.error("[updateCircle] 태그 조회 실패:", tagFetchError);
      } else if (tagRows && tagRows.length > 0) {
        const circleTags = tagRows.map((tag) => ({
          circle_id: circleId,
          tag_id: tag.id,
        }));

        const { error: tagInsertError } = await supabase.from("circle_tags").insert(circleTags);

        if (tagInsertError) {
          console.error("[updateCircle] circle_tags INSERT 실패:", tagInsertError);
        }
      }
    }
  } catch (err) {
    console.error("[updateCircle] 태그 처리 중 예외 발생:", err);
  }

  return { ok: true, id: circleId };
}
