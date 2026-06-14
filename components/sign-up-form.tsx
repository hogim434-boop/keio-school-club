"use client";

/**
 * SignUpForm — 4단계 온보딩 플로우 (비밀번호 단계 제거 후)
 *
 * step 쿼리스트링으로 단계를 구분한다:
 *   없음 / "chooser" → 0단계: 가입 의도 선택 (진행번호 없음)
 *   "start"          → 1단계: Google로 시작 (1/3)
 *   "profile"        → 2단계: 닉네임 입력 (2/3)
 *   "done"           → 3단계: 환영 메시지 (3/3)
 *
 * intent 쿼리스트링으로 가입 의도를 전달한다:
 *   "general"  → 일반 사용자 (동아리 탐색·이벤트 참가)
 *   "operator" → 운영자 (동아리·부활동 운영)
 *   미지정     → chooser에서 선택하도록 유도
 *
 * useSearchParams()를 사용하므로 page.tsx에서 반드시 <Suspense>로 감싸야 한다.
 *
 * 애니메이션 전략:
 *   - LazyMotion + domAnimation + m.* 패턴 (프로젝트 표준)
 *   - 각 단계는 Next 라우터(router.push)로 전환되므로 enter-only 애니메이션 위주.
 *   - chooser: 타이틀(0.10s) → 카드 A(0.18s) → 카드 B(0.26s)
 *   - start: 타이틀(0.15s) → 서브카피(0.21s) → GoogleButton(0.27s), 0.06s stagger
 *   - profile: 기존 그대로
 *   - done: 기존 그대로
 *   - useReducedMotion() 준수 (WCAG SC 2.3.3)
 */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { LazyMotion, domAnimation, m, useReducedMotion } from "motion/react";
import { ArrowRight, Compass, Megaphone } from "lucide-react";

import { AuthScreen } from "@/components/auth/auth-screen";
import { GoogleButton } from "@/components/auth/google-button";
import { KCircleLogo } from "@/components/layout/kcircle-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { AUTH_INPUT_CLS } from "@/lib/auth/input-class";
import { sanitizeNext } from "@/lib/auth/sanitize-next";
import { sendWelcomeEmail } from "@/app/auth/actions";
import { GENERAL_SIGNUP_ENABLED } from "@/lib/constants/features";

// ── Primary CTA 버튼 스타일 토큰 ──
// 검정(기본 Button=bg-primary) 배경으로 통일, disabled 시 회색 전환 없이 불투명도만 낮춤
const CTA_BTN_CLS =
  "h-12 w-full rounded-xl bg-primary text-base font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40";

// 온보딩 전체 단계 수 (chooser는 포함 안 함 — 진행번호 없음)
// 비밀번호 단계 제거로 3단계로 축소: start=1/3, profile=2/3, done=3/3
const TOTAL_STEPS = 3;

// ── 공통 easing — 프로젝트 표준 expo-out
const EASE_EXPO_OUT = [0.22, 1, 0.36, 1] as const;

// ── 표준 페이드+슬라이드 업 variants (1·3단계 공통)
const FADE_UP_VARIANTS = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
} as const;

// ── 완료 화면 전용 셀러브레이션 variants (scale + fade)
// 과하지 않게 scale 0.96→1, 경쾌한 spring 사용
const DONE_VARIANTS = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1 },
} as const;

export function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 현재 단계 결정:
  // - GENERAL_SIGNUP_ENABLED=true: step 쿼리가 없으면 chooser(의도 선택)로 시작 (기존 동작)
  // - GENERAL_SIGNUP_ENABLED=false: step 쿼리가 없으면 start(1/3)로 직행 (chooser 건너뜀)
  const step = searchParams.get("step") ?? (GENERAL_SIGNUP_ENABLED ? "chooser" : "start");

  // 가입 의도: "general" | "operator" | null
  // - GENERAL_SIGNUP_ENABLED=true: chooser에서 선택하므로 null 가능 (기존 동작)
  // - GENERAL_SIGNUP_ENABLED=false: chooser를 건너뛰므로 intentParam이 없으면 "operator"로 강제
  const intentParam = searchParams.get("intent");
  const intent: "general" | "operator" | null = (() => {
    if (intentParam === "general" || intentParam === "operator") return intentParam;
    // chooser를 비활성화한 경우 미지정 intent는 operator로 강제
    if (!GENERAL_SIGNUP_ENABLED) return "operator";
    return null;
  })();

  // 복귀 목적지 — 일반 사용자가 로그인 후 돌아올 페이지
  const nextParam = searchParams.get("next");

  // ── 단계 전환 URL 헬퍼 ──
  // intent와 next를 매 단계 이동마다 보존
  const stepUrl = (s: string) =>
    `/auth/sign-up?step=${s}` +
    (intent ? `&intent=${intent}` : "") +
    (nextParam ? `&next=${encodeURIComponent(nextParam)}` : "");

  // reduced motion 사용자는 initial을 완성 상태로 강제 (WCAG SC 2.3.3)
  const reducedMotion = useReducedMotion();
  const initial = reducedMotion ? "visible" : "hidden";

  // 각 요소에 stagger delay를 부여하는 transition 생성 헬퍼
  const makeFadeTransition = (delay: number) =>
    reducedMotion ? { duration: 0 } : { duration: 0.42, ease: EASE_EXPO_OUT, delay };

  // 완료 화면 전용 — spring으로 살짝 통통 튀는 셀러브레이션 느낌 (stiffness 낮게, 과하지 않게)
  const doneTransition = reducedMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 280, damping: 22, delay: 0.05 };

  // 버튼 press 피드백 — whileTap에 전달 (reduced motion 시 undefined로 비활성)
  const tapScale = reducedMotion ? undefined : { scale: 0.98 as const };

  // ── 2단계(닉네임) 전용 상태 ──
  const [nickname, setNickname] = useState("");
  const [nicknameError, setNicknameError] = useState<string | null>(null);

  // 저장 중 상태
  const [isSaving, setIsSaving] = useState(false);

  // ⚠️ 단계 전환 시 isSaving 초기화 (멈춤 버그 방지)
  // /auth/sign-up?step=... 는 주소(쿼리)만 바뀌는 이동이라 이 컴포넌트가 재마운트되지 않는다.
  // step 이 바뀔 때마다 저장 상태를 깨끗이 리셋해 각 단계가 항상 클린하게 시작하도록 한다.
  useEffect(() => {
    setIsSaving(false);
  }, [step]);

  // ── profile 단계 진입 시 Google 이름으로 닉네임 자동채움 ──
  // mount 1회 한정. 비어 있을 때만 프리필하고, DB 저장은 "次へ" 클릭 시에만 이루어진다.
  useEffect(() => {
    if (step !== "profile") return;

    const prefillFromGoogle = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Google OAuth 메타데이터에서 이름을 읽는다.
      // full_name(Google 기본값) → name(fallback) 순서로 확인.
      const googleName: string | undefined =
        (user.user_metadata?.full_name as string | undefined) ??
        (user.user_metadata?.name as string | undefined);

      // 닉네임 input이 비어 있을 때만 채운다 (사용자가 이미 입력한 경우 덮어쓰기 금지)
      if (googleName) {
        setNickname((prev) => (prev === "" ? googleName : prev));
      }
    };

    void prefillFromGoogle();
    // step이 "profile"로 바뀔 때 1회 실행 (mount + step 변화 모두 대응)
  }, [step]);

  // ── 2단계: 닉네임 저장 처리 ──
  const handleSaveNickname = async () => {
    const trimmed = nickname.trim();

    // 클라이언트 측 유효성 검사
    if (trimmed.length < 1 || trimmed.length > 20) {
      setNicknameError("1〜20文字で入力してください");
      return;
    }

    setNicknameError(null);
    setIsSaving(true);

    const supabase = createClient();

    // 현재 로그인된 사용자 확인 — 미로그인이면 로그인 화면으로 돌려보냄
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/auth/login");
      return;
    }

    // profiles 테이블의 display_name + signup_intent 업데이트
    // RLS: profiles_update_own 정책으로 본인 행만 UPDATE 가능
    // signup_intent: intent가 없는 경우(직접 URL 접근 등) 'general' 기본값 사용
    // ⚠️ .select() 를 붙여 "실제로 갱신된 행"을 돌려받는다.
    //    .select() 가 없으면 0행 업데이트도 error:null 이라 실패를 감지 못 하고
    //    닉네임이 안 박힌 채 다음 단계로 넘어가 버린다(반쪽 계정 원인).
    const { data: updated, error } = await supabase
      .from("profiles")
      .update({
        display_name: trimmed,
        signup_intent: intent === "operator" ? "operator" : "general",
      })
      .eq("id", user.id)
      .select("id")
      .maybeSingle();

    // error 가 있거나, 갱신된 행이 없으면(updated === null) 실패로 처리
    if (error || !updated) {
      setNicknameError("保存に失敗しました。もう一度お試しください");
      setIsSaving(false);
      return;
    }

    // 온보딩 완료 시점에 가입 환영 메일 발송 (best-effort, 발사 후 망각).
    // ⚠️ await 로 기다리면 메일 발송이 지연/행(hang)될 때 화면이 "保存中…" 에서 멈춘다.
    //    메일은 부가 기능이므로 결과를 기다리지 않고, 실패는 콘솔에만 남긴 뒤 즉시 다음 단계로 이동.
    void sendWelcomeEmail().catch((e) => console.error("[welcome email]", e));

    // 저장 성공 → 완료 단계로 이동 (intent·next 보존)
    router.push(stepUrl("done"));
  };

  // ── 0단계: 가입 의도 선택 (chooser) ──
  if (step === "chooser") {
    return (
      <LazyMotion features={domAnimation}>
        {/*
          chooser는 의도 선택 화면이므로:
          - progress(진행번호) 없음
          - backHref="/" — 홈으로 되돌아갈 수 있도록
          - align="center" — 짧은 2선택 화면이라 세로 중앙 정렬
        */}
        <AuthScreen align="center" backHref="/">
          <div className="mx-auto flex w-full max-w-sm flex-col gap-8">
            {/* 타이틀 블록 — h1과 서브카피를 분리해 각각 stagger 등장 */}
            <div className="flex flex-col gap-2 text-center">
              {/* 타이틀: delay 0.10s — 가장 먼저 등장 */}
              <m.h1
                className="text-[1.75rem] font-bold tracking-tight"
                variants={FADE_UP_VARIANTS}
                initial={initial}
                animate="visible"
                transition={makeFadeTransition(0.1)}
              >
                どのような目的で
                <br />
                ご利用ですか？
              </m.h1>
              {/* 서브카피: delay 0.16s — 타이틀 다음 0.06s 간격으로 이어짐 */}
              <m.p
                className="text-muted-foreground text-sm"
                variants={FADE_UP_VARIANTS}
                initial={initial}
                animate="visible"
                transition={makeFadeTransition(0.16)}
              >
                目的に合わせた登録フローをご案内します
              </m.p>
            </div>

            {/* 선택 카드 2개 */}
            <div className="flex flex-col gap-3">
              {/* 일반 사용자 카드 */}
              <m.button
                type="button"
                className="border-border bg-background hover:bg-muted/60 hover:border-foreground/20 focus-visible:ring-ring flex w-full touch-manipulation items-center gap-4 rounded-2xl border p-4 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none"
                variants={FADE_UP_VARIANTS}
                initial={initial}
                animate="visible"
                transition={makeFadeTransition(0.22)}
                whileHover={reducedMotion ? undefined : { y: -1, transition: { duration: 0.15 } }}
                whileTap={
                  reducedMotion ? undefined : { scale: 0.98, transition: { duration: 0.08 } }
                }
                onClick={() =>
                  router.push(
                    `/auth/sign-up?step=start&intent=general` +
                      (nextParam ? `&next=${encodeURIComponent(nextParam)}` : "")
                  )
                }
              >
                {/* 아이콘: Compass(나침반) — 탐색·발견의 뉘앙스 */}
                <div className="bg-muted flex size-12 shrink-0 items-center justify-center rounded-xl">
                  <Compass className="text-foreground size-6" aria-hidden="true" />
                </div>
                {/* 텍스트 */}
                <div className="flex flex-col gap-0.5">
                  <span className="text-foreground text-base font-semibold">
                    サークルを探す・イベントに参加
                  </span>
                  <span className="text-muted-foreground text-xs leading-relaxed">
                    気になるサークル・部活動を見つけたい方
                  </span>
                </div>
                {/* 화살표 */}
                <ArrowRight
                  className="text-muted-foreground ml-auto size-4 shrink-0"
                  aria-hidden="true"
                />
              </m.button>

              {/* 운영자 카드 */}
              <m.button
                type="button"
                className="border-border bg-background hover:bg-muted/60 hover:border-foreground/20 focus-visible:ring-ring flex w-full touch-manipulation items-center gap-4 rounded-2xl border p-4 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none"
                variants={FADE_UP_VARIANTS}
                initial={initial}
                animate="visible"
                transition={makeFadeTransition(0.3)}
                whileHover={reducedMotion ? undefined : { y: -1, transition: { duration: 0.15 } }}
                whileTap={
                  reducedMotion ? undefined : { scale: 0.98, transition: { duration: 0.08 } }
                }
                onClick={() =>
                  router.push(
                    `/auth/sign-up?step=start&intent=operator` +
                      (nextParam ? `&next=${encodeURIComponent(nextParam)}` : "")
                  )
                }
              >
                {/* 아이콘: Megaphone(확성기) — 운영·정보 발신의 뉘앙스, Settings(톱니)보다 따뜻함 */}
                <div className="bg-muted flex size-12 shrink-0 items-center justify-center rounded-xl">
                  <Megaphone className="text-foreground size-6" aria-hidden="true" />
                </div>
                {/* 텍스트 */}
                <div className="flex flex-col gap-0.5">
                  <span className="text-foreground text-base font-semibold">
                    サークル・部活動を運営する
                  </span>
                  <span className="text-muted-foreground text-xs leading-relaxed">
                    団体の情報を掲載・管理したい方
                  </span>
                </div>
                {/* 화살표 */}
                <ArrowRight
                  className="text-muted-foreground ml-auto size-4 shrink-0"
                  aria-hidden="true"
                />
              </m.button>
            </div>

            {/* 하단 로그인 유도 링크: delay 0.36s — 카드2(0.30s) 다음 0.06s 간격 */}
            <m.p
              className="text-muted-foreground text-center text-sm"
              variants={FADE_UP_VARIANTS}
              initial={initial}
              animate="visible"
              transition={makeFadeTransition(0.36)}
            >
              すでにアカウントをお持ちですか?{" "}
              <Link
                href="/auth/login"
                className="text-foreground font-semibold underline underline-offset-4"
              >
                ログイン
              </Link>
            </m.p>
          </div>
        </AuthScreen>
      </LazyMotion>
    );
  }

  // ── 2단계: 닉네임 입력 ──
  if (step === "profile") {
    return (
      <LazyMotion features={domAnimation}>
        <AuthScreen
          progress={
            /* 우상단 숫자 표시 */
            <div className="flex justify-end">
              {/*
                숫자 인디케이터: delay 0.05s — 각 단계 진입 시 가장 먼저 등장.
                비밀번호 단계 제거로 2/3으로 변경.
              */}
              <m.span
                className="text-muted-foreground text-sm font-medium tabular-nums"
                variants={FADE_UP_VARIANTS}
                initial={initial}
                animate="visible"
                transition={makeFadeTransition(0.05)}
              >
                2 / {TOTAL_STEPS}
              </m.span>
            </div>
          }
          footer={
            /*
              "次へ" 버튼: m.div wrapper로 whileTap press 피드백.
              Button의 disabled 상태는 그대로 전달되므로 기능 회귀 없음.
            */
            <m.div whileTap={tapScale} transition={{ duration: 0.1 }}>
              <Button
                type="button"
                onClick={handleSaveNickname}
                disabled={isSaving || nickname.trim().length === 0}
                className={CTA_BTN_CLS}
              >
                {isSaving ? (
                  "保存中…"
                ) : (
                  /* 텍스트 + 화살표 아이콘 */
                  <span className="flex items-center justify-center gap-2">
                    次へ
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </span>
                )}
              </Button>
            </m.div>
          }
        >
          {/* 본문 — 1Q1A 레이아웃 */}
          <div className="flex flex-col gap-8 pt-12">
            {/* 타이틀 + 서브카피 블록: stagger 순차 등장 */}
            <div className="flex flex-col gap-2">
              {/* 타이틀: 1Q1A 스타일 */}
              <m.h1
                className="text-[1.75rem] leading-snug font-bold tracking-tight"
                variants={FADE_UP_VARIANTS}
                initial={initial}
                animate="visible"
                transition={makeFadeTransition(0.08)}
              >
                ニックネームを入力してください
              </m.h1>

              {/* 서브카피: delay 0.14s */}
              <m.p
                className="text-muted-foreground text-sm"
                variants={FADE_UP_VARIANTS}
                initial={initial}
                animate="visible"
                transition={makeFadeTransition(0.14)}
              >
                サークル検索やマイページで表示されます
              </m.p>
            </div>

            {/* 닉네임 입력 필드 블록: delay 0.20s */}
            <m.div
              className="flex flex-col gap-2"
              variants={FADE_UP_VARIANTS}
              initial={initial}
              animate="visible"
              transition={makeFadeTransition(0.2)}
            >
              {/* 라벨 제거 → placeholder + aria-label. 하단 중복 힌트(1〜20文字) 제거(maxLength·에러로 충분) */}
              <Input
                id="nickname"
                type="text"
                placeholder="ニックネーム（例: 慶太）"
                aria-label="ニックネーム"
                value={nickname}
                onChange={(e) => {
                  setNickname(e.target.value);
                  if (nicknameError) setNicknameError(null);
                }}
                maxLength={20}
                autoFocus
                autoComplete="nickname"
                className={AUTH_INPUT_CLS}
              />
              {/* 인라인 에러 메시지 */}
              {nicknameError && (
                <p className="text-sm text-red-500" role="alert">
                  {nicknameError}
                </p>
              )}
            </m.div>
          </div>
        </AuthScreen>
      </LazyMotion>
    );
  }

  // ── 3단계: 완료 화면 ──
  if (step === "done") {
    const isOperator = intent === "operator";

    // 완료 후 이동 목적지:
    // - operator → nextParam 있으면 거기, 없으면 /mypage
    // - general  → nextParam 있으면 거기, 없으면 홈(/)
    const doneDestination = sanitizeNext(nextParam) ?? (isOperator ? "/mypage" : "/");

    return (
      <LazyMotion features={domAnimation}>
        {/* footer 없음 — 보조 링크 불필요. CTA도 본문 중앙 그룹 맨 아래로 이동됨. */}
        <AuthScreen
          align="center"
          progress={
            /* 우상단 숫자 표시 */
            <div className="flex justify-end">
              {/*
                완료 단계 숫자 인디케이터: delay 0.05s — 다른 단계와 동일한 타이밍으로 통일.
                "3 / 3"이 먼저 보이면 사용자가 마지막 단계임을 바로 인지.
              */}
              <m.span
                className="text-muted-foreground text-sm font-medium tabular-nums"
                variants={FADE_UP_VARIANTS}
                initial={initial}
                animate="visible"
                transition={makeFadeTransition(0.05)}
              >
                3 / {TOTAL_STEPS}
              </m.span>
            </div>
          }
        >
          {/* ── 중앙 집약 그룹 ── 로고·셀러브레이션 블록·CTA 버튼 */}
          <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-6 text-center">
            {/* KCircleLogo는 자체 Ring Draw 애니메이션 보유 — 중복 방지 */}
            <KCircleLogo size="lg" />

            {/*
              완료 화면 셀러브레이션 블록.
              타이틀 + 서브카피를 묶어 하나의 spring으로 등장시킴.
              scale 0.96→1 + fade — 미니멀하게 "확정됨"의 느낌.
              spring(stiffness 280, damping 22): 살짝 통통 튀는 감도지만 바운스 과하지 않음.
            */}
            <m.div
              className="flex flex-col items-center gap-3 text-center"
              variants={DONE_VARIANTS}
              initial={initial}
              animate="visible"
              transition={doneTransition}
            >
              {/* 완료 타이틀 — 1.75rem으로 다른 화면과 통일감 */}
              <h1 className="text-[1.75rem] font-bold tracking-tight">ようこそ! 🎉</h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {isOperator
                  ? /* 운영자: 마이페이지에서 동아리 등록·관리 유도 */
                    "マイページからサークルの登録・管理を始めましょう"
                  : /* 일반: K CLUB 탐색 유도 */
                    "K CLUBへようこそ！サークル・部活動を探しに行きましょう"}
              </p>
            </m.div>

            {/*
              CTA 버튼을 m.div로 감싸 2가지 효과를 동시에 적용:
              1) 진입 애니메이션: delay 0.25s — 셀러브레이션 블록(spring, delay 0.05s)이
                 충분히 착지한 뒤 살짝 뒤이어 등장. FADE_UP으로 가볍게 슬라이드 업.
              2) whileTap press 피드백: scale 0.98 — whileTap 내부에 transition을 직접 지정해
                 진입 transition(0.42s)이 탭 반응에 영향을 주지 않도록 격리
              Button의 onClick 로직(router.push)은 의도에 따라 분기.
              w-full: 컨테이너(max-w-sm) 폭을 꽉 채워 버튼이 과하게 넓어지지 않음.
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
                onClick={() => router.push(doneDestination)}
                className={CTA_BTN_CLS}
              >
                <span className="flex items-center justify-center gap-2">
                  {isOperator ? "マイページへ" : "はじめる"}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </span>
              </Button>
            </m.div>
          </div>
        </AuthScreen>
      </LazyMotion>
    );
  }

  // ── 1단계: Google로 시작 (step === "start") ──
  // intent에 따라 카피를 분기한다.
  const isOperator = intent === "operator";

  return (
    <LazyMotion features={domAnimation}>
      <AuthScreen
        align="center"
        // GENERAL_SIGNUP_ENABLED=true: chooser(/auth/sign-up)로 돌아감 (기존 동작)
        // GENERAL_SIGNUP_ENABLED=false: chooser가 없으므로 홈(/)으로 돌아감
        backHref={GENERAL_SIGNUP_ENABLED ? "/auth/sign-up" : "/"}
        progress={
          /* 우상단 숫자 표시 */
          <div className="flex justify-end">
            {/*
              숫자 인디케이터: delay 0.05s — 전체 3개 단계에서 동일한 타이밍으로 통일.
              로고 자체 애니메이션보다 살짝 이르게 등장해 "1/3 단계"임을 먼저 인지시킴.
            */}
            <m.span
              className="text-muted-foreground text-sm font-medium tabular-nums"
              variants={FADE_UP_VARIANTS}
              initial={initial}
              animate="visible"
              transition={makeFadeTransition(0.05)}
            >
              1 / {TOTAL_STEPS}
            </m.span>
          </div>
        }
        footer={
          /* 보조 링크 (로그인 유도) — 일반·운영자 공통 */
          <div className="space-y-2 text-center">
            <p className="text-muted-foreground text-sm">
              すでにアカウントをお持ちですか?{" "}
              <Link
                href="/auth/login"
                className="text-foreground font-semibold underline underline-offset-4"
              >
                ログイン
              </Link>
            </p>
            {/*
              "一般の方は登録なし" 줄: chooser で既に意図が固まっているため不要。
              general でも operator でも、この画面に来た時点で登録意思が確定している。
              ⚠️ 旧コードの footer note はここでは表示しない。
            */}
          </div>
        }
      >
        {/* ── 중앙 집약 그룹 ── 로고·타이틀·서브카피·GoogleButton을 한 덩어리로 */}
        <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-6 text-center">
          {/* KCircleLogo는 자체 Ring Draw 애니메이션 보유 — 중복 방지 */}
          <KCircleLogo size="lg" />

          {/* 타이틀: delay 0.15s (로고 애니메이션 완료 후 이어짐) */}
          <m.h1
            className="text-[1.75rem] font-bold tracking-tight"
            variants={FADE_UP_VARIANTS}
            initial={initial}
            animate="visible"
            transition={makeFadeTransition(0.15)}
          >
            アカウントを作成して
            <br />
            はじめましょう
          </m.h1>

          {/* 서브카피: 일반 가입일 때만 표시. delay 0.21s.
              운영자 분기의 「運営者向けの登録です」 문구는 제거(요청).
              일반 가입(GENERAL_SIGNUP_ENABLED) 이 열리면 아래 카피가 다시 노출된다. */}
          {!isOperator && (
            <m.p
              className="text-muted-foreground text-sm leading-relaxed"
              variants={FADE_UP_VARIANTS}
              initial={initial}
              animate="visible"
              transition={makeFadeTransition(0.21)}
            >
              イベント参加・お気に入りにはアカウントが必要です
            </m.p>
          )}

          {/*
            GoogleButton을 m.div로 감싸 2가지 효과를 동시에 적용:
            1) 진입 애니메이션: delay 0.27s — 서브카피(0.21s) 다음 0.06s 간격으로 자연스럽게 이어짐
            2) whileTap press 피드백: scale 0.98 — whileTap 내부에 transition을 직접 지정해
               진입 transition(0.42s)이 탭 반응에 영향을 주지 않도록 격리
            w-full: 컨테이너(max-w-sm) 폭을 꽉 채워 버튼이 과하게 넓어지지 않음.
          */}
          <m.div
            className="w-full"
            variants={FADE_UP_VARIANTS}
            initial={initial}
            animate="visible"
            transition={makeFadeTransition(0.27)}
            whileTap={reducedMotion ? undefined : { scale: 0.98, transition: { duration: 0.1 } }}
          >
            {/* Google OAuth 시작 — intent를 콜백 URL에 포함해 신규/기존 사용자 분기에 사용 */}
            <GoogleButton
              intent={isOperator ? "operator" : "general"}
              next={nextParam}
              label="Googleで続ける"
            />
          </m.div>
        </div>
      </AuthScreen>
    </LazyMotion>
  );
}
