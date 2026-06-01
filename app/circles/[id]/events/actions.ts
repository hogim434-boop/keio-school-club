"use server";

/**
 * app/circles/[id]/events/actions.ts
 *
 * イベント登録 Server Action.
 *
 * ── Defense in Depth: 권한 검증 2회 ────────────────────────────────────
 * 1회: Server Component (page.tsx) 에서 진입 시 검증 → 미인증/비운영자 redirect.
 * 2회: 본 Server Action 에서 INSERT 직전 재검증 → 클라이언트 우회 공격 방어.
 *
 * ── JST → UTC 변환 ─────────────────────────────────────────────────────
 * <input type="datetime-local"> 값은 로컬 시각(문자열)이지만,
 * 본 앱은 일본(JST, UTC+9)을 대상으로 하므로 JST 로 가정한다.
 * fromZonedTime(value, "Asia/Tokyo") 로 UTC Date 를 얻은 뒤 ISO 문자열로 변환해 DB INSERT.
 *
 * ── 커버 이미지 처리 ─────────────────────────────────────────────────────
 * FormData 에 "coverFile" 이 있으면 Supabase Storage(event-covers 버킷)에 업로드 후
 * 퍼블릭 URL 을 cover_image_url 로 사용.
 *
 * ── 캐시 무효화 ──────────────────────────────────────────────────────────
 * revalidateTag("events:public") — 공개 이벤트 목록 캐시
 * revalidatePath("/circles/" + circleId) — 서클 상세 페이지 캐시
 */

import { redirect } from "next/navigation";
import { revalidatePath, revalidateTag } from "next/cache";
import { fromZonedTime } from "date-fns-tz";

import { createClient } from "@/lib/supabase/server";
import { eventSchema, type EventFormValues } from "@/lib/events/event-schema";

// Supabase Storage 이벤트 커버 버킷명
const EVENT_COVERS_BUCKET = "event-covers";
// JST 타임존 식별자
const JST_TIMEZONE = "Asia/Tokyo";

/**
 * datetime-local 문자열(JST) → UTC ISO 문자열 변환 헬퍼.
 * 빈 문자열 / undefined 는 null 반환 (DB NULLABLE 컬럼 대응).
 *
 * @param localStr "YYYY-MM-DDTHH:mm" 형식의 JST 문자열
 * @returns UTC ISO 문자열 또는 null
 */
function jstToUtcIso(localStr: string | undefined | null): string | null {
  if (!localStr || localStr.trim() === "") return null;
  // fromZonedTime: JST 를 UTC 로 변환 (date-fns-tz v3 API)
  const utcDate = fromZonedTime(localStr, JST_TIMEZONE);
  return utcDate.toISOString();
}

/**
 * イベント登録 Server Action.
 *
 * @param formData - 폼 데이터
 *   - "values"   : EventFormValues 를 JSON.stringify 한 문자열
 *   - "circleId" : 서클 UUID
 *   - "coverFile": (선택) 크롭된 커버 이미지 File
 *
 * @returns 오류 시 { error: string }. 성공 시 redirect 를 통해 이벤트 상세로 이동.
 */
export async function createEvent(
  formData: FormData
): Promise<{ error: string } | void> {
  // ── 1. FormData 파싱 ──────────────────────────────────────────────────
  const rawValues = formData.get("values");
  const circleId = formData.get("circleId");
  const coverFile = formData.get("coverFile");

  if (typeof rawValues !== "string" || typeof circleId !== "string") {
    return { error: "不正なリクエストです" };
  }

  // ── 2. Supabase 클라이언트 생성 (Fluid compute 대응: 매번 새로 생성) ──
  const supabase = await createClient();

  // ── 3-1. Defense in Depth: 인증 확인 ─────────────────────────────────
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) {
    // 비인증 사용자 — 로그인 페이지로
    redirect(`/auth/login?next=/circles/${circleId}/events/new`);
  }

  // ── 3-2. Defense in Depth: 운영자 권한 확인 ──────────────────────────
  const { data: isStaff } = await supabase.rpc("is_circle_staff", {
    _circle_id: circleId,
  });
  if (!isStaff) {
    // 권한 없음 — 서클 상세 페이지로
    redirect(`/circles/${circleId}`);
  }

  // ── 4. Zod 스키마 검증 ───────────────────────────────────────────────
  let values: EventFormValues;
  try {
    const parsed = JSON.parse(rawValues);
    const result = eventSchema.safeParse(parsed);
    if (!result.success) {
      // 검증 실패: 첫 번째 에러 메시지 반환
      // Zod v4: .issues (구 v3의 .errors 에서 변경됨)
      const firstError = result.error.issues[0]?.message ?? "入力内容を確認してください";
      return { error: firstError };
    }
    values = result.data;
  } catch {
    return { error: "データの解析に失敗しました" };
  }

  // ── 5. 커버 이미지 Storage 업로드 ────────────────────────────────────
  let coverImageUrl: string | null = null;

  if (coverFile instanceof File && coverFile.size > 0) {
    // 파일명: {userId}/{circleId}/{timestamp}.webp — 충돌 방지
    const userId = claimsData.claims.sub as string;
    const ext = coverFile.name.split(".").pop() ?? "jpg";
    const fileName = `${userId}/${circleId}/${Date.now()}.${ext}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(EVENT_COVERS_BUCKET)
      .upload(fileName, coverFile, {
        cacheControl: "3600",
        upsert: false,
        contentType: coverFile.type,
      });

    if (uploadError) {
      console.error("[createEvent] cover upload error:", uploadError.message);
      // 업로드 실패해도 이벤트 자체 생성은 허용 (커버 없이 진행)
    } else if (uploadData) {
      const { data: urlData } = supabase.storage
        .from(EVENT_COVERS_BUCKET)
        .getPublicUrl(uploadData.path);
      coverImageUrl = urlData.publicUrl;
    }
  } else if (values.cover_image_url && values.cover_image_url.trim() !== "") {
    // 이미 URL 이 전달된 경우(수정 폼 재사용 대비)
    coverImageUrl = values.cover_image_url;
  }

  // ── 6. datetime-local JST 문자열 → UTC ISO 변환 ─────────────────────
  const startsAtUtc = jstToUtcIso(values.starts_at);
  const endsAtUtc = jstToUtcIso(values.ends_at);
  const rsvpDeadlineUtc = jstToUtcIso(values.rsvp_deadline);

  if (!startsAtUtc) {
    return { error: "開始日時が正しくありません" };
  }

  // ── 7. events INSERT ─────────────────────────────────────────────────
  const { data: newEvent, error: insertError } = await supabase
    .from("events")
    .insert({
      circle_id: circleId,
      // created_by: 현재 인증 사용자 UUID
      created_by: claimsData.claims.sub as string,
      title: values.title.trim(),
      description: values.description?.trim() || null,
      starts_at: startsAtUtc,
      ends_at: endsAtUtc,
      location: values.location?.trim() || null,
      cover_image_url: coverImageUrl,
      category: values.category?.trim() || null,
      visibility: values.visibility,
      is_all_day: values.is_all_day,
      rsvp_mode: values.rsvp_mode,
      // strict 모드 전용 필드 — light 모드이면 null 로 저장
      capacity: values.rsvp_mode === "strict" ? (values.capacity ?? null) : null,
      rsvp_deadline: values.rsvp_mode === "strict" ? rsvpDeadlineUtc : null,
      requires_approval:
        values.rsvp_mode === "strict" ? values.requires_approval : false,
    })
    .select("id")
    .single();

  if (insertError || !newEvent) {
    console.error("[createEvent] insert error:", insertError?.message);
    return { error: "イベントの作成に失敗しました。もう一度お試しください。" };
  }

  // ── 8. 캐시 무효화 ───────────────────────────────────────────────────
  // 공개 이벤트 목록 캐시 (홈 큐레이션 등 events:public 태그 캐시 일괄 무효화)
  // Next.js 16: 두 번째 인자 { expire: 0 } 로 즉시 만료 처리 (galleries/actions.ts 패턴)
  revalidateTag("events:public", { expire: 0 });
  // 서클 상세 페이지 — 이벤트 섹션 최신화
  revalidatePath(`/circles/${circleId}`);

  // ── 9. 성공 → 이벤트 상세 페이지로 redirect ──────────────────────────
  redirect(`/events/${newEvent.id}`);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// T-021: updateEvent — イベント編集 Server Action
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * 변경 감지 대상 필드 목록.
 *
 * DB의 events 테이블에서 비교할 컬럼들.
 * created_at / updated_at / created_by / cancelled_at / cancellation_reason 는 제외.
 * rsvp_mode 는 등록 후 변경 불가이므로 비교 대상에서도 제외.
 */
const CHANGE_DETECT_FIELDS = [
  "title",
  "starts_at",
  "ends_at",
  "location",
  "description",
  "cover_image_url",
  "category",
  "visibility",
  "capacity",
  "rsvp_deadline",
  "requires_approval",
] as const;

/**
 * DB에서 읽은 기존 이벤트 row 의 타입 (변경 감지에 필요한 필드만 선언).
 */
type ExistingEvent = {
  circle_id: string;
  rsvp_mode: string;
  title: string;
  starts_at: string | null;
  ends_at: string | null;
  location: string | null;
  description: string | null;
  cover_image_url: string | null;
  category: string | null;
  visibility: string;
  capacity: number | null;
  rsvp_deadline: string | null;
  requires_approval: boolean;
};

/**
 * 두 값을 문자열로 정규화하여 동일 여부를 비교하는 헬퍼.
 *
 * null / undefined / 빈 문자열은 모두 "" 로 통일한 뒤 비교.
 * timestamptz 컬럼은 ISO 문자열로 DB 에서 읽어오므로 문자열 비교로 충분.
 *
 * @param a DB 에서 읽은 기존 값
 * @param b 폼에서 받은 신규 값 (UTC 변환 후)
 * @returns 두 값이 동일하면 true
 */
function isSameValue(a: unknown, b: unknown): boolean {
  const normalize = (v: unknown): string => {
    if (v === null || v === undefined || v === "") return "";
    if (typeof v === "boolean") return String(v);
    if (typeof v === "number") return String(v);
    return String(v);
  };
  return normalize(a) === normalize(b);
}

/**
 * イベント編集 Server Action (T-021).
 *
 * ── 동작 순서 ────────────────────────────────────────────────────────────
 * 1. FormData 파싱 (eventId · circleId · values · coverFile)
 * 2. Defense in Depth 권한 검증 2회 (인증 + 운영자)
 * 3. 기존 events row 로드 (없으면 not_found 에러)
 * 4. Zod 검증 (이벤트 폼 스키마)
 * 5. 커버 이미지 처리 (새 파일 있으면 Storage 업로드, 없으면 기존 URL 유지)
 * 6. JST → UTC 변환
 * 7. 변경된 필드 감지 → event_change_logs INSERT (notified_at=NULL, T-026 cron 대기)
 * 8. events UPDATE
 * 9. 캐시 무효화 + redirect
 *
 * ── 변경 감지 로직 ─────────────────────────────────────────────────────
 * CHANGE_DETECT_FIELDS 각 필드를 isSameValue 로 비교.
 * 변경된 필드마다 event_change_logs 에 1행씩 INSERT (notified_at = NULL).
 * 변경 없이 제출하면 change_logs INSERT 0건, UPDATE 만 수행.
 *
 * @param formData - 폼 데이터
 *   - "eventId"   : 수정 대상 이벤트 UUID
 *   - "circleId"  : 서클 UUID
 *   - "values"    : EventFormValues 를 JSON.stringify 한 문자열
 *   - "coverFile" : (선택) 새로 크롭된 커버 이미지 File
 */
export async function updateEvent(
  formData: FormData
): Promise<{ error: string } | void> {
  // ── 1. FormData 파싱 ──────────────────────────────────────────────────
  const rawValues = formData.get("values");
  const circleId = formData.get("circleId");
  const eventId = formData.get("eventId");
  const coverFile = formData.get("coverFile");

  if (
    typeof rawValues !== "string" ||
    typeof circleId !== "string" ||
    typeof eventId !== "string"
  ) {
    return { error: "不正なリクエストです" };
  }

  // ── 2. Supabase 클라이언트 생성 (Fluid compute 대응: 매번 새로 생성) ──
  const supabase = await createClient();

  // ── 3-1. Defense in Depth: 인증 확인 ─────────────────────────────────
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) {
    // 비인증 → 로그인 후 수정 페이지로 돌아오도록 next 파라미터 첨부
    redirect(
      `/auth/login?next=/circles/${circleId}/events/${eventId}/edit`
    );
  }

  // ── 3-2. Defense in Depth: 운영자 권한 확인 ──────────────────────────
  const { data: isStaff } = await supabase.rpc("is_circle_staff", {
    _circle_id: circleId,
  });
  if (!isStaff) {
    // 운영자 아님 → 서클 상세로 이동
    redirect(`/circles/${circleId}`);
  }

  // ── 4. 기존 이벤트 row 로드 ──────────────────────────────────────────
  // 변경 감지 비교 및 circle_id 소속 검증에 사용.
  const { data: existing, error: fetchError } = await supabase
    .from("events")
    .select(
      "circle_id, rsvp_mode, title, starts_at, ends_at, location, description, cover_image_url, category, visibility, capacity, rsvp_deadline, requires_approval"
    )
    .eq("id", eventId)
    .single<ExistingEvent>();

  if (fetchError || !existing) {
    console.error("[updateEvent] fetch error:", fetchError?.message);
    return { error: "イベントが見つかりませんでした" };
  }

  // URL 변조 방어: 해당 서클 소속 이벤트인지 추가 검증
  if (existing.circle_id !== circleId) {
    return { error: "アクセス権限がありません" };
  }

  // ── 5. Zod 스키마 검증 ───────────────────────────────────────────────
  let values: EventFormValues;
  try {
    const parsed = JSON.parse(rawValues);
    const result = eventSchema.safeParse(parsed);
    if (!result.success) {
      const firstError =
        result.error.issues[0]?.message ?? "入力内容を確認してください";
      return { error: firstError };
    }
    values = result.data;
  } catch {
    return { error: "データの解析に失敗しました" };
  }

  // ── 6. 커버 이미지 처리 ──────────────────────────────────────────────
  // 우선순위: 새 파일 업로드 > 폼에 전달된 기존 URL > DB 에 저장된 기존 URL
  let coverImageUrl: string | null = existing.cover_image_url;

  if (coverFile instanceof File && coverFile.size > 0) {
    // 새 커버 이미지 업로드
    const userId = claimsData.claims.sub as string;
    const ext = coverFile.name.split(".").pop() ?? "jpg";
    const fileName = `${userId}/${circleId}/${Date.now()}.${ext}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(EVENT_COVERS_BUCKET)
      .upload(fileName, coverFile, {
        cacheControl: "3600",
        upsert: false,
        contentType: coverFile.type,
      });

    if (uploadError) {
      console.error("[updateEvent] cover upload error:", uploadError.message);
      // 업로드 실패 시 기존 URL 유지 (이벤트 수정은 계속 진행)
    } else if (uploadData) {
      const { data: urlData } = supabase.storage
        .from(EVENT_COVERS_BUCKET)
        .getPublicUrl(uploadData.path);
      coverImageUrl = urlData.publicUrl;
    }
  } else if (values.cover_image_url && values.cover_image_url.trim() !== "") {
    // 폼에서 기존 URL 이 유지된 경우
    coverImageUrl = values.cover_image_url;
  } else if (values.cover_image_url === "") {
    // 커버 이미지 명시 삭제 (빈 문자열 = 삭제 의도)
    coverImageUrl = null;
  }

  // ── 7. JST → UTC 변환 ────────────────────────────────────────────────
  const startsAtUtc = jstToUtcIso(values.starts_at);
  const endsAtUtc = jstToUtcIso(values.ends_at);
  const rsvpDeadlineUtc =
    values.rsvp_mode === "strict"
      ? jstToUtcIso(values.rsvp_deadline)
      : null;

  if (!startsAtUtc) {
    return { error: "開始日時が正しくありません" };
  }

  // ── 8. 변경 감지 → event_change_logs INSERT ──────────────────────────
  // DB 저장 형식으로 변환한 신규 값 맵
  const newValues: Record<string, unknown> = {
    title: values.title.trim(),
    starts_at: startsAtUtc,
    ends_at: endsAtUtc,
    location: values.location?.trim() || null,
    description: values.description?.trim() || null,
    cover_image_url: coverImageUrl,
    category: values.category?.trim() || null,
    visibility: values.visibility,
    capacity:
      values.rsvp_mode === "strict" ? (values.capacity ?? null) : null,
    rsvp_deadline: rsvpDeadlineUtc,
    requires_approval:
      values.rsvp_mode === "strict" ? values.requires_approval : false,
  };

  // DB 에서 읽은 기존 값 맵
  const oldValues: Record<string, unknown> = {
    title: existing.title,
    starts_at: existing.starts_at,
    ends_at: existing.ends_at,
    location: existing.location,
    description: existing.description,
    cover_image_url: existing.cover_image_url,
    category: existing.category,
    visibility: existing.visibility,
    capacity: existing.capacity,
    rsvp_deadline: existing.rsvp_deadline,
    requires_approval: existing.requires_approval,
  };

  const userId = claimsData.claims.sub as string;

  // 변경된 필드를 수집하여 배치 INSERT 준비
  const changedLogs: {
    event_id: string;
    changed_by: string;
    field_name: string;
    old_value: string | null;
    new_value: string | null;
    notified_at: null;
  }[] = [];

  for (const field of CHANGE_DETECT_FIELDS) {
    const oldVal = oldValues[field];
    const newVal = newValues[field];

    if (!isSameValue(oldVal, newVal)) {
      changedLogs.push({
        event_id: eventId,
        changed_by: userId,
        field_name: field,
        // null / undefined → DB NULL 로 저장 (NULLABLE 컬럼)
        old_value:
          oldVal === null || oldVal === undefined ? null : String(oldVal),
        new_value:
          newVal === null || newVal === undefined ? null : String(newVal),
        // T-026 알림 cron 이 처리할 때까지 NULL 로 두어 미발송 상태 표시
        notified_at: null,
      });
    }
  }

  // 변경된 필드가 1건 이상일 때만 INSERT (0건이면 스킵)
  if (changedLogs.length > 0) {
    const { error: logError } = await supabase
      .from("event_change_logs")
      .insert(changedLogs);

    if (logError) {
      // 로그 INSERT 실패는 치명적이지 않으므로 경고 로그만 남기고 계속 진행
      console.error("[updateEvent] change_logs insert error:", logError.message);
    }
  }

  // ── 9. events UPDATE ─────────────────────────────────────────────────
  const { error: updateError } = await supabase
    .from("events")
    .update({
      title: String(newValues.title),
      description: newValues.description as string | null,
      starts_at: startsAtUtc,
      ends_at: endsAtUtc,
      location: newValues.location as string | null,
      cover_image_url: coverImageUrl,
      category: newValues.category as string | null,
      visibility: values.visibility,
      is_all_day: values.is_all_day,
      // rsvp_mode: 등록 후 변경 불가 — UPDATE 대상에서 의도적으로 제외
      capacity: newValues.capacity as number | null,
      rsvp_deadline: rsvpDeadlineUtc,
      requires_approval: newValues.requires_approval as boolean,
    })
    .eq("id", eventId);

  if (updateError) {
    console.error("[updateEvent] update error:", updateError.message);
    return { error: "イベントの更新に失敗しました。もう一度お試しください。" };
  }

  // ── 10. 캐시 무효화 ──────────────────────────────────────────────────
  // 공개 이벤트 목록 캐시 일괄 무효화 (홈·캘린더 등)
  revalidateTag("events:public", { expire: 0 });
  // 이벤트 상세 페이지 캐시 무효화
  revalidatePath(`/events/${eventId}`);
  // 서클 상세 페이지 — 이벤트 섹션 최신화
  revalidatePath(`/circles/${circleId}`);

  // ── 11. 성공 → 이벤트 상세 페이지로 redirect ─────────────────────────
  redirect(`/events/${eventId}`);
}

// ══════════════════════════════════════════════════════════════════════════════
//  T-024: 신청자 관리 Server Actions
// ══════════════════════════════════════════════════════════════════════════════

/**
 * 공통 캐시 무효화 헬퍼 — RSVP 상태 변경 후 호출.
 * events:public 태그 + 관리 페이지 경로를 즉시 무효화한다.
 */
function invalidateEventCache(circleId: string, eventId: string): void {
  // events:public 태그 — 홈·캘린더 캐시 즉시 만료
  revalidateTag("events:public", { expire: 0 });
  // 관리 페이지 경로
  revalidatePath(`/circles/${circleId}/events/${eventId}/manage`);
  // 이벤트 상세 (참가자 수 카운트 등)
  revalidatePath(`/events/${eventId}`);
}

/**
 * RSVP 승인 Server Action.
 *
 * ── Defense in Depth 검증 ─────────────────────────────────────────────
 * 1회: 관리 페이지(page.tsx) 진입 시 검증 → 미인증/비운영자 redirect.
 * 2회: 본 Server Action 에서 UPDATE 직전 재검증 → 클라이언트 우회 공격 방어.
 *
 * ── T-023 트리거 연동 ─────────────────────────────────────────────────
 * status='going' 으로 UPDATE 하면 DB 트리거(T-023)가 자동으로 정원을 검증한다.
 * 정원 초과 시 트리거가 status 를 'waiting' 으로 강제 전환 → 클라이언트에서 toast.
 *
 * @param eventId  - 이벤트 UUID
 * @param userId   - 승인할 신청자 UUID
 * @param circleId - 서클 UUID (권한 검증용)
 * @returns        - 성공 시 { success: true, finalStatus } / 오류 시 { error: string }
 */
export async function approveRsvp(
  eventId: string,
  userId: string,
  circleId: string
): Promise<{ success: true; finalStatus: string } | { error: string }> {
  // ── 1. Supabase 클라이언트 생성 ──────────────────────────────────────
  const supabase = await createClient();

  // ── 2-1. Defense in Depth: 인증 확인 ──────────────────────────────
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) {
    return { error: "ログインが必要です" };
  }

  // ── 2-2. Defense in Depth: 운영자 권한 확인 ───────────────────────
  const { data: isStaff } = await supabase.rpc("is_circle_staff", {
    _circle_id: circleId,
  });
  if (!isStaff) {
    return { error: "権限がありません" };
  }

  // ── 3. RSVP status → 'going' UPDATE ──────────────────────────────
  // T-023 트리거가 정원 검증 후 필요 시 'waiting' 으로 강제 전환.
  const { error: updateError } = await supabase
    .from("event_rsvps")
    .update({
      status: "going",
      approved_at: new Date().toISOString(),
      approved_by: claimsData.claims.sub as string,
    })
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .eq("status", "pending"); // pending 인 row 만 업데이트 (중복 방지)

  if (updateError) {
    console.error("[approveRsvp] UPDATE error:", updateError.message);
    return { error: "承認処理に失敗しました。もう一度お試しください。" };
  }

  // ── 4. 실제 저장된 status 조회 (T-023 트리거가 바꿨을 수도 있음) ──
  const { data: rsvpRow } = await supabase
    .from("event_rsvps")
    .select("status")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .maybeSingle();

  const finalStatus = rsvpRow?.status ?? "going";

  // ── 5. 캐시 무효화 ─────────────────────────────────────────────────
  invalidateEventCache(circleId, eventId);

  return { success: true, finalStatus };
}

/**
 * RSVP 거부(拒否) Server Action.
 *
 * Defense in Depth 검증 2회 후 status='rejected' 로 UPDATE.
 *
 * @param eventId        - 이벤트 UUID
 * @param userId         - 거부할 신청자 UUID
 * @param circleId       - 서클 UUID (권한 검증용)
 * @param reason         - 거부 사유 (optional, rejection_reason 컬럼에 저장)
 * @returns              - 성공 시 { success: true } / 오류 시 { error: string }
 */
export async function rejectRsvp(
  eventId: string,
  userId: string,
  circleId: string,
  reason?: string
): Promise<{ success: true } | { error: string }> {
  // ── 1. Supabase 클라이언트 생성 ──────────────────────────────────────
  const supabase = await createClient();

  // ── 2-1. Defense in Depth: 인증 확인 ──────────────────────────────
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) {
    return { error: "ログインが必要です" };
  }

  // ── 2-2. Defense in Depth: 운영자 권한 확인 ───────────────────────
  const { data: isStaff } = await supabase.rpc("is_circle_staff", {
    _circle_id: circleId,
  });
  if (!isStaff) {
    return { error: "権限がありません" };
  }

  // ── 3. RSVP status → 'rejected' UPDATE ───────────────────────────
  const { error: updateError } = await supabase
    .from("event_rsvps")
    .update({
      status: "rejected",
      rejected_at: new Date().toISOString(),
      rejection_reason: reason?.trim() || null,
    })
    .eq("event_id", eventId)
    .eq("user_id", userId)
    // pending 또는 going 인 row 만 거부 가능
    .in("status", ["pending", "going"]);

  if (updateError) {
    console.error("[rejectRsvp] UPDATE error:", updateError.message);
    return { error: "拒否処理に失敗しました。もう一度お試しください。" };
  }

  // ── 4. 캐시 무효화 ─────────────────────────────────────────────────
  invalidateEventCache(circleId, eventId);

  return { success: true };
}

/**
 * 일괄 알림 발송 Server Action.
 *
 * ── Defense in Depth 검증 ─────────────────────────────────────────────
 * 1회: 관리 페이지(page.tsx) 진입 시 검증.
 * 2회: 본 Server Action 에서 INSERT 직전 재검증.
 *
 * ── 동작 ──────────────────────────────────────────────────────────────
 * 1. 이벤트에 status='going' 인 신청자 userId 배열 조회.
 * 2. broadcastEventNotification() 으로 notifications 다중 INSERT.
 *
 * @param eventId  - 이벤트 UUID
 * @param circleId - 서클 UUID
 * @param body     - 알림 본문 메시지
 * @returns        - 성공 시 { success: true; count: number } / 오류 시 { error: string }
 */
export async function broadcastEvent(
  eventId: string,
  circleId: string,
  body: string
): Promise<{ success: true; count: number } | { error: string }> {
  // ── 1. Supabase 클라이언트 생성 ──────────────────────────────────────
  const supabase = await createClient();

  // ── 2-1. Defense in Depth: 인증 확인 ──────────────────────────────
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) {
    return { error: "ログインが必要です" };
  }

  // ── 2-2. Defense in Depth: 운영자 권한 확인 ───────────────────────
  const { data: isStaff } = await supabase.rpc("is_circle_staff", {
    _circle_id: circleId,
  });
  if (!isStaff) {
    return { error: "権限がありません" };
  }

  // ── 3. 알림 본문 유효성 검사 ──────────────────────────────────────
  const trimmedBody = body.trim();
  if (!trimmedBody) {
    return { error: "通知メッセージを入力してください" };
  }
  if (trimmedBody.length > 500) {
    return { error: "メッセージは500文字以内で入力してください" };
  }

  // ── 4. 이벤트 정보(서클명) + 신청자 목록 조회 ──────────────────────
  const [eventResult, rsvpResult] = await Promise.all([
    // 이벤트와 서클명 조회
    supabase
      .from("events")
      .select("id, circle_id, circles!events_circle_id_fkey(name)")
      .eq("id", eventId)
      .maybeSingle(),
    // going 상태 신청자 userId 목록
    supabase
      .from("event_rsvps")
      .select("user_id")
      .eq("event_id", eventId)
      .eq("status", "going"),
  ]);

  if (eventResult.error) {
    console.error("[broadcastEvent] event fetch error:", eventResult.error.message);
    return { error: "イベント情報の取得に失敗しました" };
  }

  if (!eventResult.data) {
    return { error: "イベントが見つかりません" };
  }

  // 서클명 추출 (Supabase JOIN 결과: 배열 또는 단일 객체로 올 수 있음)
  const circlesJoinRaw = eventResult.data.circles as { name: string } | { name: string }[] | null;
  const circleName = Array.isArray(circlesJoinRaw)
    ? (circlesJoinRaw[0]?.name ?? "")
    : (circlesJoinRaw?.name ?? "");

  // ── 5. 신청자가 없으면 즉시 반환 ───────────────────────────────────
  const userIds = (rsvpResult.data ?? []).map((r) => r.user_id);
  if (userIds.length === 0) {
    return { success: true, count: 0 };
  }

  // ── 6. 일괄 알림 INSERT ─────────────────────────────────────────────
  // notifications_insert_circle_staff RLS: is_circle_staff(circle_id) 허용
  const rows = userIds.map((uid) => ({
    user_id: uid,
    type: "event_broadcast",
    circle_id: circleId,
    circle_name: circleName,
    body: trimmedBody,
  }));

  const { data: inserted, error: insertError } = await supabase
    .from("notifications")
    .insert(rows)
    .select("id");

  if (insertError) {
    console.error("[broadcastEvent] INSERT error:", insertError.message);
    return { error: "通知の送信に失敗しました。もう一度お試しください。" };
  }

  return { success: true, count: inserted?.length ?? 0 };
}

// ══════════════════════════════════════════════════════════════════════════════
//  T-025: cancelEvent — イベント中止 Server Action
// ══════════════════════════════════════════════════════════════════════════════

/**
 * イベント中止 Server Action (T-025).
 *
 * ── 동작 순서 ────────────────────────────────────────────────────────────────
 * 1. Defense in Depth 권한 검증 2회 (인증 + 운영자)
 * 2. 이미 취소된 이벤트인지 확인 (idempotent 방어)
 * 3. events 테이블 UPDATE — cancelled_at=now(), cancellation_reason=$reason
 * 4. 신청자 전원 조회 (event_rsvps: going/pending/waiting + event_interests: interested/going)
 * 5. notifications INSERT 다중 (type='event_cancelled')
 * 6. 캐시 무효화 (events:public 태그 + 이벤트 상세 + 서클 상세)
 *
 * ── soft delete 원칙 ─────────────────────────────────────────────────────────
 * row 를 DELETE 하지 않고 cancelled_at / cancellation_reason 만 기록.
 * 취소된 이벤트도 공개 페이지에서 「中止されました」 배너로 계속 표시된다.
 *
 * @param eventId  - 취소할 이벤트 UUID
 * @param circleId - 서클 UUID (권한 검증 + 캐시 무효화용)
 * @param reason   - 취소 사유 (표시용; 최대 500자 권장)
 * @returns        - 성공 시 { success: true; notifiedCount: number }
 *                   오류 시 { error: string }
 */
export async function cancelEvent(
  eventId: string,
  circleId: string,
  reason: string
): Promise<{ success: true; notifiedCount: number } | { error: string }> {
  // ── 1. Supabase 클라이언트 생성 ──────────────────────────────────────────
  const supabase = await createClient();

  // ── 2-1. Defense in Depth: 인증 확인 ───────────────────────────────────
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) {
    return { error: "ログインが必要です" };
  }

  // ── 2-2. Defense in Depth: 운영자 권한 확인 ─────────────────────────────
  const { data: isStaff } = await supabase.rpc("is_circle_staff", {
    _circle_id: circleId,
  });
  if (!isStaff) {
    return { error: "権限がありません" };
  }

  // ── 3. 취소 사유 유효성 검사 ─────────────────────────────────────────────
  const trimmedReason = reason.trim();
  if (!trimmedReason) {
    return { error: "中止理由を入力してください" };
  }
  if (trimmedReason.length > 500) {
    return { error: "中止理由は500文字以内で入力してください" };
  }

  // ── 4. 이벤트 정보 조회 (circle_id 검증 + 이미 취소 여부 + 제목 취득) ────
  const { data: eventRow, error: fetchError } = await supabase
    .from("events")
    .select(
      "id, title, circle_id, cancelled_at, rsvp_mode, circles!events_circle_id_fkey(name)"
    )
    .eq("id", eventId)
    .maybeSingle();

  if (fetchError || !eventRow) {
    console.error("[cancelEvent] event fetch error:", fetchError?.message);
    return { error: "イベントが見つかりません" };
  }

  // URL 변조 방어: 해당 서클 소속 이벤트인지 검증
  if (eventRow.circle_id !== circleId) {
    return { error: "アクセス権限がありません" };
  }

  // 이미 취소된 이벤트 — idempotent 처리
  if (eventRow.cancelled_at) {
    return { error: "すでに中止されています" };
  }

  // 서클명 추출 (JOIN 결과: 배열 또는 단일 객체)
  const circlesJoinRaw = eventRow.circles as
    | { name: string }
    | { name: string }[]
    | null;
  const circleName = Array.isArray(circlesJoinRaw)
    ? (circlesJoinRaw[0]?.name ?? "")
    : (circlesJoinRaw?.name ?? "");

  // ── 5. events UPDATE — soft delete (row 보존) ────────────────────────────
  const { error: updateError } = await supabase
    .from("events")
    .update({
      cancelled_at: new Date().toISOString(),
      cancellation_reason: trimmedReason,
    })
    .eq("id", eventId);

  if (updateError) {
    console.error("[cancelEvent] update error:", updateError.message);
    return { error: "中止処理に失敗しました。もう一度お試しください。" };
  }

  // ── 6. 신청자 전원 조회 (병렬) ───────────────────────────────────────────
  // strict 모드: event_rsvps の going / pending / waiting
  // light 모드:  event_interests の interested / going
  // 두 테이블 모두 조회해서 합산 (rsvp_mode 관계없이 양쪽 다 확인)
  const [rsvpResult, interestResult] = await Promise.all([
    supabase
      .from("event_rsvps")
      .select("user_id")
      .eq("event_id", eventId)
      .in("status", ["going", "pending", "waiting"]),
    supabase
      .from("event_interests")
      .select("user_id")
      .eq("event_id", eventId)
      .in("status", ["interested", "going"]),
  ]);

  // 중복 제거를 위해 Set 사용 (두 테이블에 같은 user_id 가 있을 수도 있음)
  const userIdSet = new Set<string>();
  (rsvpResult.data ?? []).forEach((r) => userIdSet.add(r.user_id));
  (interestResult.data ?? []).forEach((r) => userIdSet.add(r.user_id));

  const userIds = Array.from(userIdSet);

  // ── 7. 신청자가 없으면 알림 스킵 ─────────────────────────────────────────
  if (userIds.length === 0) {
    // 알림 대상 없어도 취소 자체는 성공
    revalidateTag("events:public", { expire: 0 });
    revalidatePath(`/events/${eventId}`);
    revalidatePath(`/circles/${circleId}`);
    return { success: true, notifiedCount: 0 };
  }

  // ── 8. notifications 다중 INSERT ────────────────────────────────────────
  // 알림 본문: 이벤트 제목 + 취소 사유 (일본어 카피)
  const notificationBody = `中止されました: ${eventRow.title} — 理由: ${trimmedReason}`;

  const notificationRows = userIds.map((uid) => ({
    user_id: uid,
    type: "event_cancelled" as const,
    circle_id: circleId,
    circle_name: circleName,
    body: notificationBody,
  }));

  const { data: inserted, error: insertError } = await supabase
    .from("notifications")
    .insert(notificationRows)
    .select("id");

  if (insertError) {
    // 알림 실패는 취소 자체를 롤백하지 않음 — 경고 로그 + 부분 성공 처리
    console.error("[cancelEvent] notifications insert error:", insertError.message);
    // 캐시 무효화는 수행
    revalidateTag("events:public", { expire: 0 });
    revalidatePath(`/events/${eventId}`);
    revalidatePath(`/circles/${circleId}`);
    return { error: "中止は完了しましたが、通知の送信に失敗しました。" };
  }

  // ── 9. 캐시 무효화 ────────────────────────────────────────────────────────
  // events:public 태그 — 홈·캘린더 캐시 즉시 만료
  revalidateTag("events:public", { expire: 0 });
  // 이벤트 상세 페이지 — 취소 배너 표시
  revalidatePath(`/events/${eventId}`);
  // 서클 상세 페이지 — 이벤트 섹션 최신화
  revalidatePath(`/circles/${circleId}`);

  return { success: true, notifiedCount: inserted?.length ?? 0 };
}
