"use client";

/**
 * CircleRegistrationForm — 서클 등록 멀티스텝 컨테이너
 *
 * 플로우: basic → tags → contact → done (4단계)
 *
 * step 라우팅 전략:
 *  - useSearchParams().get("step") 으로 현재 단계를 읽는다.
 *  - "goNext": 해당 단계 필드만 trigger(부분검증) → 통과 시 router.push 로 다음 step 쿼리로 전환.
 *  - "done" 전환: contact 단계의 onRegistered 콜백이 호출되면 router.replace("/circles/new?step=done").
 *
 * 폼 상태 단일 보존 전략:
 *  - FormProvider 로 전체 RHF 인스턴스를 하위 Step 컴포넌트에 공유.
 *  - router.push 는 클라이언트 사이드 내비게이션이므로 페이지 리마운트 없이
 *    FormProvider 상태가 유지된다.
 *
 * 제출 위임 패턴:
 *  - basic/tags 단계: 컨테이너의 footer CTA 버튼(次へ)이 trigger → router.push 담당.
 *  - contact 단계: StepContact 에 onRegistered 콜백만 전달.
 *    실제 Supabase submitRegistration + 에러 처리는 T-018-6(StepContact)에서 담당.
 *    성공 시 onRegistered() → router.replace("?step=done").
 *  - done 단계: footer CTA 없음. 본문의 "マイページへ" 버튼으로 이동.
 *
 * 애니메이션 전략 (sign-up-form.tsx 와 동일 톤):
 *  - LazyMotion + domAnimation + m.* 패턴
 *  - FADE_UP_VARIANTS + makeFadeTransition (stagger delay 헬퍼)
 *  - DONE_VARIANTS: 완료 화면 spring (scale 0.96→1)
 *  - useReducedMotion() 준수 (WCAG SC 2.3.3)
 *  - CTA 버튼: m.div wrapper + whileTap press 피드백
 *
 * useSearchParams() 를 사용하므로 page.tsx 에서 반드시 <Suspense> 로 감싸야 한다.
 */

import { useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { LazyMotion, domAnimation, m, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { AuthScreen } from "@/components/auth/auth-screen";
import { StepProgress } from "@/components/auth/step-progress";
import { Button } from "@/components/ui/button";
import {
  registrationSchema,
  type RegistrationValues,
  STEP_FIELDS,
} from "@/lib/circles/registration-schema";

import { StepBasic } from "@/components/circles/new/step-basic";
import { StepTags } from "@/components/circles/new/step-tags";
import { StepContact, CIRCLE_REGISTRATION_FORM_ID } from "@/components/circles/new/step-contact";

// ── 단계 순서 정의 ──────────────────────────────────────────────────────────
// done 을 제외한 실제 입력 단계 수 (StepProgress total 에 사용)
const INPUT_STEP_COUNT = 3;

// 단계 전환 순서 맵 (현재 step → 다음 step)
const NEXT_STEP: Record<string, string> = {
  basic: "tags",
  tags: "contact",
  contact: "done",
};

// ── 스타일 토큰 ──────────────────────────────────────────────────────────────
// sign-up-form.tsx 와 동일한 CTA 버튼 스타일
const CTA_BTN_CLS =
  "h-12 w-full rounded-xl bg-keio-navy text-base font-semibold text-keio-navy-foreground transition-opacity hover:opacity-90 disabled:opacity-40";

// ── 애니메이션 상수 ──────────────────────────────────────────────────────────
// 프로젝트 표준 expo-out easing
const EASE_EXPO_OUT = [0.22, 1, 0.36, 1] as const;

// 표준 페이드+슬라이드업 variants (sign-up-form 과 동일)
const FADE_UP_VARIANTS = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
} as const;

// 완료 화면 전용 셀러브레이션 variants (scale + fade)
const DONE_VARIANTS = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1 },
} as const;

// ── 단계별 StepProgress current 값 ──────────────────────────────────────────
// "basic"=1, "tags"=2, "contact"=3, "done"=3 (완료도 3/3 표시)
const STEP_CURRENT: Record<string, number> = {
  basic: 1,
  tags: 2,
  contact: 3,
  done: 3,
};

/** CircleRegistrationForm props — create(신규 등록) / edit(기존 수정) 공용 */
interface CircleRegistrationFormProps {
  /** "create"(기본): 신규 등록 / "edit": 기존 서클 수정 */
  mode?: "create" | "edit";
  /** edit 모드 초기값 — circleToEditValues(circle) 결과(pledge=true 포함) */
  initialValues?: RegistrationValues;
  /** edit 모드 대상 서클 id — 제출(updateCircle)·복귀 경로에 사용 */
  circleId?: string;
  /** step 라우팅 base 경로. create=/circles/new, edit=/circles/{id}/edit */
  basePath?: string;
  /** edit 모드에서 기존 커버 이미지 URL — StepBasic 미리보기에 전달 */
  existingCoverUrl?: string | null;
}

/**
 * 서클 등록·수정 멀티스텝 폼 컨테이너.
 * useSearchParams() 를 사용하므로 page.tsx 에서 <Suspense> 로 감싸야 한다.
 *
 * mode="create": basic → tags → contact → done(審査中). submitRegistration 으로 INSERT.
 * mode="edit": basic → tags → contact → (제출 후 상세 /circles/{id} 복귀). updateCircle 로 UPDATE.
 *   서약 UI 는 숨기고 initial 의 pledge=true 로 검증을 통과시킨다.
 */
export function CircleRegistrationForm({
  mode = "create",
  initialValues,
  circleId,
  basePath = "/circles/new",
  existingCoverUrl = null,
}: CircleRegistrationFormProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 현재 단계: 쿼리스트링 "step" 값, 없으면 "basic"
  const step = searchParams.get("step") ?? "basic";

  const isEdit = mode === "edit";

  // ── useReducedMotion: WCAG SC 2.3.3 접근성 준수 ──
  const reducedMotion = useReducedMotion();
  // 감소된 모션 사용자에게는 애니메이션 초기값을 완성 상태로 강제
  const initial = reducedMotion ? "visible" : "hidden";

  // stagger delay 헬퍼 — sign-up-form 과 동일 패턴
  const makeFadeTransition = (delay: number) =>
    reducedMotion ? { duration: 0 } : { duration: 0.42, ease: EASE_EXPO_OUT, delay };

  // 완료 화면 spring transition
  const doneTransition = reducedMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 280, damping: 22, delay: 0.05 };

  // 버튼 press 피드백 (reduced motion 시 비활성)
  const tapScale = reducedMotion ? undefined : { scale: 0.98 as const };

  // ── RHF 인스턴스 — 전체 플로우에서 단일 보존 ──
  // zod v4 + @hookform/resolvers v5: 스키마 input/output 타입이 갈리는 경우
  // useForm 제네릭을 <Input, Context, Output> 3개로 분리해 Resolver 타입을 정확히 맞춘다.
  // (단일 제네릭으로 두면 "Two different types... unrelated" 타입 에러 발생)
  const methods = useForm<z.input<typeof registrationSchema>, unknown, RegistrationValues>({
    resolver: zodResolver(registrationSchema),
    mode: "onChange",
    // edit 모드: initialValues(circleToEditValues 결과, pledge=true 포함)로 prefill.
    // create 모드: 빈 기본값(서약은 미동의 false 로 시작 — 사용자가 직접 체크).
    defaultValues: initialValues ?? {
      // 단계 1: 기본 정보
      name: "",
      // category, official_type, activity_frequency: 선택 전 undefined (스키마 필수값)
      // member_count → member_band 로 교체 (범위 칩 단일 선택, 任意)
      member_band: undefined,
      description: "",
      // 단계 2: 태그
      tags: [],
      // 단계 3: 연락처
      contact_instagram: "",
      contact_x: "",
      contact_line: "",
      // 서약: 초기 미동의 상태 — zod literal(true) 이지만 RHF defaultValues 에서만 사용
      // (실제 타입 우회를 위해 as unknown 캐스팅)
      pledge1: false as unknown as true,
      pledge2: false as unknown as true,
      // 커버 이미지: StepBasic 에서 setValue("cover", file) 로 보관
      // 제출 시 StepContact 에서 (getValues("cover") as File) ?? null 로 꺼냄
      cover: undefined,
    },
  });

  const { trigger } = methods;

  // ── 다음 단계로 이동 (부분검증 통과 시에만) ──
  const goNext = useCallback(async () => {
    // 현재 단계에 해당하는 필드만 trigger 로 부분검증
    const fields = STEP_FIELDS[step as keyof typeof STEP_FIELDS];
    if (!fields) return;

    // trigger 반환값: 유효하면 true, 에러 있으면 false
    const ok = await trigger(fields as unknown as (keyof RegistrationValues)[], {
      shouldFocus: true,
    });
    if (!ok) return;

    const next = NEXT_STEP[step];
    if (next) {
      router.push(`${basePath}?step=${next}`);
    }
  }, [step, trigger, router, basePath]);

  // ── contact 단계 제출 성공 콜백 ──
  // create: 完了(審査中) 단계로 / edit: 마이페이지로 복귀.
  //
  // edit 후 마이페이지로 복귀하는 이유:
  //   - rejected → pending(재신청) 시 상세 페이지(/circles/{id})는 approved 필터로 접근 불가
  //   - pending 상태의 동아리도 상세 페이지 접근이 막혀 있어 마이페이지가 안전한 착지점
  //   - router.refresh() 로 마이페이지 서클 목록을 최신화
  const handleRegistered = useCallback(() => {
    if (isEdit) {
      router.refresh();
      router.replace("/mypage");
    } else {
      router.replace(`${basePath}?step=done`);
    }
  }, [router, isEdit, basePath]);

  // ── 단계별 backHref (뒤로가기 링크) ──
  // 첫 단계(basic)는 create·edit 모두 마이페이지로 복귀.
  // (편집 진입 출처가 마이페이지이고, 상세 페이지로 보내면 "플레이뷰로 들어가는" 혼란이 생김)
  const backHref =
    step === "basic"
      ? "/mypage"
      : step === "tags"
        ? `${basePath}?step=basic`
        : step === "contact"
          ? `${basePath}?step=tags`
          : undefined; // done 단계: 뒤로가기 없음

  // ── 완료(done) 단계 ─────────────────────────────────────────────────────
  if (step === "done") {
    return (
      <LazyMotion features={domAnimation}>
        <AuthScreen
          align="center"
          progress={
            // 완료 단계도 3/3 진행 표시 유지
            <StepProgress current={INPUT_STEP_COUNT} total={INPUT_STEP_COUNT} />
          }
        >
          {/* 중앙 집약 그룹: 셀러브레이션 블록 + CTA 버튼 */}
          <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-8 text-center">
            {/*
              셀러브레이션 블록:
              spring(stiffness 280, damping 22, delay 0.05s) — 가볍게 통통 튀는 확정감.
              scale 0.96→1 + fade — "심사 접수됨"의 안정적인 느낌.
            */}
            <m.div
              className="flex flex-col items-center gap-4 text-center"
              variants={DONE_VARIANTS}
              initial={initial}
              animate="visible"
              transition={doneTransition}
            >
              {/* 심사 중 아이콘 — 서클 감사/심사 느낌의 텍스트 이모지 */}
              <div className="text-5xl" aria-hidden="true">
                📋
              </div>
              {/* 완료 타이틀 */}
              <h1 className="text-[1.75rem] font-bold tracking-tight">審査中です</h1>
              {/* 안내 문구 */}
              <p className="text-muted-foreground text-sm leading-relaxed">
                登録申請を受け付けました。
                <br />
                承認までお待ちください。
              </p>
            </m.div>

            {/*
              "マイページへ" CTA 버튼:
              1) 진입 애니메이션: delay 0.25s — 셀러브레이션 블록이 충분히 착지 후 등장
              2) whileTap press 피드백: scale 0.98 (whileTap 내부 transition 으로 진입과 격리)
            */}
            <m.div
              className="w-full"
              variants={FADE_UP_VARIANTS}
              initial={initial}
              animate="visible"
              transition={makeFadeTransition(0.25)}
              whileTap={reducedMotion ? undefined : { scale: 0.98, transition: { duration: 0.1 } }}
            >
              <Button
                type="button"
                onClick={() => router.push("/mypage/circles")}
                className={CTA_BTN_CLS}
              >
                <span className="flex items-center justify-center gap-2">
                  マイページへ
                  <ArrowRight className="size-4" aria-hidden="true" />
                </span>
              </Button>
            </m.div>
          </div>
        </AuthScreen>
      </LazyMotion>
    );
  }

  // ── 현재 단계의 StepProgress current 값 ──
  const currentStep = STEP_CURRENT[step] ?? 1;

  // ── contact 단계 여부 판별 ──
  const isContactStep = step === "contact";

  // ── footer CTA 분기 ──────────────────────────────────────────────────────
  //
  // 배치 전략: 방법 (a) — form id 연결
  //  - StepContact 본문: <form id={CIRCLE_REGISTRATION_FORM_ID}> 로 감싸 폼 정의
  //  - 컨테이너 footer: <Button type="submit" form={CIRCLE_REGISTRATION_FORM_ID}>
  //    → AuthScreen 의 sticky footer 영역에 제출 버튼이 고정됨
  //
  // 이 구조의 장점:
  //  - 제출 버튼이 항상 화면 하단에 고정되어 UX 통일
  //  - StepContact 가 폼 필드만 담당하고 버튼은 컨테이너가 제어 → 관심사 분리
  //  - RHF handleSubmit 은 form onSubmit 을 통해 호출되므로 zod 검증이 자동 트리거됨
  //
  // ── basic / tags 단계: "次へ" 버튼 ──
  // ── contact 단계: "登録申請する" submit 버튼 (form id 연결) ──
  const footerCta = !isContactStep ? (
    // basic / tags 단계 공통 "次へ" 버튼
    <m.div whileTap={tapScale} transition={{ duration: 0.1 }}>
      <Button type="button" onClick={goNext} className={CTA_BTN_CLS}>
        <span className="flex items-center justify-center gap-2">
          次へ
          <ArrowRight className="size-4" aria-hidden="true" />
        </span>
      </Button>
    </m.div>
  ) : (
    // contact 단계: form id 로 연결된 제출 버튼
    // StepContact 의 <form id={CIRCLE_REGISTRATION_FORM_ID}> 와 짝을 이룬다.
    // isSubmitting 상태는 StepContact 가 data-submitting 속성으로 외부에 알림 (CSS 활용)
    // → 단순 구조를 위해 버튼 disabled 는 StepContact 내부 상태로 관리하지 않고
    //   form 자체의 submit 이벤트가 RHF 의 isSubmitting 을 제어함
    <m.div whileTap={tapScale} transition={{ duration: 0.1 }}>
      <Button type="submit" form={CIRCLE_REGISTRATION_FORM_ID} className={CTA_BTN_CLS}>
        <span className="flex items-center justify-center gap-2">
          {isEdit ? "更新する" : "登録申請する"}
          <ArrowRight className="size-4" aria-hidden="true" />
        </span>
      </Button>
    </m.div>
  );

  // ── basic / tags / contact 단계 공통 셸 렌더 ──
  return (
    <LazyMotion features={domAnimation}>
      {/*
        FormProvider: RHF 인스턴스를 StepBasic/StepTags/StepContact 에 공유.
        router.push(클라이언트 내비)는 페이지 리마운트 없이 쿼리만 바꾸므로
        FormProvider 상태가 단계 전환 후에도 유지된다.
      */}
      <FormProvider {...methods}>
        {/*
          backHref 를 AuthScreen 에 넘기지 않는 이유:
          AuthScreen 의 backHref 화살표는 absolute 라 풀폭 StepProgress 분절 바와 겹친다.
          대신 progress 슬롯 안에서 [뒤로가기 버튼 + 분절 바]를 한 행(flex)으로 배치한다.
        */}
        <AuthScreen
          progress={
            /*
              뒤로가기 화살표 + StepProgress 분절 바를 한 줄에 배치.
              StepProgress 는 flex-1 로 남은 가로 폭을 채우고, 화살표는 좌측에 고정.
              delay 0.05s — 진입 시 가장 먼저 등장해 "n단계" 위치를 즉시 안내.
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
              <StepProgress current={currentStep} total={INPUT_STEP_COUNT} className="flex-1" />
            </m.div>
          }
          footer={footerCta}
        >
          {/* 단계별 본문 스텝 컴포넌트 분기 */}
          {step === "basic" && <StepBasic existingCoverUrl={existingCoverUrl} />}
          {step === "tags" && <StepTags />}
          {step === "contact" && (
            <StepContact onRegistered={handleRegistered} mode={mode} circleId={circleId} />
          )}
        </AuthScreen>
      </FormProvider>
    </LazyMotion>
  );
}
