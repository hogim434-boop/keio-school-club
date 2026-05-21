/**
 * lib/circles/registration-schema.ts
 *
 * 역할:
 *  - 서클 등록 폼의 Zod 검증 스키마 정의
 *  - SNS URL 화이트리스트 검증 함수 제공
 *  - react-hook-form 의 단계별 부분검증(trigger)을 위한 STEP_FIELDS 상수 제공
 *  - UI 에이전트가 이 파일의 타입·상수를 그대로 import 해서 사용하므로 SSOT 역할
 *
 * 주의:
 *  - 이 파일은 브라우저·서버 양쪽에서 import 가능한 순수 로직 파일
 *  - Supabase / next/headers 등 런타임 의존성 없음
 *
 * ── 커버 이미지 보관 인터페이스 규약 ─────────────────────────────────────────
 *  cover 필드는 브라우저 File 객체를 RHF 상태로 보관하기 위한 필드입니다.
 *
 *  규약 (다음 에이전트가 StepBasic 에서 커버 입력을 구현할 때 반드시 따를 것):
 *   - 저장: StepBasic 에서 사용자가 파일을 선택하면 setValue("cover", file) 로 보관
 *   - 제출: StepContact 에서 최종 제출 시 (getValues("cover") as File) ?? null 로 꺼냄
 *   - Zod 검증: z.any().optional() — 브라우저 File 은 SSR 에서 존재하지 않으므로
 *     Zod 검증 대신 컴포넌트에서 직접 타입 확인
 *   - STEP_FIELDS.basic 에는 포함하지 않음 — 선택 항목이므로 trigger 대상 제외
 *   - defaultValues: cover: undefined
 */

import { z } from "zod";

import { ACTIVITY_FREQUENCIES } from "@/lib/constants/activity-frequency";
import { CATEGORIES } from "@/lib/constants/category";
import { OFFICIAL_TYPES } from "@/lib/constants/official-type";

// ─────────────────────────────────────────
// SNS URL 화이트리스트 허용 호스트 목록
// ─────────────────────────────────────────

/** Instagram 허용 호스트 */
const INSTAGRAM_ALLOWED = ["instagram.com"] as const;

/** X (구 Twitter) 허용 호스트 */
const X_ALLOWED = ["x.com", "twitter.com"] as const;

/** LINE 허용 호스트 */
const LINE_ALLOWED = ["line.me", "lin.ee"] as const;

// ─────────────────────────────────────────
// URL 화이트리스트 검증 헬퍼
// ─────────────────────────────────────────

/**
 * SNS URL 이 허용된 호스트 목록에 속하는지 검증합니다.
 *
 * 정규화 방식:
 *  - `new URL(url).hostname` 으로 호스트 추출
 *  - `www.` 접두어 제거 후 **정확 매칭** (부분일치 우회 차단)
 *  - URL 파싱 실패(상대경로, 빈 문자열 등) 시 false 반환
 *
 * @param url - 검증할 URL 문자열
 * @param allowed - 허용된 호스트 배열 (예: ["instagram.com"])
 * @returns 허용된 호스트면 true, 아니면 false
 *
 * @example
 * isAllowedSnsUrl("https://www.instagram.com/circle", ["instagram.com"]) // true
 * isAllowedSnsUrl("https://fake-instagram.com", ["instagram.com"])        // false
 * isAllowedSnsUrl("not-a-url", ["instagram.com"])                         // false
 */
export function isAllowedSnsUrl(url: string, allowed: readonly string[]): boolean {
  try {
    const hostname = new URL(url).hostname;
    // www. 접두어를 제거해 www.instagram.com → instagram.com 으로 정규화
    const normalized = hostname.replace(/^www\./, "");
    // 허용 목록에 정확히 포함되는지 확인 (includes 는 완전 일치)
    return allowed.includes(normalized);
  } catch {
    // URL 파싱 실패 (상대경로, 빈 문자열 등) → 유효하지 않은 URL
    return false;
  }
}

// ─────────────────────────────────────────
// Zod 등록 스키마
// ─────────────────────────────────────────

/**
 * 서클 등록 폼 전체 스키마.
 *
 * 단계 구성:
 *  1. basic  — 기본 정보 (이름, 카테고리, 분류, 활동빈도, 인원수, 설명)
 *  2. tags   — 태그 선택 (최대 5개)
 *  3. contact — SNS 연락처 + 서약 2종
 *
 * 검증 규칙:
 *  - Instagram/X/LINE 중 최소 1개 입력 필수 (.superRefine)
 *  - 각 SNS URL 은 도메인 화이트리스트 통과 필수
 *  - pledge1, pledge2 는 반드시 true (체크박스 동의 필수)
 */
export const registrationSchema = z
  .object({
    // ── 단계 1: 기본 정보 ──────────────────

    /** 서클명 (1~50자) */
    name: z
      .string()
      .min(1, "サークル名を入力してください")
      .max(50, "サークル名は50文字以内で入力してください"),

    /** 카테고리 (DB enum 값) */
    category: z.enum(CATEGORIES, "カテゴリを選択してください"),

    /** 단체 분류 (DB enum 값) */
    official_type: z.enum(OFFICIAL_TYPES, "団体区分を選択してください"),

    /** 활동 빈도 (DB enum 값) */
    activity_frequency: z.enum(ACTIVITY_FREQUENCIES, "活動頻度を選択してください"),

    /** 회원 수 (0 이상 정수, 미입력 가능) */
    member_count: z.coerce
      .number()
      .int("整数で入力してください")
      .min(0, "0以上の数を入力してください")
      .optional(),

    /** 서클 소개 (최대 1000자, 미입력 가능) */
    description: z.string().max(1000, "説明は1000文字以内で入力してください").optional(),

    // ── 단계 2: 태그 ───────────────────────

    /**
     * 태그 slug 배열 (최대 5개).
     * 초기값은 폼 컨테이너 defaultValues(tags: [])에서 부여한다.
     * .default([]) 를 스키마에 두면 zod input(tags?) / output(tags) 타입이 갈려
     * zodResolver(@hookform/resolvers v5)와 RHF Resolver 타입이 불일치하므로 사용하지 않는다.
     */
    tags: z.array(z.string()).max(5, "タグは5個以内で選択してください"),

    // ── 단계 3: 연락처 + 서약 ──────────────

    /**
     * Instagram URL (공식 계정 URL)
     * 화이트리스트: instagram.com
     */
    contact_instagram: z
      .string()
      .optional()
      .refine(
        (val) => !val || isAllowedSnsUrl(val, INSTAGRAM_ALLOWED),
        "公式 SNS の URL を入力してください"
      ),

    /**
     * X (구 Twitter) URL (공식 계정 URL)
     * 화이트리스트: x.com, twitter.com
     */
    contact_x: z
      .string()
      .optional()
      .refine(
        (val) => !val || isAllowedSnsUrl(val, X_ALLOWED),
        "公式 SNS の URL を入力してください"
      ),

    /**
     * LINE 오픈채팅 또는 공식 계정 URL
     * 화이트리스트: line.me, lin.ee
     */
    contact_line: z
      .string()
      .optional()
      .refine(
        (val) => !val || isAllowedSnsUrl(val, LINE_ALLOWED),
        "公式 SNS の URL を入力してください"
      ),

    /** 서약 1: 정보 정확성 동의 (반드시 체크) */
    pledge1: z.literal(true, "同意が必要です"),

    /** 서약 2: 이용규약 동의 (반드시 체크) */
    pledge2: z.literal(true, "同意が必要です"),

    // ── 커버 이미지 (선택, 브라우저 File 보관용) ─
    /**
     * 커버 이미지 파일 (선택 항목).
     *
     * 보관 규약:
     *  - StepBasic 에서 setValue("cover", file) 로 RHF 상태에 저장
     *  - StepContact 제출 시 (getValues("cover") as File) ?? null 로 꺼내
     *    submitRegistration(values, coverFile) 의 두 번째 인수로 전달
     *  - SSR 에서 File 클래스가 없으므로 z.any().optional() 로 선언 (Zod 검증 없음)
     *  - STEP_FIELDS.basic 에는 포함하지 않음 (선택 항목 — trigger 부분검증 제외)
     */
    cover: z.any().optional(),
  })
  .superRefine((data, ctx) => {
    // Instagram / X / LINE 중 최소 1개 입력 필수
    const hasAtLeastOneSns =
      (data.contact_instagram && data.contact_instagram.trim() !== "") ||
      (data.contact_x && data.contact_x.trim() !== "") ||
      (data.contact_line && data.contact_line.trim() !== "");

    if (!hasAtLeastOneSns) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        // contact_instagram 에 에러를 붙여 폼 UI 에서 첫 번째 필드에 표시되도록 함
        path: ["contact_instagram"],
        message: "Instagram・X・LINE のいずれかを入力してください",
      });
    }
  });

// ─────────────────────────────────────────
// 단계별 필드 매핑 (RHF trigger 용)
// ─────────────────────────────────────────

/**
 * 다단계 폼에서 "다음" 버튼 클릭 시 해당 단계의 필드만 부분검증하기 위한 상수.
 *
 * UI 에이전트가 `useFormContext().trigger(STEP_FIELDS.basic)` 형태로 사용합니다.
 *
 * @example
 * // 단계 1 검증
 * const isValid = await trigger(STEP_FIELDS.basic);
 * if (isValid) setStep(2);
 */
export const STEP_FIELDS = {
  /** 단계 1: 기본 정보 필드 목록 */
  basic: [
    "name",
    "category",
    "official_type",
    "activity_frequency",
    "member_count",
    "description",
  ] as const,

  /** 단계 2: 태그 필드 목록 */
  tags: ["tags"] as const,

  /** 단계 3: 연락처 + 서약 필드 목록 */
  contact: ["contact_instagram", "contact_x", "contact_line", "pledge1", "pledge2"] as const,
} satisfies Record<string, readonly string[]>;

// ─────────────────────────────────────────
// 타입 export
// ─────────────────────────────────────────

/** 등록 폼 전체 값 타입 (z.infer 로 스키마와 자동 동기화) */
export type RegistrationValues = z.infer<typeof registrationSchema>;
