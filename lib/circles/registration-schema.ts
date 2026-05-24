/**
 * lib/circles/registration-schema.ts
 *
 * 역할:
 *  - 서클 등록 폼의 Zod 검증 스키마 정의
 *  - SNS 핸들/ID 형식 검증 (2026-05 개편: URL 화이트리스트 → 핸들/ID 형식으로 교체)
 *  - react-hook-form 의 단계별 부분검증(trigger)을 위한 STEP_FIELDS 상수 제공
 *  - UI 에이전트가 이 파일의 타입·상수를 그대로 import 해서 사용하므로 SSOT 역할
 *
 * SNS 입력 방식 변경 (2026-05):
 *  - 이전: 전체 URL 직접 입력 (URL 화이트리스트 검증)
 *  - 이후: 핸들/ID 만 입력, 폼↔저장 경계에서 변환
 *    · Instagram: 핸들 "keio_tennis" → DB 저장 "https://instagram.com/keio_tennis"
 *    · X        : 핸들 "keio_tennis" → DB 저장 "https://x.com/keio_tennis"
 *    · LINE     : ID   "@keio_tennis"→ DB 저장 "https://line.me/R/ti/p/%40keio_tennis"
 *  - DB 저장 형식(전체 URL)은 변경 없음 — join-channel-modal 등 표시 로직 그대로
 *
 * 주의:
 *  - 이 파일은 브라우저·서버 양쪽에서 import 가능한 순수 로직 파일
 *  - Supabase / next/headers 등 런타임 의존성 없음
 *
 * ── 커버 이미지 보관 인터페이스 규약 ─────────────────────────────────────────
 *  cover 필드는 브라우저 File 객체를 RHF 상태로 보관하기 위한 필드입니다.
 *
 *  규약 (다음 에이전트가 StepBasic 에서 커버 입력을 구현할 때 반드시 따를 것):
 *   - 저장: StepBasic 에서 사용자가 파일들을 선택하면 setValue("cover", File[]) 로 보관
 *   - 제출: StepContact 에서 최종 제출 시 (getValues("cover") as File[]) ?? [] 로 꺼냄
 *   - Zod 검증: z.any().optional() — 브라우저 File 은 SSR 에서 존재하지 않으므로
 *     Zod 검증 대신 컴포넌트에서 직접 타입 확인
 *   - STEP_FIELDS.basic 에는 포함하지 않음 — trigger 대상 외(컨테이너 레벨에서 수동 검증)
 *   - defaultValues: cover: undefined
 *
 *  ★ 필수 검증 규약 (2026-05 변경):
 *   - 커버 이미지는 신규 등록·편집 모두 「必須」입니다.
 *   - Zod 로는 검증 불가이므로 circle-registration-form.tsx 의 goNext 함수에서
 *     basic 단계 통과 직전에 수동 체크합니다:
 *       const hasCover = !!methods.getValues("cover") || !!existingCoverUrl;
 *       if (!hasCover) → methods.setError("cover", ...) 하고 진행 차단.
 *   - StepBasic 은 errors.cover(RHF) 를 인라인 에러로 표시하고,
 *     파일 선택 시 clearErrors("cover") 로 해제합니다.
 */

import { z } from "zod";

import { ACTIVITY_FREQUENCIES } from "@/lib/constants/activity-frequency";
import { ACTIVITY_TIME_BANDS } from "@/lib/constants/activity-time-band";
import { IRREGULAR_DAY } from "@/lib/circles/filter-labels";
import { CATEGORIES } from "@/lib/constants/category";
import { MEMBER_BANDS } from "@/lib/constants/member-band";
import { OFFICIAL_TYPES } from "@/lib/constants/official-type";
import type { CircleDetail } from "@/lib/types/domain";
import { instagramUrlToHandle, xUrlToHandle, lineUrlToId } from "@/lib/circles/sns";

/**
 * 활동 요일 한자 토큰 7종 (月〜日).
 * activity_days 텍스트(예: "月・水・金" / "毎週火曜")에서 요일만 정규 추출할 때 사용.
 * (lib/dummy/circles.ts 의 parseActivityWeekdays · DB 의 parse_activity_weekdays 와 동일 규칙)
 */
const WEEKDAY_TOKENS = ["月", "火", "水", "木", "金", "土", "日"] as const;

/**
 * activity_days 텍스트 → 요일 토큰 배열로 역변환 (수정 폼 초기값 복원용).
 *  - "X曜" 형식: 曜 앞 글자만 요일로 인정 ("曜日"의 日 같은 false-positive 차단)
 *  - bare 형식("月・水・金"): 曜 가 없으면 구분자로 분리한 토큰이 요일
 */
function parseWeekdayTokens(src: string | null | undefined): string[] {
  if (!src) return [];
  const hasYou = src.includes("曜");
  const bareTokens = hasYou ? [] : src.split(/[・･,、\s]+/).map((s) => s.trim());
  return WEEKDAY_TOKENS.filter(
    (wd) => src.includes(`${wd}曜`) || (!hasYou && bareTokens.includes(wd))
  );
}

// ─────────────────────────────────────────
// SNS 핸들/ID 형식 검증 정규식
// ─────────────────────────────────────────

/**
 * Instagram/X 핸들 허용 패턴.
 * 영숫자·언더스코어·점, 1~30자, 선행 @ 허용.
 * 예: "keio_tennis", "@keio.tennis"
 */
const SNS_HANDLE_REGEX = /^@?[A-Za-z0-9_.]{1,30}$/;

/**
 * LINE Basic ID 허용 패턴.
 * 영숫자·언더스코어·점·하이픈, 1~30자, 선행 @ 허용.
 * 예: "@keio_tennis", "keio-tennis"
 */
const LINE_ID_REGEX = /^@?[A-Za-z0-9_.\\-]{1,30}$/;

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
 * 검증 규칙 (2026-05 개편):
 *  - Instagram/X/LINE 중 최소 1개 입력 필수 (.superRefine)
 *  - 각 SNS 는 핸들/ID 형식 검증 (URL 화이트리스트 검증 폐지)
 *  - pledge1, pledge2 는 반드시 true (체크박스 동의 필수)
 */
const baseSchema = z.object({
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

  // 모집 상태(recruitment_status)는 등록 폼에서 받지 않는다 (2026-05 결정).
  //  - 신규 등록: 募集中(year_round) 으로 고정 저장 (submit-registration 의 INSERT)
  //  - 이후 변경: 마이페이지의 모집 상태 토글로 운영자가 직접 조절
  //  - 편집(updateCircle)은 recruitment_status 를 건드리지 않아 토글 값을 보존

  /**
   * 활동 시간대 (복수 가능, 任意).
   * 칩 다중 선택 → ActivityTimeBand[] 배열로 보관 → DB activity_time_band(enum[]) 저장.
   * 미선택 시 빈 배열. 사용자 검색 필터 「活動時間帯」 와 매칭.
   */
  activity_time_band: z.array(z.enum(ACTIVITY_TIME_BANDS)),

  /**
   * 활동 요일 (한자 토큰 복수, 任意).
   * 칩 다중 선택 → ["月","水"] 배열로 보관 → 제출 시 "月・水" text 로 join 하여
   * DB activity_days(text) 저장 → 생성 컬럼 activity_weekdays 가 자동 파싱.
   * 사용자 검색 필터 「活動曜日」 와 매칭.
   */
  activity_weekdays: z.array(z.string()),

  /**
   * 부원 수 범위 (5구간 enum, 任意).
   * 숫자 직접 입력 → 범위 칩 단일 선택으로 변경 (2026-05 개편).
   */
  member_band: z.enum(MEMBER_BANDS).optional(),

  /** 서클 소개 (최대 2000자, 미입력 가능). 이모지·줄바꿈·리스트 등 자유 서식 권장 */
  description: z.string().max(2000, "説明は2000文字以内で入力してください").optional(),

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
   * Instagram 핸들 (공식 계정 ユーザー名).
   * 입력: "keio_tennis" または "@keio_tennis"
   * 저장: submit 시 "https://instagram.com/keio_tennis" 로 변환됨 (submit-registration.ts 담당)
   * 형식: 영숫자·언더스코어·점, 1~30자, 선행 @ 허용
   */
  contact_instagram: z
    .string()
    .optional()
    .refine(
      (val) => !val || SNS_HANDLE_REGEX.test(val.trim()),
      "Instagram のユーザー名を入力してください（例: keio_tennis）"
    ),

  /**
   * X (구 Twitter) 핸들 (공식 계정 ユーザー名).
   * 입력: "keio_tennis" または "@keio_tennis"
   * 저장: submit 시 "https://x.com/keio_tennis" 로 변환됨 (submit-registration.ts 담당)
   * 형식: 영숫자·언더스코어·점, 1~30자, 선행 @ 허용
   */
  contact_x: z
    .string()
    .optional()
    .refine(
      (val) => !val || SNS_HANDLE_REGEX.test(val.trim()),
      "X のユーザー名を入力してください（例: keio_tennis）"
    ),

  /**
   * LINE 공식계정 Basic ID.
   * 입력: "@keio_tennis" または "keio_tennis"（@ は自動付与）
   * 저장: submit 시 "https://line.me/R/ti/p/%40keio_tennis" 로 변환됨 (submit-registration.ts 담당)
   * 형식: 영숫자·언더스코어·점·하이픈, 1~30자, 선행 @ 허용
   */
  contact_line: z
    .string()
    .optional()
    .refine(
      (val) => !val || LINE_ID_REGEX.test(val.trim()),
      "LINE 公式アカウントの ID を入力してください（例: @keio_tennis）"
    ),

  /**
   * 신청 메모 (任意, 최대 500자) — 관리자 심사용 전달 메모.
   * 등록 시에만 입력받아 circles.submission_note 에 저장(수정 시엔 변경하지 않음).
   */
  submission_note: z.string().max(500, "申請メモは500文字以内で入力してください").optional(),

  /** 서약 1: 정보 정확성 동의 (반드시 체크) */
  pledge1: z.literal(true, "同意が必要です"),

  /** 서약 2: 이용규약 동의 (반드시 체크) */
  pledge2: z.literal(true, "同意が必要です"),

  // ── 커버 이미지 (필수, 브라우저 File 보관용) ─
  /**
   * 커버 이미지 파일 배열 (★ 필수 항목 — 2026-05 변경, 최대 5장).
   *
   * 보관 규약:
   *  - StepBasic 에서 setValue("cover", File[]) 로 RHF 상태에 저장 (누적 선택 방식)
   *  - StepContact 제출 시 (getValues("cover") as File[]) ?? [] 로 꺼내
   *    submitRegistration(values, coverFiles) 의 두 번째 인수로 전달
   *  - SSR 에서 File 클래스가 없으므로 z.any().optional() 로 선언 (Zod 검증 없음)
   *  - 필수 검증은 circle-registration-form.tsx 의 goNext 에서 수동으로 처리
   *    (hasCover 체크 → 미선택 시 setError("cover"), 선택 시 clearErrors("cover"))
   *  - STEP_FIELDS.basic 에는 포함하지 않음 (trigger 대상 외 — 컨테이너 레벨 검증)
   */
  cover: z.any().optional(),
});

/**
 * SNS 최소 1개 입력 강제 refinement — 등록·수정 공통.
 * Instagram / X / LINE 중 하나라도 입력돼 있어야 한다.
 * (contact_* 필드만 참조하므로 base / pledge-omit(edit) 양쪽 스키마에 모두 적용 가능)
 */
function requireAtLeastOneSns(
  data: { contact_instagram?: string; contact_x?: string; contact_line?: string },
  ctx: z.RefinementCtx
) {
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
}

/**
 * 등록·수정 공통 스키마 — base 필드(서약 pledge1/2 포함) + SNS 최소 1개.
 * 수정 화면도 이 스키마를 재사용한다(서약은 edit 시 defaultValues=true 로 채우고 UI 만 숨김 →
 * 재동의 없이 검증 통과). 별도 edit 스키마를 두지 않아 useForm 제네릭/타입이 단순해진다.
 */
export const registrationSchema = baseSchema.superRefine(requireAtLeastOneSns);

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
  /**
   * 단계 1(편집/전체): 기본 정보 전체 필드.
   * 수정(edit) 화면은 사후 보강 입력처라 시간대·요일·회원수·소개까지 모두 검증·노출.
   */
  basic: [
    "name",
    "category",
    "official_type",
    "activity_frequency",
    "activity_time_band",
    "activity_weekdays",
    "member_band",
    "description",
  ] as const,

  /**
   * 단계 1(신규 등록 최소): 핵심 4종만.
   * 등록 부담을 줄이기 위해 시간대·요일·회원수·소개·태그는 등록에서 받지 않고
   * 승인 후 마이페이지(완성도 보강) 에서 채운다. (2026-05 A안)
   */
  basicMinimal: ["name", "category", "official_type", "activity_frequency"] as const,

  /** 단계 2: 태그 필드 목록 (수정 화면 전용 — 신규 등록은 태그 단계 스킵) */
  tags: ["tags"] as const,

  /** 단계 3: 연락처 + 서약 필드 목록 */
  contact: ["contact_instagram", "contact_x", "contact_line", "pledge1", "pledge2"] as const,
} satisfies Record<string, readonly string[]>;

// ─────────────────────────────────────────
// 타입 export
// ─────────────────────────────────────────

/** 등록 폼 전체 값 타입 (z.infer 로 스키마와 자동 동기화). 수정 화면도 이 타입을 재사용. */
export type RegistrationValues = z.infer<typeof registrationSchema>;

/**
 * DB 의 CircleDetail 을 수정 폼 초기값(RegistrationValues)으로 변환한다.
 * - tags 는 toCircleDetail 결과가 이미 slug 배열이므로 그대로 사용
 * - contact_* 는 DB 에 저장된 전체 URL → 핸들/ID 로 역변환하여 폼에 표시
 *   (snsFromUrl 를 사용. 역변환 불가 시 best-effort 로 원본 반환)
 * - cover 는 새 파일 선택 전까지 undefined(기존 cover_image_url 은 폼 밖에서 미리보기로 표시)
 * - pledge1/2 는 등록 시 이미 동의했으므로 true 로 채워 검증을 통과시킨다(수정 화면은 서약 UI 숨김)
 */
export function circleToEditValues(circle: CircleDetail): RegistrationValues {
  return {
    name: circle.name,
    category: circle.category,
    official_type: circle.official_type,
    activity_frequency: circle.activity_frequency,
    // 활동 시간대: 신규 enum(ACTIVITY_TIME_BANDS) 값만 — 레거시(weekday_*) 는 제외해
    // 편집 제출 시 z.enum 검증을 통과시킨다.
    activity_time_band: (circle.activity_time_band ?? []).filter(
      (b): b is (typeof ACTIVITY_TIME_BANDS)[number] =>
        (ACTIVITY_TIME_BANDS as readonly string[]).includes(b)
    ),
    // 활동 요일: "不定期" 면 [不定期], 아니면 "月・水" → ["月","水"] 토큰 배열로 역변환
    activity_weekdays: (circle.activity_days ?? "").includes(IRREGULAR_DAY)
      ? [IRREGULAR_DAY]
      : parseWeekdayTokens(circle.activity_days),
    // member_count → member_band 로 교체 (수정 폼에서 기존 범위 칩 반영)
    member_band: circle.member_band ?? undefined,
    description: circle.description,
    tags: circle.tags,
    // DB URL → 핸들/ID 역변환: 편집 모드에서 사용자에게 핸들이 보이도록
    // instagramUrlToHandle: "https://instagram.com/keio_tennis" → "keio_tennis"
    // xUrlToHandle       : "https://x.com/keio_tennis"         → "keio_tennis"
    // lineUrlToId        : "https://line.me/R/ti/p/%40keio"     → "@keio"
    contact_instagram: instagramUrlToHandle(circle.contact_instagram ?? ""),
    contact_x: xUrlToHandle(circle.contact_x ?? ""),
    contact_line: lineUrlToId(circle.contact_line ?? ""),
    pledge1: true,
    pledge2: true,
    cover: undefined,
  };
}
