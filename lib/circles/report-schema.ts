/**
 * lib/circles/report-schema.ts
 *
 * 역할:
 *  - 활동 리포트 작성 폼의 Zod 검증 스키마 정의
 *  - RHF(React Hook Form) + zodResolver 와 함께 사용
 *  - 이미지 파일(File[])은 브라우저 전용이므로 스키마 밖 별도 state 로 관리
 *
 * 필드:
 *  - title  : 제목 (필수, 최대 100자)
 *  - body   : 본문 (필수, 최대 5000자) — DB의 content 필드에도 그대로 저장
 *  - activity_type : 활동종류 (선택, DB enum 과 1:1)
 *  - location      : 장소 (선택, 최대 100자)
 *
 * 주의:
 *  - 이 파일은 브라우저·서버 양쪽에서 import 가능한 순수 로직 파일
 *  - Supabase / next/headers 등 런타임 의존성 없음
 */

import { z } from "zod";

import { ACTIVITY_REPORT_TYPES } from "@/lib/constants/activity-report-type";

// ─────────────────────────────────────────
// Zod 스키마
// ─────────────────────────────────────────

/**
 * 활동 리포트 작성 폼 스키마.
 *
 * 이미지(File[])는 브라우저 전용 객체라 Zod로 검증할 수 없으므로
 * 컴포넌트 내 별도 state로 관리한다 (submit-registration 의 cover 처리와 동일 패턴).
 */
export const reportSchema = z.object({
  /** 리포트 제목 (필수, 최대 100자) */
  title: z
    .string()
    .min(1, "タイトルを入力してください")
    .max(100, "タイトルは100文字以内で入力してください"),

  /** 본문 (필수, 최대 5000자) — DB의 body + content 양쪽에 저장 */
  body: z
    .string()
    .min(1, "本文を入力してください")
    .max(5000, "本文は5000文字以内で入力してください"),

  /**
   * 활동 종류 (선택).
   * ACTIVITY_REPORT_TYPES 상수와 DB enum 이 1:1 일치.
   * undefined 로 두면 DB 에 null 로 저장.
   */
  activity_type: z.enum(ACTIVITY_REPORT_TYPES).optional(),

  /** 장소 (선택, 최대 100자) */
  location: z.string().max(100, "場所は100文字以内で入力してください").optional(),
});

// ─────────────────────────────────────────
// 타입 export
// ─────────────────────────────────────────

/** 활동 리포트 폼 값 타입 (z.infer 로 스키마와 자동 동기화) */
export type ReportValues = z.infer<typeof reportSchema>;
