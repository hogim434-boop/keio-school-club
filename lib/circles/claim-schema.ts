/**
 * lib/circles/claim-schema.ts
 *
 * 역할:
 *  - 동아리 권한 이양(claim) 신청 폼의 Zod 검증 스키마 정의
 *  - 단계별 부분검증(RHF trigger)을 위한 STEP_FIELDS 상수 제공
 *  - UI 컴포넌트 및 Server Action 양쪽에서 import 하는 SSOT 역할
 *
 * 단계 구성:
 *  1. profile — 신청자 본인 정보 (이름·학년·학부·역직)
 *  2. note — 담당자 메모
 *
 * 연락처: 로그인 계정의 이메일을 그대로 사용하므로 폼에서 입력받지 않는다.
 *         (관리자 화면에서 신청자 profiles.email 로 확인)
 *
 * 주의:
 *  - 이 파일은 브라우저·서버 양쪽에서 import 가능한 순수 로직 파일
 *  - Supabase / next/headers 등 런타임 의존성 없음
 */

import { z } from "zod";

// ── 학년 선택지 ──────────────────────────────────────────────────────────────
/**
 * 학년 드롭다운 선택지 상수.
 * UI 컴포넌트(Select)와 Zod 스키마 양쪽에서 동일 배열을 사용해 SSOT 유지.
 */
export const GRADE_OPTIONS = ["1年生", "2年生", "3年生", "4年生"] as const;

/** 학년 타입 */
export type Grade = (typeof GRADE_OPTIONS)[number];

// ── Claim 신청 스키마 ─────────────────────────────────────────────────────────
/**
 * 동아리 권한 이양 신청 폼 전체 스키마.
 *
 * 필수 항목:
 *  - applicant_name: 신청자 씨명 (1~100자)
 *  - grade: 학년 (GRADE_OPTIONS 중 하나)
 *  - contact: 연락처 (메일/SNS, 1~300자)
 *
 * 任意 항목:
 *  - faculty: 학부·연구과 (최대 100자)
 *  - applicant_role: 서클 내 역직 (최대 100자)
 *  - contact_note: 담당자에게 전하는 메모 (최대 1000자)
 */
export const claimSchema = z.object({
  // ── 단계 1: 신청자 본인 정보 ────────────────────────────────────────────────

  /** 씨명 (필수) */
  applicant_name: z
    .string()
    .min(1, "お名前を入力してください")
    .max(100, "100文字以内で入力してください"),

  /** 학년 (필수, enum) */
  grade: z.enum(GRADE_OPTIONS, "学年を選択してください"),

  /** 학부·학과 (필수, 자유 입력) */
  faculty: z
    .string()
    .min(1, "学部・学科を入力してください")
    .max(100, "100文字以内で入力してください"),

  /** 서클 내 역직 (필수) */
  applicant_role: z
    .string()
    .min(1, "役職を入力してください")
    .max(100, "100文字以内で入力してください"),

  // ── 단계 2: 담당자 메모 ─────────────────────────────────────────────────────

  /**
   * 담당자에게 전하는 메모 (필수, 최대 1000자).
   * 구 「本人確認情報」 필드에서 의미가 전환됨.
   */
  contact_note: z
    .string()
    .min(1, "担当者へのメモを入力してください")
    .max(1000, "1000文字以内で入力してください"),
});

// ── 타입 export ───────────────────────────────────────────────────────────────

/** Claim 신청 폼 전체 값 타입 (z.infer 로 스키마와 자동 동기화). */
export type ClaimValues = z.infer<typeof claimSchema>;

// ── 단계별 필드 매핑 (RHF trigger 용) ─────────────────────────────────────────
/**
 * 다단계 폼에서 「次へ」 버튼 클릭 시 해당 단계의 필드만 부분검증하기 위한 상수.
 *
 * @example
 * const ok = await trigger(STEP_FIELDS.profile);
 * if (ok) router.push("?step=contact");
 */
export const STEP_FIELDS = {
  /** 단계 1: 신청자 본인 정보 (이름·학년·학부·역직, 전부 필수) */
  profile: ["applicant_name", "grade", "faculty", "applicant_role"] as const,

  /** 단계 2: 담당자 메모 */
  note: ["contact_note"] as const,
} satisfies Record<string, readonly string[]>;
