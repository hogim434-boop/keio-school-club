"use client";

/**
 * StepContact — 서클 등록 3단계: SNS 연락처 + 서약 입력 + 최종 제출
 *
 * 담당 필드: contact_instagram, contact_x, contact_line, pledge1, pledge2
 *
 * 폼 제출 구조 (방법 a — form id 연결):
 *  - 이 컴포넌트가 <form id={CIRCLE_REGISTRATION_FORM_ID}> 로 본문을 감싼다.
 *  - 실제 제출 버튼은 컨테이너(CircleRegistrationForm) 의 sticky footer 에 위치.
 *    → <Button type="submit" form={CIRCLE_REGISTRATION_FORM_ID}>
 *  - 이 방식으로 제출 버튼이 AuthScreen 하단에 고정되면서
 *    폼 필드와 버튼이 HTML 표준(form 속성)으로 연결된다.
 *
 * 커버 이미지 규약:
 *  - 이 컴포넌트가 getValues("cover") 로 커버 File 을 꺼내 submitRegistration 에 전달한다.
 *  - cover 저장은 StepBasic 에서 setValue("cover", file) 로 이루어진다.
 *  - (다음 에이전트가 StepBasic 커버 입력을 구현할 때 이 규약을 따를 것)
 *
 * 제출 흐름:
 *  1. RHF handleSubmit → zod 가 화이트리스트·서약·SNS최소1 자동 검증
 *  2. 검증 통과 시 submitRegistration(values, coverFile) 호출
 *  3. 성공: onRegistered() → 컨테이너가 "done" 단계로 전환
 *  4. 실패: submitError 상태에 메시지 저장 → 폼 위에 role="alert" 표시
 *
 * 애니메이션: sign-up-form FADE_UP stagger 패턴 (타이틀→안내→필드3개→서약→에러)
 *
 * 상위 컴포넌트 CircleRegistrationForm 의 FormProvider 아래에서
 * useFormContext<RegistrationValues>() 로 폼 상태에 접근합니다.
 */

import { useState } from "react";
import { useFormContext, Controller } from "react-hook-form";
import { LazyMotion, domAnimation, m, useReducedMotion } from "motion/react";

import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { AUTH_INPUT_CLS } from "@/lib/auth/input-class";
import { submitRegistration, updateCircle } from "@/lib/circles/submit-registration";
import type { RegistrationValues } from "@/lib/circles/registration-schema";
import { cn } from "@/lib/utils";

// ── form id 상수 ────────────────────────────────────────────────────────────
/**
 * 본문 <form> 과 컨테이너 footer 의 <Button type="submit"> 을 연결하는 id.
 * CircleRegistrationForm 에서 import 해서 form 속성에 사용한다.
 */
export const CIRCLE_REGISTRATION_FORM_ID = "circle-registration";

// ── Props ──────────────────────────────────────────────────────────────────
export interface StepContactProps {
  /**
   * 등록/수정 성공 후 호출되는 콜백.
   * create: 컨테이너가 step=done 으로 전환 / edit: 상세 페이지로 복귀.
   */
  onRegistered: () => void;
  /** "create"(기본) | "edit" — edit 면 서약 UI 를 숨기고 updateCircle 로 제출. */
  mode?: "create" | "edit";
  /** edit 모드 대상 서클 id — updateCircle 호출에 사용. */
  circleId?: string;
  /**
   * edit 모드에서 유지할 기존 커버 이미지 URL 목록.
   * CircleRegistrationForm 의 keepImagesRef 에서 최신값으로 전달.
   * updateCircle 의 네 번째 인수로 전달됨.
   */
  keepImageUrls?: string[];
}

// ── 스타일 토큰 ──────────────────────────────────────────────────────────────
// 프로젝트 표준 expo-out easing
const EASE_EXPO_OUT = [0.22, 1, 0.36, 1] as const;

// 표준 페이드+슬라이드업 variants (sign-up-form 와 동일)
const FADE_UP_VARIANTS = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
} as const;

// ── 라벨 스타일 ──────────────────────────────────────────────────────────────
// 각 SNS 필드 위에 표시되는 라벨 텍스트 스타일
const FIELD_LABEL_CLS = "text-sm font-medium text-foreground";

// 에러 메시지 스타일 (인라인 표시)
const ERROR_MSG_CLS = "text-xs text-red-500";

/**
 * SNS 연락처 + 서약 입력 스텝.
 *
 * form id 패턴:
 *  - 본문: <form id={CIRCLE_REGISTRATION_FORM_ID} onSubmit={handleSubmit(onSubmit)}>
 *  - 제출 버튼: 컨테이너 footer 의 <Button type="submit" form={CIRCLE_REGISTRATION_FORM_ID}>
 */
export function StepContact({
  onRegistered,
  mode = "create",
  circleId,
  keepImageUrls = [],
}: StepContactProps) {
  const isEdit = mode === "edit";

  // ── FormContext 접근 ─────────────────────────────────────────────────────
  const {
    register,
    control,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useFormContext<RegistrationValues>();

  // ── 제출 에러 상태 ───────────────────────────────────────────────────────
  // submitRegistration 이 { error: string } 을 반환할 때 표시
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ── 접근성: 감소된 모션 사용자 대응 ─────────────────────────────────────
  const reducedMotion = useReducedMotion();
  const initial = reducedMotion ? "visible" : "hidden";

  // stagger delay 헬퍼
  const makeFadeTransition = (delay: number) =>
    reducedMotion ? { duration: 0 } : { duration: 0.42, ease: EASE_EXPO_OUT, delay };

  // ── 폼 제출 핸들러 ───────────────────────────────────────────────────────
  /**
   * RHF handleSubmit 래퍼.
   * zod 검증(화이트리스트·서약·SNS최소1) 을 통과한 values 만 여기 도달한다.
   */
  const onSubmit = async (values: RegistrationValues) => {
    setSubmitError(null);

    // 커버 이미지: StepBasic 에서 setValue("cover", File[]) 로 저장된 값을 꺼냄
    // cover 필드는 z.any().optional() 이므로 File[] 여부를 직접 확인
    const rawCover = getValues("cover");
    const coverFiles: File[] = Array.isArray(rawCover)
      ? rawCover.filter((f): f is File => f instanceof File)
      : rawCover instanceof File
        ? [rawCover] // 레거시 단일 File 방어
        : [];

    // edit: updateCircle(UPDATE) / create: submitRegistration(INSERT)
    const result =
      isEdit && circleId
        ? await updateCircle(circleId, values, coverFiles, keepImageUrls)
        : await submitRegistration(values, coverFiles);

    if ("error" in result) {
      // 제출 실패 — 에러 메시지 표시 후 재시도 가능 상태로 복원
      setSubmitError(result.error);
      return;
    }

    // 성공 → 컨테이너가 done 단계 전환(create) 또는 상세 복귀(edit)
    onRegistered();
  };

  return (
    <LazyMotion features={domAnimation}>
      {/*
        form id 연결:
         - id={CIRCLE_REGISTRATION_FORM_ID} 로 컨테이너 footer 버튼과 연결
         - onSubmit: RHF handleSubmit 을 통해 zod 검증 후 onSubmit 호출
         - noValidate: 브라우저 기본 HTML5 검증 비활성 (zod 가 담당)
      */}
      <form
        id={CIRCLE_REGISTRATION_FORM_ID}
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex flex-col gap-8 pt-12"
      >
        {/* ── 타이틀 블록 ─────────────────────────────────────────────── */}
        <m.div
          className="flex flex-col gap-2"
          variants={FADE_UP_VARIANTS}
          initial={initial}
          animate="visible"
          transition={makeFadeTransition(0.05)}
        >
          <h1 className="text-[1.75rem] leading-snug font-bold tracking-tight">
            {isEdit ? "連絡先" : "連絡先・規約への同意"}
          </h1>
          <p className="text-muted-foreground text-sm">
            サークル公式アカウントのIDを入力（1つ以上必須）
          </p>
        </m.div>

        {/* ── SNS 연락처 필드 그룹 ──────────────────────────────────── */}
        <m.div
          className="flex flex-col gap-5"
          variants={FADE_UP_VARIANTS}
          initial={initial}
          animate="visible"
          transition={makeFadeTransition(0.12)}
        >
          {/* Instagram ID 입력 필드 (도메인 접두사 없이 ID 직접 입력) */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="contact_instagram" className={FIELD_LABEL_CLS}>
              Instagram ID
            </label>
            <Input
              id="contact_instagram"
              type="text"
              inputMode="text"
              placeholder="例：keio_tennis"
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className={cn(
                AUTH_INPUT_CLS,
                errors.contact_instagram && "ring-2 ring-red-400 focus-visible:ring-red-400"
              )}
              aria-invalid={!!errors.contact_instagram}
              aria-describedby={errors.contact_instagram ? "error-instagram" : undefined}
              {...register("contact_instagram")}
            />
            {/* SNS 최소1 에러는 superRefine 에 의해 contact_instagram path 에 붙음 */}
            {errors.contact_instagram && (
              <p id="error-instagram" role="alert" className={ERROR_MSG_CLS}>
                {errors.contact_instagram.message}
              </p>
            )}
          </div>

          {/* X (구 Twitter) ID 입력 필드 */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="contact_x" className={FIELD_LABEL_CLS}>
              X（旧 Twitter）ID
            </label>
            <Input
              id="contact_x"
              type="text"
              inputMode="text"
              placeholder="例：keio_tennis"
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className={cn(
                AUTH_INPUT_CLS,
                errors.contact_x && "ring-2 ring-red-400 focus-visible:ring-red-400"
              )}
              aria-invalid={!!errors.contact_x}
              aria-describedby={errors.contact_x ? "error-x" : undefined}
              {...register("contact_x")}
            />
            {errors.contact_x && (
              <p id="error-x" role="alert" className={ERROR_MSG_CLS}>
                {errors.contact_x.message}
              </p>
            )}
          </div>

          {/* LINE ID 입력 필드 */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="contact_line" className={FIELD_LABEL_CLS}>
              LINE ID
            </label>
            <Input
              id="contact_line"
              type="text"
              inputMode="text"
              placeholder="例：@keio_tennis"
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className={cn(
                AUTH_INPUT_CLS,
                errors.contact_line && "ring-2 ring-red-400 focus-visible:ring-red-400"
              )}
              aria-invalid={!!errors.contact_line}
              aria-describedby={errors.contact_line ? "error-line" : undefined}
              {...register("contact_line")}
            />
            {errors.contact_line && (
              <p id="error-line" role="alert" className={ERROR_MSG_CLS}>
                {errors.contact_line.message}
              </p>
            )}
          </div>

          {/* 신청 메모 — 등록 시에만(심사 담당자에게 전달, 일반 비공개) */}
          {!isEdit && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="submission_note" className={FIELD_LABEL_CLS}>
                申請メモ
                <span className="text-muted-foreground ml-1.5 text-xs font-normal">（任意）</span>
              </label>
              <textarea
                id="submission_note"
                rows={3}
                maxLength={500}
                placeholder="団体の状況や補足情報など、審査担当者へ伝えたいことがあれば記入してください"
                aria-invalid={!!errors.submission_note}
                aria-describedby={
                  errors.submission_note ? "error-submission-note" : "hint-submission-note"
                }
                className={cn(
                  "w-full rounded-xl border-0 bg-neutral-100 p-3 text-base shadow-none transition-colors",
                  "placeholder:text-muted-foreground min-h-[88px] resize-none",
                  "focus-visible:ring-keio-navy/40 focus-visible:bg-white focus-visible:ring-2 focus-visible:outline-none",
                  errors.submission_note && "ring-2 ring-red-400 focus-visible:ring-red-400"
                )}
                {...register("submission_note")}
              />
              <p id="hint-submission-note" className="text-muted-foreground text-xs">
                審査時に管理者のみ確認します。一般には公開されません。
              </p>
              {errors.submission_note && (
                <p id="error-submission-note" role="alert" className={ERROR_MSG_CLS}>
                  {errors.submission_note.message}
                </p>
              )}
            </div>
          )}
        </m.div>

        {/* ── 서약 체크박스 그룹 — edit 모드에서는 숨김(재동의 불필요) ── */}
        {!isEdit && (
          <m.div
            className="flex flex-col gap-4"
            variants={FADE_UP_VARIANTS}
            initial={initial}
            animate="visible"
            transition={makeFadeTransition(0.2)}
          >
            <p className={cn(FIELD_LABEL_CLS, "text-base")}>規約への同意</p>

            {/* 서약 1: 실재 단체 + 학칙 준수 선언 */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-start gap-3">
                {/*
                Controller 사용 이유:
                shadcn Checkbox(Radix UI) 는 checked/onCheckedChange API 사용.
                RHF register 는 onChange/value API 이므로 Controller 로 브릿지.
                checked: !!value 로 boolean 강제 변환 (defaultValues 의 false 대응).
              */}
                <Controller
                  control={control}
                  name="pledge1"
                  render={({ field }) => (
                    <Checkbox
                      id="pledge1"
                      checked={!!field.value}
                      onCheckedChange={(checked) => {
                        // Radix UI onCheckedChange 는 boolean | "indeterminate" 반환
                        // indeterminate 는 false 로 처리
                        field.onChange(checked === true);
                      }}
                      aria-invalid={!!errors.pledge1}
                      aria-describedby={errors.pledge1 ? "error-pledge1" : undefined}
                      // 체크박스는 form submit 시 Radix 가 hidden input 처리 — name 불필요
                      className={cn(
                        "mt-0.5 shrink-0",
                        // 에러 시 border 붉게
                        errors.pledge1 && "border-red-400"
                      )}
                    />
                  )}
                />
                <label htmlFor="pledge1" className="cursor-pointer text-sm leading-relaxed">
                  本団体は実在し、慶應義塾大学の学則に違反しないことを誓約します
                </label>
              </div>
              {errors.pledge1 && (
                <p id="error-pledge1" role="alert" className={cn(ERROR_MSG_CLS, "pl-7")}>
                  {errors.pledge1.message}
                </p>
              )}
            </div>

            {/* 서약 2: 비공식 서비스 + 책임 인지 */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-start gap-3">
                <Controller
                  control={control}
                  name="pledge2"
                  render={({ field }) => (
                    <Checkbox
                      id="pledge2"
                      checked={!!field.value}
                      onCheckedChange={(checked) => {
                        field.onChange(checked === true);
                      }}
                      aria-invalid={!!errors.pledge2}
                      aria-describedby={errors.pledge2 ? "error-pledge2" : undefined}
                      className={cn("mt-0.5 shrink-0", errors.pledge2 && "border-red-400")}
                    />
                  )}
                />
                <label htmlFor="pledge2" className="cursor-pointer text-sm leading-relaxed">
                  本サービスは慶應義塾大学公式の認証とは無関係であり、登録内容の責任は本人に帰属することを理解しました
                </label>
              </div>
              {errors.pledge2 && (
                <p id="error-pledge2" role="alert" className={cn(ERROR_MSG_CLS, "pl-7")}>
                  {errors.pledge2.message}
                </p>
              )}
            </div>
          </m.div>
        )}

        {/* ── 제출 에러 + isSubmitting 상태 표시 ─────────────────────── */}
        <m.div
          className="flex flex-col gap-3"
          variants={FADE_UP_VARIANTS}
          initial={initial}
          animate="visible"
          transition={makeFadeTransition(0.28)}
        >
          {/* submitRegistration 이 { error } 를 반환했을 때 표시 */}
          {submitError && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400"
            >
              {submitError}
            </p>
          )}

          {/*
            제출 진행 표시는 footer 제출 버튼의 라벨("送信中…")로 이전됨
            (circle-registration-form.tsx). 본문 별도 안내 텍스트 제거.
          */}
        </m.div>

        {/*
          하단 여백:
          AuthScreen footer 가 fixed/sticky 일 경우 버튼에 콘텐츠가 가리지 않도록
          충분한 하단 패딩을 준다.
        */}
        <div className="pb-4" aria-hidden="true" />
      </form>
    </LazyMotion>
  );
}
