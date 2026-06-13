"use client";

/**
 * ClaimForm — 동아리 권한 이양 신청 멀티스텝 폼 (Client Component).
 *
 * 플로우: profile(1/2) → contact(2/2) → done (완료 셀러브레이션)
 *
 * step 라우팅 전략:
 *  - useSearchParams().get("step") 으로 현재 단계를 읽는다.
 *  - "goNext": 해당 단계 필드만 trigger(부분검증) → 통과 시 router.push 로 다음 step 으로 전환.
 *  - contact 단계: <form id="claim-contact-form"> + footer CTA <Button type="submit" form="...">
 *    → handleSubmit → submitClaimRequest Server Action 호출.
 *  - 성공 시: router.replace("?step=done") → done 셀러브레이션 화면.
 *
 * 폼 상태 보존 전략:
 *  - FormProvider 로 RHF 인스턴스를 단계 전환 후에도 단일 보존.
 *  - router.push 는 클라이언트 사이드 내비게이션 → 리마운트 없음.
 *
 * 애니메이션 전략 (circle-registration-form.tsx 와 동일 톤):
 *  - LazyMotion + domAnimation + m.* 패턴
 *  - FADE_UP_VARIANTS + makeFadeTransition (delay 헬퍼)
 *  - DONE_VARIANTS: 완료 화면 spring (scale 0.96→1)
 *  - useReducedMotion() 준수 (WCAG SC 2.3.3)
 *
 * useSearchParams() 를 사용하므로 page.tsx 에서 반드시 <Suspense> 로 감싸야 한다.
 */

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, FormProvider, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LazyMotion, domAnimation, m, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { AuthScreen } from "@/components/auth/auth-screen";
import { StepProgress } from "@/components/auth/step-progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { AUTH_INPUT_CLS } from "@/lib/auth/input-class";
import {
  claimSchema,
  type ClaimValues,
  type Grade,
  GRADE_OPTIONS,
  STEP_FIELDS,
} from "@/lib/circles/claim-schema";
import { submitClaimRequest } from "@/app/circles/[id]/claim/actions";

// ── 폼 ID — form id 연결 패턴 (AuthScreen footer 버튼 ↔ 본문 form 연결) ──────
export const CLAIM_FORM_ID = "claim-note-form";

// ── 단계 시퀀스 정의 ─────────────────────────────────────────────────────────
const STEP_SEQUENCE = ["profile", "note"] as const;
type InputStep = (typeof STEP_SEQUENCE)[number];
type ClaimStep = InputStep | "done";

// ── 스타일 토큰 ──────────────────────────────────────────────────────────────
// sign-up-form.tsx / circle-registration-form.tsx 와 동일 CTA 버튼 스타일
const CTA_BTN_BASE = "h-12 w-full rounded-xl text-base font-semibold transition-colors";

// 필수 항목 충족 여부에 따라 CTA 버튼 색 분기
const ctaClass = (filled: boolean) =>
  cn(
    CTA_BTN_BASE,
    filled
      ? "bg-keio-navy text-keio-navy-foreground hover:opacity-90"
      : "bg-muted text-muted-foreground"
  );

// ── 입력 스타일 토큰 (등록 폼 step-basic.tsx 와 동일한 연한 채움형) ──────────────
// shadcn Select 트리거에 적용 — AUTH_INPUT_CLS 와 같은 톤(회색 채움·둥근 모서리·네이비 ring)
const SELECT_TRIGGER_CLS =
  "h-12 w-full rounded-xl border-0 bg-neutral-100 shadow-none px-3 text-base " +
  "data-[placeholder]:text-muted-foreground transition-colors " +
  "focus:bg-white focus-visible:ring-2 focus-visible:ring-keio-navy/40 focus-visible:outline-none";

// textarea 용 — AUTH_INPUT_CLS 에서 높이 제거 + min-h·p-3·resize-none 추가
const TEXTAREA_CLS =
  "w-full rounded-xl border-0 bg-neutral-100 shadow-none text-base resize-none p-3 min-h-[120px] " +
  "transition-colors placeholder:text-muted-foreground " +
  "focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-keio-navy/40 focus-visible:outline-none";

// ── 애니메이션 상수 ──────────────────────────────────────────────────────────
// circle-registration-form.tsx 와 동일 expo-out easing
const EASE_EXPO_OUT = [0.22, 1, 0.36, 1] as const;

const FADE_UP_VARIANTS = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
} as const;

const DONE_VARIANTS = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1 },
} as const;

// ── Props ────────────────────────────────────────────────────────────────────
interface ClaimFormProps {
  /** 대상 동아리 UUID */
  circleId: string;
  /** 동아리 표시명 — 헤더·완료 화면에 표시 */
  circleName: string;
}

/**
 * 권한 이양 신청 멀티스텝 폼 컨테이너.
 * useSearchParams() 를 사용하므로 page.tsx 에서 <Suspense> 로 감싸야 한다.
 */
export function ClaimForm({ circleId, circleName }: ClaimFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 현재 단계: 쿼리스트링 "step" 값, 없으면 "profile"
  const step = (searchParams.get("step") ?? "profile") as ClaimStep;

  // ── useReducedMotion: WCAG SC 2.3.3 접근성 준수 ──
  const reducedMotion = useReducedMotion();
  const initial = reducedMotion ? "visible" : "hidden";

  // stagger delay 헬퍼
  const makeFadeTransition = (delay: number) =>
    reducedMotion ? { duration: 0 } : { duration: 0.42, ease: EASE_EXPO_OUT, delay };

  // 완료 화면 spring transition
  const doneTransition = reducedMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 280, damping: 22, delay: 0.05 };

  // 버튼 press 피드백 (reduced motion 시 비활성)
  const tapScale = reducedMotion ? undefined : { scale: 0.98 as const };

  // ── RHF 인스턴스 — 전체 플로우에서 단일 보존 ──
  const methods = useForm<ClaimValues>({
    resolver: zodResolver(claimSchema),
    mode: "onChange",
    defaultValues: {
      applicant_name: "",
      // grade: 선택 전 undefined — z.enum 필수값이므로 as unknown 캐스팅
      grade: undefined as unknown as Grade,
      faculty: "",
      applicant_role: "",
      contact_note: "",
    },
  });

  const {
    trigger,
    handleSubmit,
    control,
    register,
    watch,
    formState: { isSubmitting, errors },
  } = methods;

  // 서버 액션 에러 (RHF 외부 상태 — 중복신청/is_claimed 등 API 레벨 에러)
  const [serverError, setServerError] = useState<string | null>(null);

  // ── 단계 인덱스 계산 ──
  const stepIndex = (STEP_SEQUENCE as readonly string[]).indexOf(step);
  // 1-based 현재 단계 번호 (done 포함 시 2 고정)
  const currentStep = stepIndex >= 0 ? stepIndex + 1 : 1;

  // ── 뒤로가기 href ──
  // 첫 단계(profile)는 동아리 상세로 복귀 / contact 단계는 profile 로 복귀 / done 은 없음
  const backHref =
    step === "done"
      ? undefined
      : stepIndex <= 0
        ? `/circles/${circleId}`
        : `?step=${STEP_SEQUENCE[stepIndex - 1]}`;

  // ── goNext: 현재 단계 필드 부분검증 → 통과 시 다음 단계로 ──
  const goNext = useCallback(async () => {
    const fields = STEP_FIELDS[step as keyof typeof STEP_FIELDS];
    if (!fields) return;

    const ok = await trigger(fields as unknown as (keyof ClaimValues)[], { shouldFocus: true });
    if (!ok) return;

    const i = (STEP_SEQUENCE as readonly string[]).indexOf(step);
    const next = i >= 0 ? STEP_SEQUENCE[i + 1] : undefined;
    if (next) router.push(`?step=${next}`);
  }, [step, trigger, router]);

  // ── contact 단계 제출 핸들러 ──
  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const result = await submitClaimRequest(circleId, values);
    if (result.ok) {
      // 완료 화면으로 전환 (replace: 브라우저 히스토리에 done 을 남기지 않음)
      router.replace(`?step=done`);
    } else {
      setServerError(result.error ?? "エラーが発生しました。もう一度お試しください。");
    }
  });

  // ── CTA 버튼 활성 조건 (실시간 watch) — 모든 항목 필수 ──
  const watched = watch();
  // profile 단계 필수: 이름·학년·학부·역직
  const profileFilled =
    !!watched.applicant_name?.trim() &&
    !!watched.grade &&
    !!watched.faculty?.trim() &&
    !!watched.applicant_role?.trim();
  // note 단계 필수: 담당자 메모
  const noteFilled = !!watched.contact_note?.trim();
  const isNoteStep = step === "note";
  const isStepFilled = step === "profile" ? profileFilled : noteFilled;

  // ── 완료(done) 단계 — 셀러브레이션 화면 ──────────────────────────────────
  if (step === "done") {
    return (
      <LazyMotion features={domAnimation}>
        <AuthScreen
          align="center"
          progress={
            // 완료 단계도 마지막 단계로 진행 표시 유지 (2/2)
            <StepProgress current={2} total={2} />
          }
        >
          <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-8 text-center">
            {/*
              셀러브레이션 블록:
              spring(stiffness 280, damping 22, delay 0.05s) — 「신청 접수됨」의 안정적인 확정감.
              scale 0.96→1 + fade
            */}
            <m.div
              className="flex flex-col items-center gap-4 text-center"
              variants={DONE_VARIANTS}
              initial={initial}
              animate="visible"
              transition={doneTransition}
            >
              {/* 심사 중 아이콘 */}
              <div className="text-5xl" aria-hidden="true">
                📋
              </div>
              <h1 className="text-[1.75rem] font-bold tracking-tight">審査中です</h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                申請を受け付けました。
                <br />
                内容を確認のうえ、ご連絡します。
              </p>
            </m.div>

            {/*
              「동아리 페이지로 돌아가기」 링크:
              delay 0.25s — 셀러브레이션 블록이 충분히 착지 후 등장
            */}
            <m.div
              className="w-full"
              variants={FADE_UP_VARIANTS}
              initial={initial}
              animate="visible"
              transition={makeFadeTransition(0.25)}
              whileTap={reducedMotion ? undefined : { scale: 0.98, transition: { duration: 0.1 } }}
            >
              <Link
                href={`/circles/${circleId}`}
                className={ctaClass(true) + " flex items-center justify-center"}
              >
                {circleName} のページへ戻る
              </Link>
            </m.div>
          </div>
        </AuthScreen>
      </LazyMotion>
    );
  }

  // ── footer CTA 버튼 분기 ──────────────────────────────────────────────────
  //
  // profile 단계: 「次へ」 버튼 (goNext → 부분검증 → router.push)
  // note 단계: 「申請する」 submit 버튼 (form id 로 연결 → handleSubmit 호출)
  const footerCta = !isNoteStep ? (
    // profile 단계 「次へ」
    <m.div whileTap={isStepFilled ? tapScale : undefined} transition={{ duration: 0.1 }}>
      <Button
        type="button"
        onClick={goNext}
        className={ctaClass(isStepFilled)}
        disabled={!isStepFilled}
      >
        <span className="flex items-center justify-center gap-2">
          次へ
          <ArrowRight className="size-4" aria-hidden="true" />
        </span>
      </Button>
    </m.div>
  ) : (
    // note 단계 「申請する」 — form id 로 연결
    // <form id={CLAIM_FORM_ID}> onSubmit 이 여기서 트리거됨
    <m.div
      whileTap={isSubmitting || !noteFilled ? undefined : tapScale}
      transition={{ duration: 0.1 }}
    >
      <Button
        type="submit"
        form={CLAIM_FORM_ID}
        className={ctaClass(noteFilled && !isSubmitting)}
        disabled={isSubmitting || !noteFilled}
        aria-live="polite"
      >
        <span className="flex items-center justify-center gap-2">
          {isSubmitting ? "送信中…" : "申請する"}
          {!isSubmitting && <ArrowRight className="size-4" aria-hidden="true" />}
        </span>
      </Button>
    </m.div>
  );

  // ── 메인 렌더 (profile / contact 단계 공통 셸) ───────────────────────────
  return (
    <LazyMotion features={domAnimation}>
      <FormProvider {...methods}>
        <AuthScreen
          progress={
            /*
              뒤로가기 화살표 + StepProgress 분절 바를 한 줄에 배치.
              circle-registration-form.tsx 와 동일 패턴.
            */
            <m.div
              className="flex items-center gap-3"
              variants={FADE_UP_VARIANTS}
              initial={initial}
              animate="visible"
              transition={makeFadeTransition(0.05)}
            >
              {backHref && (
                <Link
                  href={backHref}
                  aria-label="戻る"
                  className="hover:bg-muted focus-visible:ring-ring -ml-1 inline-flex size-9 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:outline-none"
                >
                  <ArrowLeft className="size-5" aria-hidden="true" />
                </Link>
              )}
              <StepProgress current={currentStep} total={2} className="flex-1" />
            </m.div>
          }
          footer={footerCta}
        >
          {/* ── Step 1: ご本人の情報 ─────────────────────────────────────── */}
          {step === "profile" && (
            <m.div
              className="space-y-6 pt-6"
              variants={FADE_UP_VARIANTS}
              initial={initial}
              animate="visible"
              transition={makeFadeTransition(0.1)}
            >
              {/* 타이틀 — 등록 폼(StepBasic)과 동일한 간결한 톤 (한 줄 제목 + 동아리명 부제) */}
              <header className="space-y-1.5">
                <h1 className="text-[1.75rem] leading-snug font-bold tracking-tight">
                  ご本人の情報
                </h1>
                <p className="text-muted-foreground text-sm">
                  <span className="text-foreground font-medium">{circleName}</span>{" "}
                  の管理を申請します
                </p>
              </header>

              {/* ── お名前 ─────────────────────────────────────────────────── */}
              <div className="space-y-2">
                <Label htmlFor="applicant_name" className="text-sm font-medium">
                  お名前
                  <span className="text-destructive ml-1" aria-hidden>
                    *
                  </span>
                </Label>
                <Input
                  id="applicant_name"
                  {...register("applicant_name")}
                  placeholder="慶應 太郎"
                  maxLength={100}
                  autoComplete="name"
                  aria-required="true"
                  aria-invalid={!!errors.applicant_name}
                  aria-describedby={errors.applicant_name ? "err-name" : undefined}
                  className={cn(
                    AUTH_INPUT_CLS,
                    errors.applicant_name && "ring-2 ring-red-400 focus-visible:ring-red-400"
                  )}
                />
                {errors.applicant_name && (
                  <p id="err-name" role="alert" className="text-destructive text-xs">
                    {errors.applicant_name.message}
                  </p>
                )}
              </div>

              {/* ── 学年 ──────────────────────────────────────────────────── */}
              <div className="space-y-2">
                <Label htmlFor="grade" className="text-sm font-medium">
                  学年
                  <span className="text-destructive ml-1" aria-hidden>
                    *
                  </span>
                </Label>
                <Controller
                  control={control}
                  name="grade"
                  render={({ field, fieldState }) => (
                    <Select value={field.value ?? ""} onValueChange={field.onChange}>
                      <SelectTrigger
                        id="grade"
                        aria-required="true"
                        aria-invalid={!!fieldState.error}
                        aria-describedby={fieldState.error ? "err-grade" : undefined}
                        className={cn(
                          SELECT_TRIGGER_CLS,
                          fieldState.error && "ring-2 ring-red-400 focus-visible:ring-red-400"
                        )}
                      >
                        <SelectValue placeholder="学年を選択してください" />
                      </SelectTrigger>
                      <SelectContent>
                        {GRADE_OPTIONS.map((g) => (
                          <SelectItem key={g} value={g}>
                            {g}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.grade && (
                  <p id="err-grade" role="alert" className="text-destructive text-xs">
                    {errors.grade.message}
                  </p>
                )}
              </div>

              {/* ── 学部・学科 ───────────────────────────────────────────── */}
              <div className="space-y-2">
                <Label htmlFor="faculty" className="text-sm font-medium">
                  学部・学科
                  <span className="text-destructive ml-1" aria-hidden>
                    *
                  </span>
                </Label>
                <Input
                  id="faculty"
                  {...register("faculty")}
                  placeholder="例: 経済学部、法学部 法律学科"
                  maxLength={100}
                  aria-required="true"
                  aria-invalid={!!errors.faculty}
                  aria-describedby={errors.faculty ? "err-faculty" : undefined}
                  className={cn(
                    AUTH_INPUT_CLS,
                    errors.faculty && "ring-2 ring-red-400 focus-visible:ring-red-400"
                  )}
                />
                {errors.faculty && (
                  <p id="err-faculty" role="alert" className="text-destructive text-xs">
                    {errors.faculty.message}
                  </p>
                )}
              </div>

              {/* ── サークル内での役職 ─────────────────────────────────────── */}
              <div className="space-y-2">
                <Label htmlFor="applicant_role" className="text-sm font-medium">
                  サークル内での役職
                  <span className="text-destructive ml-1" aria-hidden>
                    *
                  </span>
                </Label>
                <Input
                  id="applicant_role"
                  {...register("applicant_role")}
                  placeholder="例: 代表、副代表、部長"
                  maxLength={100}
                  aria-required="true"
                  aria-invalid={!!errors.applicant_role}
                  aria-describedby={errors.applicant_role ? "err-role" : undefined}
                  className={cn(
                    AUTH_INPUT_CLS,
                    errors.applicant_role && "ring-2 ring-red-400 focus-visible:ring-red-400"
                  )}
                />
                {errors.applicant_role && (
                  <p id="err-role" role="alert" className="text-destructive text-xs">
                    {errors.applicant_role.message}
                  </p>
                )}
              </div>
            </m.div>
          )}

          {/* ── Step 2: 担当者へのメモ ─────────────────────────────────────── */}
          {step === "note" && (
            /*
              form id 연결 패턴 (circle-registration-form.tsx 와 동일):
               - 본문: <form id={CLAIM_FORM_ID} onSubmit={onSubmit}>
               - footer: <Button type="submit" form={CLAIM_FORM_ID}>
              → AuthScreen 의 sticky footer 에 버튼이 고정되면서 RHF 제출 트리거됨
            */
            <form id={CLAIM_FORM_ID} onSubmit={onSubmit}>
              <m.div
                className="space-y-6 pt-6"
                variants={FADE_UP_VARIANTS}
                initial={initial}
                animate="visible"
                transition={makeFadeTransition(0.1)}
              >
                {/* 타이틀 — 등록 폼과 동일한 간결한 톤 */}
                <header className="space-y-1.5">
                  <h1 className="text-[1.75rem] leading-snug font-bold tracking-tight">
                    担当者へのメモ
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    運営担当者へ伝えたいことをご記入ください
                  </p>
                </header>

                {/* ── 担当者へのメモ ─────────────────────────────────────── */}
                <div className="space-y-2">
                  <Label htmlFor="contact_note" className="text-sm font-medium">
                    担当者へのメモ
                    <span className="text-destructive ml-1" aria-hidden>
                      *
                    </span>
                  </Label>
                  <Textarea
                    id="contact_note"
                    {...register("contact_note")}
                    maxLength={1000}
                    placeholder="運営担当者へ伝えたいことをご記入ください"
                    aria-required="true"
                    aria-invalid={!!errors.contact_note}
                    aria-describedby={
                      errors.contact_note ? "err-note" : serverError ? "err-server" : undefined
                    }
                    className={cn(
                      TEXTAREA_CLS,
                      errors.contact_note && "ring-2 ring-red-400 focus-visible:ring-red-400"
                    )}
                  />
                  {errors.contact_note && (
                    <p id="err-note" role="alert" className="text-destructive text-xs">
                      {errors.contact_note.message}
                    </p>
                  )}
                </div>

                {/* ── 서버 에러 메시지 ──────────────────────────────────── */}
                {serverError && (
                  <p
                    id="err-server"
                    role="alert"
                    className="text-destructive rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400"
                  >
                    {serverError}
                  </p>
                )}
              </m.div>
            </form>
          )}
        </AuthScreen>
      </FormProvider>
    </LazyMotion>
  );
}
