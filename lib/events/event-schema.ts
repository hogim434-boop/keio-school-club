/**
 * lib/events/event-schema.ts
 *
 * 이벤트 등록·수정 폼의 Zod 검증 스키마.
 *
 * ── 필드 구성 ─────────────────────────────────────────────────────────
 * 필수: title · starts_at · visibility · rsvp_mode
 * strict 모드 전용 동적 필드: capacity · rsvp_deadline · requires_approval
 * 선택: ends_at · location · description · category · cover_image_url · is_all_day
 *
 * ── JST 입력 규약 ──────────────────────────────────────────────────────
 * <input type="datetime-local"> 의 값은 브라우저 로컬 시각이지만,
 * 본 앱은 일본(JST, +09:00)을 타겟으로 하므로 JST 로 가정한다.
 * 실제 UTC 변환은 Server Action (actions.ts) 에서 date-fns-tz の fromZonedTime 으로 수행.
 * 스키마에서는 datetime-local 형식 문자열("YYYY-MM-DDTHH:mm")만 검증한다.
 *
 * ── rsvp_mode 동적 검증 ────────────────────────────────────────────────
 * rsvp_mode="strict" 이면 capacity は 1 이상 또는 null,
 * rsvp_deadline は starts_at 이전이어야 한다 (Client Component 측 힌트 메시지로도 안내).
 * strict 유효성 위반 시 해당 필드 path 에 이슈를 추가한다 (superRefine).
 */

import { z } from "zod";

// ── datetime-local 형식 정규식 ─────────────────────────────────────────
// "YYYY-MM-DDTHH:mm" 형식 (초 없음) — input[type=datetime-local] 기본 출력
const DATETIME_LOCAL_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

/**
 * datetime-local 문자열 필드 검증 헬퍼.
 * 빈 문자열 / undefined 는 Optional 필드에서는 통과, 필수 필드에서는 에러.
 */
const datetimeLocalString = z
  .string()
  .regex(DATETIME_LOCAL_REGEX, "正しい日時の形式で入力してください（例：2026-06-01T18:00）");

/**
 * 이벤트 등록 폼 Zod 스키마.
 *
 * 모든 datetime 필드는 JST 문자열 그대로 보관하고,
 * Server Action 에서 fromZonedTime("Asia/Tokyo") → UTC ISO 변환 후 DB 에 INSERT.
 */
export const eventSchema = z
  .object({
    // ── 필수 기본 필드 ────────────────────────────────────────────────
    /** 이벤트 제목 (1~100자) */
    title: z
      .string()
      .min(1, "タイトルを入力してください")
      .max(100, "タイトルは100文字以内で入力してください"),

    /** 시작 일시 — datetime-local 문자열(JST). 필수. */
    starts_at: datetimeLocalString,

    /** 공개 범위: 'public' | 'members'. Phase 2 (F072) 까지 'public' 고정이지만 폼은 구현해둠. */
    visibility: z.enum(["public", "members"], {
      error: "公開範囲を選択してください",
    }),

    /** RSVP 모드: 'light'(ライト) / 'strict'(しっかり). 등록 후 변경 불가(T-020 제약). */
    rsvp_mode: z.enum(["light", "strict"], {
      error: "参加方式を選択してください",
    }),

    // ── strict 모드 동적 필드 ─────────────────────────────────────────
    /**
     * 定員 (1 이상의 정수, strict 모드에서만 유효). null = 제한 없음.
     * 빈 문자열("") / 미입력은 null 로 처리.
     * z.coerce.number() 를 쓰면 입력 타입이 unknown 으로 추론되어 Resolver 타입 불일치가 발생하므로
     * z.union 으로 number | null 경로를 명시적으로 선언한다.
     */
    capacity: z.union([
      z.number().int().min(1, "定員は1以上の整数で入力してください"),
      z.null(),
    ]) as z.ZodType<number | null>,

    /** 신청 마감 일시 — datetime-local 문자열(JST). strict 모드 선택 시 사용. */
    rsvp_deadline: z
      .string()
      .regex(DATETIME_LOCAL_REGEX, "正しい日時の形式で入力してください")
      .optional()
      .or(z.literal("")),

    /** 承認制 여부 — strict 모드에서만 의미 있음. */
    requires_approval: z.boolean(),

    // ── 선택 필드 ─────────────────────────────────────────────────────
    /** 종료 일시 — datetime-local 문자열(JST). 미입력 허용. */
    ends_at: z
      .string()
      .regex(DATETIME_LOCAL_REGEX, "正しい日時の形式で入力してください")
      .optional()
      .or(z.literal("")),

    /** 開催場所 (최대 200자) */
    location: z.string().max(200, "場所は200文字以内で入力してください").optional(),

    /** イベント説明 (최대 3000자) */
    description: z.string().max(3000, "説明は3000文字以内で入力してください").optional(),

    /** カテゴリ (자유 텍스트, 최대 50자). DB NULLABLE. */
    category: z.string().max(50, "カテゴリは50文字以内で入力してください").optional(),

    /** 커버 이미지 URL (Storage 업로드 후 URL 을 별도 저장). DB NULLABLE. */
    cover_image_url: z.string().url("正しいURLを入力してください").optional().or(z.literal("")),

    /** 終日 이벤트 여부 — true 이면 시간 부분은 무시. */
    is_all_day: z.boolean(),
  })
  .superRefine((data, ctx) => {
    // ── strict 모드 추가 검증 ──────────────────────────────────────────
    if (data.rsvp_mode === "strict") {
      // rsvp_deadline 이 입력됐으면 starts_at 보다 이전이어야 함
      if (data.rsvp_deadline && data.rsvp_deadline.trim() !== "") {
        if (data.rsvp_deadline >= data.starts_at) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["rsvp_deadline"],
            message: "申込締切は開始日時より前に設定してください",
          });
        }
      }
    }

    // ends_at 이 입력됐으면 starts_at 이후여야 함
    if (data.ends_at && data.ends_at.trim() !== "") {
      if (data.ends_at <= data.starts_at) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["ends_at"],
          message: "終了日時は開始日時より後に設定してください",
        });
      }
    }
  });

/** 이벤트 폼 값 타입 (z.infer 로 스키마와 자동 동기화). */
export type EventFormValues = z.infer<typeof eventSchema>;
