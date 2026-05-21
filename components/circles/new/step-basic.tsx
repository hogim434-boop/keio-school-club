"use client";

/**
 * StepBasic — 서클 등록 1단계: 기본 정보 입력
 *
 * 담당 필드: name, category, official_type, activity_frequency, member_count, description, cover
 *
 * 구조:
 *  - FormProvider(CircleRegistrationForm) 아래에서 useFormContext<RegistrationValues>() 로 접근
 *  - 제출 버튼 없음 — 단계 이동은 컨테이너 footer의 "次へ" 버튼이 담당
 *  - 커버 이미지: validateUpload() 검증 후 setValue("cover", file) 로 RHF 상태 보관
 *    → 제출 시 StepContact 가 getValues("cover") 로 꺼내 submitRegistration 에 전달
 *
 * 애니메이션: step-contact.tsx 와 동일한 FADE_UP stagger 패턴
 */

import { useEffect, useRef, useState } from "react";
import { useFormContext } from "react-hook-form";
import { LazyMotion, domAnimation, m, useReducedMotion } from "motion/react";
import { ImageIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { AUTH_INPUT_CLS } from "@/lib/auth/input-class";
import { validateUpload } from "@/lib/storage/strip-exif";
import type { RegistrationValues } from "@/lib/circles/registration-schema";
import { CATEGORIES, CATEGORY_LABELS } from "@/lib/constants/category";
import { OFFICIAL_TYPES, OFFICIAL_TYPE_LABELS } from "@/lib/constants/official-type";
import {
  ACTIVITY_FREQUENCIES,
  ACTIVITY_FREQUENCY_LABELS,
} from "@/lib/constants/activity-frequency";
import { cn } from "@/lib/utils";

// ── 스타일 토큰 ────────────────────────────────────────────────────────────────
// step-contact.tsx 와 동일한 상수명/값 사용
const EASE_EXPO_OUT = [0.22, 1, 0.36, 1] as const;

const FADE_UP_VARIANTS = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
} as const;

/** 각 필드 위에 표시되는 라벨 스타일 */
const FIELD_LABEL_CLS = "text-sm font-medium text-foreground";

/** 인라인 에러 메시지 스타일 */
const ERROR_MSG_CLS = "text-xs text-red-500";

/**
 * native <select> 에 적용할 스타일.
 * AUTH_INPUT_CLS 의 높이·모양·채움 스타일을 그대로 가져오면서
 * select 에 맞게 px-3 · cursor-pointer · focus: 계열을 추가합니다.
 * (shadcn Input 은 <input> 전용이라 <select> 에 직접 적용 불가)
 */
const SELECT_CLS =
  "h-12 w-full rounded-xl border-0 bg-neutral-100 shadow-none text-base " +
  "px-3 cursor-pointer transition-colors " +
  "text-foreground focus:outline-none focus:bg-white focus:ring-2 focus:ring-keio-navy/40";

/**
 * <textarea> 에 적용할 스타일.
 * AUTH_INPUT_CLS 에서 h-12 를 제거하고 min-h + resize-none + p-3 추가.
 */
const TEXTAREA_CLS =
  "w-full rounded-xl border-0 bg-neutral-100 shadow-none text-base resize-none " +
  "p-3 min-h-[140px] transition-colors placeholder:text-muted-foreground " +
  "focus-visible:outline-none focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-keio-navy/40";

// ── 컴포넌트 ──────────────────────────────────────────────────────────────────

/**
 * 서클 기본 정보 입력 스텝.
 *
 * 커버 이미지 저장 규약:
 *  - 사용자가 파일을 선택하면 validateUpload() 검증 후 setValue("cover", file) 로 보관
 *  - STEP_FIELDS.basic 에 cover 는 포함되지 않으므로 "次へ" trigger 대상 아님
 *  - 제출 시 StepContact 가 getValues("cover") instanceof File 로 꺼내감
 */
export function StepBasic() {
  // ── FormContext 접근 ─────────────────────────────────────────────────────
  const {
    register,
    setValue,
    formState: { errors },
  } = useFormContext<RegistrationValues>();

  // ── 접근성: 감소된 모션 사용자 대응 ─────────────────────────────────────
  const reducedMotion = useReducedMotion();
  const initial = reducedMotion ? "visible" : "hidden";

  /** stagger delay 헬퍼 — step-contact 와 동일 패턴 */
  const makeFadeTransition = (delay: number) =>
    reducedMotion ? { duration: 0 } : { duration: 0.42, ease: EASE_EXPO_OUT, delay };

  // ── 커버 이미지 state ────────────────────────────────────────────────────
  /** 미리보기 objectURL — 변경 시 이전 URL 해제(cleanup) */
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  /** 파일 검증 실패 시 인라인 에러 메시지 */
  const [coverError, setCoverError] = useState<string | null>(null);
  /** 숨겨진 file input 참조 — 커스텀 버튼에서 클릭 트리거 */
  const fileInputRef = useRef<HTMLInputElement>(null);

  // objectURL 메모리 정리: previewUrl 이 바뀌거나 언마운트 시
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // ── 커버 이미지 변경 핸들러 ─────────────────────────────────────────────
  /**
   * 파일 input onChange 에서 호출됩니다.
   * 1. validateUpload() 로 크기(4MB) · MIME(jpeg/png/webp) 검증
   * 2. 실패: coverError 상태에 메시지 → 인라인 에러 표시
   * 3. 통과: setValue("cover", file) 로 RHF 에 보관 + objectURL 미리보기 갱신
   */
  function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;

    // 이전 에러 초기화
    setCoverError(null);

    // 파일 검증 (validateUpload 는 브라우저·서버 모두 사용 가능)
    const result = validateUpload(file);
    if (!result.ok) {
      // 에러 메시지를 일본어로 변환해 표시
      // (validateUpload 의 에러 메시지는 한국어 — UI는 일본어로 재작성)
      if (file.size > 4 * 1024 * 1024) {
        setCoverError("ファイルサイズは4MB以下にしてください");
      } else {
        setCoverError("JPEG・PNG・WebP 形式の画像を選択してください");
      }
      // input 값 초기화 (같은 파일 재선택 허용)
      e.target.value = "";
      return;
    }

    // 이전 objectURL 해제 후 새 URL 생성
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const newUrl = URL.createObjectURL(file);
    setPreviewUrl(newUrl);

    // RHF 상태에 File 보관 (shouldValidate 불필요 — cover 는 trigger 대상 외)
    setValue("cover", file);
  }

  return (
    <LazyMotion features={domAnimation}>
      <div className="flex flex-col gap-8 pt-12">
        {/* ── 타이틀 블록 ─────────────────────────────────────────────────── */}
        <m.div
          className="flex flex-col gap-2"
          variants={FADE_UP_VARIANTS}
          initial={initial}
          animate="visible"
          transition={makeFadeTransition(0.05)}
        >
          <h1 className="text-[1.75rem] leading-snug font-bold tracking-tight">
            基本情報を入力してください
          </h1>
          <p className="text-muted-foreground text-sm">
            サークルのプロフィールになる情報を登録します
          </p>
        </m.div>

        {/* ── 단체명 필드 ─────────────────────────────────────────────────── */}
        <m.div
          className="flex flex-col gap-1.5"
          variants={FADE_UP_VARIANTS}
          initial={initial}
          animate="visible"
          transition={makeFadeTransition(0.12)}
        >
          <label htmlFor="name" className={FIELD_LABEL_CLS}>
            サークル名
            {/* 필수 표시 */}
            <span className="ml-1 text-red-500" aria-hidden="true">
              *
            </span>
          </label>
          <Input
            id="name"
            type="text"
            maxLength={50}
            placeholder="例：慶應テニスサークル"
            autoComplete="organization"
            className={cn(
              AUTH_INPUT_CLS,
              // 에러 시 붉은 ring
              errors.name && "ring-2 ring-red-400 focus-visible:ring-red-400"
            )}
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "error-name" : undefined}
            aria-required="true"
            {...register("name")}
          />
          {errors.name && (
            <p id="error-name" role="alert" className={ERROR_MSG_CLS}>
              {errors.name.message}
            </p>
          )}
        </m.div>

        {/* ── 카테고리 · 단체분류 · 활동빈도 그룹 ────────────────────────── */}
        <m.div
          className="flex flex-col gap-5"
          variants={FADE_UP_VARIANTS}
          initial={initial}
          animate="visible"
          transition={makeFadeTransition(0.19)}
        >
          {/* 카테고리 select */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="category" className={FIELD_LABEL_CLS}>
              カテゴリ
              <span className="ml-1 text-red-500" aria-hidden="true">
                *
              </span>
            </label>
            <select
              id="category"
              aria-invalid={!!errors.category}
              aria-describedby={errors.category ? "error-category" : undefined}
              aria-required="true"
              className={cn(
                SELECT_CLS,
                // 미선택(값 없음) 시 muted-foreground 색상
                "invalid:text-muted-foreground",
                errors.category && "ring-2 ring-red-400 focus:ring-red-400"
              )}
              {...register("category")}
              defaultValue=""
            >
              {/* 미선택 placeholder 옵션 */}
              <option value="" disabled className="text-muted-foreground">
                カテゴリを選択
              </option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_LABELS[cat]}
                </option>
              ))}
            </select>
            {errors.category && (
              <p id="error-category" role="alert" className={ERROR_MSG_CLS}>
                {errors.category.message}
              </p>
            )}
          </div>

          {/* 단체 분류 select */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="official_type" className={FIELD_LABEL_CLS}>
              団体区分
              <span className="ml-1 text-red-500" aria-hidden="true">
                *
              </span>
            </label>
            <select
              id="official_type"
              aria-invalid={!!errors.official_type}
              aria-describedby={errors.official_type ? "error-official-type" : undefined}
              aria-required="true"
              className={cn(
                SELECT_CLS,
                errors.official_type && "ring-2 ring-red-400 focus:ring-red-400"
              )}
              {...register("official_type")}
              defaultValue=""
            >
              <option value="" disabled>
                団体区分を選択
              </option>
              {OFFICIAL_TYPES.map((type) => (
                <option key={type} value={type}>
                  {OFFICIAL_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
            {errors.official_type && (
              <p id="error-official-type" role="alert" className={ERROR_MSG_CLS}>
                {errors.official_type.message}
              </p>
            )}
          </div>

          {/* 활동 빈도 select */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="activity_frequency" className={FIELD_LABEL_CLS}>
              活動頻度
              <span className="ml-1 text-red-500" aria-hidden="true">
                *
              </span>
            </label>
            <select
              id="activity_frequency"
              aria-invalid={!!errors.activity_frequency}
              aria-describedby={errors.activity_frequency ? "error-activity-frequency" : undefined}
              aria-required="true"
              className={cn(
                SELECT_CLS,
                errors.activity_frequency && "ring-2 ring-red-400 focus:ring-red-400"
              )}
              {...register("activity_frequency")}
              defaultValue=""
            >
              <option value="" disabled>
                活動頻度を選択
              </option>
              {ACTIVITY_FREQUENCIES.map((freq) => (
                <option key={freq} value={freq}>
                  {ACTIVITY_FREQUENCY_LABELS[freq]}
                </option>
              ))}
            </select>
            {errors.activity_frequency && (
              <p id="error-activity-frequency" role="alert" className={ERROR_MSG_CLS}>
                {errors.activity_frequency.message}
              </p>
            )}
          </div>
        </m.div>

        {/* ── 회원수 + 개요 그룹 ──────────────────────────────────────────── */}
        <m.div
          className="flex flex-col gap-5"
          variants={FADE_UP_VARIANTS}
          initial={initial}
          animate="visible"
          transition={makeFadeTransition(0.26)}
        >
          {/* 회원 수 input (optional) */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="member_count" className={FIELD_LABEL_CLS}>
              会員数
              {/* 임의 항목 표시 */}
              <span className="text-muted-foreground ml-1.5 text-xs font-normal">（任意）</span>
            </label>
            <Input
              id="member_count"
              type="text"
              inputMode="numeric"
              placeholder="例：30"
              className={cn(
                AUTH_INPUT_CLS,
                errors.member_count && "ring-2 ring-red-400 focus-visible:ring-red-400"
              )}
              aria-invalid={!!errors.member_count}
              aria-describedby={errors.member_count ? "error-member-count" : undefined}
              {...register("member_count")}
            />
            {errors.member_count && (
              <p id="error-member-count" role="alert" className={ERROR_MSG_CLS}>
                {errors.member_count.message}
              </p>
            )}
          </div>

          {/* 서클 소개 textarea (optional) */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="description" className={FIELD_LABEL_CLS}>
              サークル紹介
              <span className="text-muted-foreground ml-1.5 text-xs font-normal">
                （任意・1000文字以内）
              </span>
            </label>
            <textarea
              id="description"
              rows={5}
              maxLength={1000}
              placeholder="サークルの活動内容・雰囲気・新入生へのメッセージなどを自由に記入してください"
              aria-invalid={!!errors.description}
              aria-describedby={errors.description ? "error-description" : undefined}
              className={cn(
                TEXTAREA_CLS,
                errors.description && "ring-2 ring-red-400 focus-visible:ring-red-400"
              )}
              {...register("description")}
            />
            {errors.description && (
              <p id="error-description" role="alert" className={ERROR_MSG_CLS}>
                {errors.description.message}
              </p>
            )}
          </div>
        </m.div>

        {/* ── 커버 이미지 (선택) ──────────────────────────────────────────── */}
        <m.div
          className="flex flex-col gap-2"
          variants={FADE_UP_VARIANTS}
          initial={initial}
          animate="visible"
          transition={makeFadeTransition(0.33)}
        >
          <p className={FIELD_LABEL_CLS}>
            カバー画像
            <span className="text-muted-foreground ml-1.5 text-xs font-normal">
              （任意・JPEG/PNG/WebP・4MB以内）
            </span>
          </p>

          {/* 숨겨진 file input — 커스텀 버튼으로 트리거 */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            aria-label="カバー画像を選択"
            className="sr-only"
            onChange={handleCoverChange}
          />

          {previewUrl ? (
            /* 미리보기 영역: 이미지 + 변경 버튼 */
            <div className="flex flex-col gap-2">
              <div className="relative overflow-hidden rounded-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="カバー画像プレビュー"
                  className="h-48 w-full object-cover"
                />
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "border-border rounded-xl border bg-neutral-100 py-2.5 text-sm font-medium",
                  "transition-colors hover:bg-neutral-200 active:bg-neutral-300"
                )}
              >
                画像を変更する
              </button>
            </div>
          ) : (
            /* 이미지 미선택 상태: 플레이스홀더 영역 + 선택 버튼 */
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "flex h-40 w-full flex-col items-center justify-center gap-2 rounded-xl",
                "border-border text-muted-foreground border-2 border-dashed bg-neutral-50",
                "hover:border-muted-foreground transition-colors hover:bg-neutral-100",
                "active:bg-neutral-200"
              )}
              aria-label="カバー画像を選択する"
            >
              {/* 이미지 아이콘 */}
              <ImageIcon className="size-8 opacity-40" aria-hidden="true" />
              <span className="text-sm">カバー画像を選択</span>
            </button>
          )}

          {/* 커버 검증 에러 메시지 */}
          {coverError && (
            <p role="alert" className={ERROR_MSG_CLS}>
              {coverError}
            </p>
          )}
        </m.div>

        {/* 하단 여백: AuthScreen footer 가 콘텐츠를 가리지 않도록 */}
        <div className="pb-4" aria-hidden="true" />
      </div>
    </LazyMotion>
  );
}
