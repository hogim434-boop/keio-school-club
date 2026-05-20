"use client";

/**
 * SignUpForm — 4단계 온보딩 플로우 (Google OAuth → 비밀번호 설정 → 닉네임 → 완료)
 *
 * step 쿼리스트링으로 단계를 구분한다:
 *   없음 / "start" → 1단계: Google로 시작 (1/4)
 *   "password"     → 2단계: 비밀번호 설정 (2/4)  ← 신규 추가
 *   "profile"      → 3단계: 닉네임 입력 (3/4)
 *   "done"         → 4단계: 환영 메시지 (4/4)
 *
 * useSearchParams()를 사용하므로 page.tsx에서 반드시 <Suspense>로 감싸야 한다.
 *
 * 애니메이션 전략:
 *   - LazyMotion + domAnimation + m.* 패턴 (프로젝트 표준)
 *   - 각 단계는 Next 라우터(router.push)로 전환되므로 enter-only 애니메이션 위주.
 *     (AnimatePresence exit는 라우팅 특성상 안전하게 생략)
 *   - 1단계(start): 타이틀(0.15s) → 서브카피(0.21s) → GoogleButton(0.27s), 0.06s stagger
 *   - 2단계(password): 신규 필드 — 진입 애니메이션은 다음 단계 전문가가 추가 예정
 *   - 3단계(profile): 타이틀(0.08s) → 서브카피(0.14s) → 입력필드(0.20s) — 변경 없음
 *   - 4단계(done): 셀러브레이션 블록(spring, delay 0.05s) → 버튼(FADE_UP, delay 0.25s)
 *   - CTA 버튼: 진입 FADE_UP + whileTap press 피드백을 한 엘리먼트에 공존
 *     (whileTap 내부에 transition 인라인 지정으로 진입 transition과 격리)
 *   - useReducedMotion() 준수 (WCAG SC 2.3.3)
 */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { LazyMotion, domAnimation, m, useReducedMotion } from "motion/react";
import { ArrowRight } from "lucide-react";

import { AuthScreen } from "@/components/auth/auth-screen";
import { GoogleButton } from "@/components/auth/google-button";
import { PasswordInput } from "@/components/auth/password-input";
import { KCircleLogo } from "@/components/layout/kcircle-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { AUTH_INPUT_CLS } from "@/lib/auth/input-class";

// ── Primary CTA 버튼 스타일 토큰 ──
// 慶應 네이비 배경, disabled 시 회색 전환 없이 불투명도만 낮춤
const CTA_BTN_CLS =
  "h-12 w-full rounded-xl bg-keio-navy text-base font-semibold text-keio-navy-foreground transition-opacity hover:opacity-90 disabled:opacity-40";

// 온보딩 전체 단계 수
const TOTAL_STEPS = 4;

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

  // 현재 단계 결정: step 쿼리가 없거나 "start"이면 1단계
  const step = searchParams.get("step") ?? "start";

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

  // ── 2단계(비밀번호) 전용 상태 ──
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);

  // ── 3단계(닉네임) 전용 상태 ──
  const [nickname, setNickname] = useState("");
  const [nicknameError, setNicknameError] = useState<string | null>(null);

  // 저장 중 상태 — 2단계·3단계 공통 (동시에 렌더되지 않으므로 공유 안전)
  const [isSaving, setIsSaving] = useState(false);

  // ── 2단계: 비밀번호 저장 처리 ──
  const handleSetPassword = async () => {
    // 클라이언트 측 유효성 검사: 8자 이상
    if (password.length < 8) {
      setPwError("8文字以上で入力してください");
      return;
    }
    // 두 비밀번호 일치 확인
    if (password !== confirm) {
      setPwError("パスワードが一致しません");
      return;
    }

    setPwError(null);
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

    // Google OAuth 후 임시 세션에 비밀번호 설정
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setPwError("パスワードの設定に失敗しました");
      setIsSaving(false);
      return;
    }

    // 저장 성공 → 닉네임 입력 단계로 이동
    router.push("/auth/sign-up?step=profile");
  };

  // ── 3단계: 닉네임 저장 처리 ──
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

    // profiles 테이블의 display_name 업데이트
    // RLS: profiles_update_own 정책으로 본인 행만 UPDATE 가능
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: trimmed })
      .eq("id", user.id);

    if (error) {
      setNicknameError("保存に失敗しました");
      setIsSaving(false);
      return;
    }

    // 저장 성공 → 완료 단계로 이동
    router.push("/auth/sign-up?step=done");
  };

  // ── 2단계: 비밀번호 설정 ──
  if (step === "password") {
    return (
      <LazyMotion features={domAnimation}>
        <AuthScreen
          progress={
            /* 우상단 숫자 표시 — 분절 바 대신 "n / 4" 형식으로 현재 위치 안내 */
            <div className="flex justify-end">
              {/*
                숫자 인디케이터: 가장 먼저 등장해 사용자에게 "몇 번째 단계인지" 즉시 알림.
                delay 0.05s — 화면 진입 직후 첫 번째로 페이드인.
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
              진입 애니메이션 없음 — footer는 고정 영역이므로 stagger에서 제외.
            */
            <m.div whileTap={tapScale} transition={{ duration: 0.1 }}>
              <Button
                type="button"
                onClick={handleSetPassword}
                disabled={isSaving || password.length === 0 || confirm.length === 0}
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
          {/* 본문 — 1Q1A 레이아웃: 타이틀이 크게, 입력이 바로 따라오는 구조 */}
          <div className="flex flex-col gap-8 pt-12">
            {/* 타이틀 + 서브카피 블록 */}
            <div className="flex flex-col gap-2">
              {/*
                타이틀: delay 0.10s — 숫자(0.05s) 다음 0.05s 간격으로 이어짐.
                1Q1A 스타일 — text-[1.75rem] 크고 명확하게.
              */}
              <m.h1
                className="text-[1.75rem] leading-snug font-bold tracking-tight"
                variants={FADE_UP_VARIANTS}
                initial={initial}
                animate="visible"
                transition={makeFadeTransition(0.1)}
              >
                パスワードを設定してください
              </m.h1>

              {/* 힌트(서브카피): delay 0.16s — 타이틀(0.10s) 다음 0.06s 간격 */}
              <m.p
                className="text-muted-foreground text-sm"
                variants={FADE_UP_VARIANTS}
                initial={initial}
                animate="visible"
                transition={makeFadeTransition(0.16)}
              >
                ログイン時に使用します。8文字以上で入力してください。
              </m.p>
            </div>

            {/* 비밀번호 입력 필드 블록: delay 0.22s — 힌트(0.16s) 다음 0.06s 간격, 눈이 자연스럽게 입력란으로 이동 */}
            <m.div
              className="flex flex-col gap-4"
              variants={FADE_UP_VARIANTS}
              initial={initial}
              animate="visible"
              transition={makeFadeTransition(0.22)}
            >
              {/* 비밀번호 필드 — PasswordInput으로 show/hide 토글 추가 */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">パスワード</Label>
                <PasswordInput
                  id="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    // 입력 중에는 에러 메시지 초기화
                    if (pwError) setPwError(null);
                  }}
                  placeholder="8文字以上"
                  autoComplete="new-password"
                />
              </div>

              {/* 비밀번호 확인 필드 — PasswordInput으로 show/hide 토글 추가 */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="confirm">パスワード（確認）</Label>
                <PasswordInput
                  id="confirm"
                  value={confirm}
                  onChange={(e) => {
                    setConfirm(e.target.value);
                    // 입력 중에는 에러 메시지 초기화
                    if (pwError) setPwError(null);
                  }}
                  placeholder="もう一度入力してください"
                  autoComplete="new-password"
                />
              </div>

              {/* 인라인 에러 메시지 */}
              {pwError && (
                <p className="text-sm text-red-500" role="alert">
                  {pwError}
                </p>
              )}
            </m.div>
          </div>
        </AuthScreen>
      </LazyMotion>
    );
  }

  // ── 3단계: 닉네임 입력 ──
  if (step === "profile") {
    return (
      <LazyMotion features={domAnimation}>
        <AuthScreen
          progress={
            /* 우상단 숫자 표시 */
            <div className="flex justify-end">
              {/*
                숫자 인디케이터: delay 0.05s — 각 단계 진입 시 가장 먼저 등장.
                다른 단계(password, done)와 동일한 페이드인 타이밍으로 통일.
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
              <Label htmlFor="nickname">ニックネーム</Label>
              {/* 프리미엄 스타일 적용 — 닉네임은 일반 텍스트 입력이므로 Input 유지 */}
              <Input
                id="nickname"
                type="text"
                placeholder="例: 慶太"
                value={nickname}
                onChange={(e) => {
                  setNickname(e.target.value);
                  // 입력 중에는 에러 메시지 초기화
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
              <p className="text-muted-foreground text-xs">1〜20文字で入力してください</p>
            </m.div>
          </div>
        </AuthScreen>
      </LazyMotion>
    );
  }

  // ── 4단계: 완료 화면 ──
  if (step === "done") {
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
                "4 / 4"가 먼저 보이면 사용자가 마지막 단계임을 바로 인지.
              */}
              <m.span
                className="text-muted-foreground text-sm font-medium tabular-nums"
                variants={FADE_UP_VARIANTS}
                initial={initial}
                animate="visible"
                transition={makeFadeTransition(0.05)}
              >
                4 / {TOTAL_STEPS}
              </m.span>
            </div>
          }
        >
          {/* ── 중앙 집약 그룹 ── 로고·셀러브레이션 블록·"サークルを探す" 버튼 */}
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
                KCircle へようこそ！
                <br />
                あなたにぴったりのサークルを見つけましょう
              </p>
            </m.div>

            {/*
              "サークルを探す" 버튼을 m.div로 감싸 2가지 효과를 동시에 적용:
              1) 진입 애니메이션: delay 0.25s — 셀러브레이션 블록(spring, delay 0.05s)이
                 충분히 착지한 뒤 살짝 뒤이어 등장. FADE_UP으로 가볍게 슬라이드 업.
              2) whileTap press 피드백: scale 0.98 — whileTap 내부에 transition을 직접 지정해
                 진입 transition(0.42s)이 탭 반응에 영향을 주지 않도록 격리
              Button의 onClick 로직(router.push)은 그대로 유지.
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
              {/* CTA 스타일 + 화살표 아이콘 */}
              <Button type="button" onClick={() => router.push("/circles")} className={CTA_BTN_CLS}>
                <span className="flex items-center justify-center gap-2">
                  サークルを探す
                  <ArrowRight className="size-4" aria-hidden="true" />
                </span>
              </Button>
            </m.div>
          </div>
        </AuthScreen>
      </LazyMotion>
    );
  }

  // ── 1단계: Google로 시작 (fallback — password/profile/done이 아닌 모든 step) ──
  return (
    <LazyMotion features={domAnimation}>
      <AuthScreen
        align="center"
        progress={
          /* 우상단 숫자 표시 */
          <div className="flex justify-end">
            {/*
              숫자 인디케이터: delay 0.05s — 전체 4개 단계에서 동일한 타이밍으로 통일.
              로고 자체 애니메이션보다 살짝 이르게 등장해 "1/4 단계"임을 먼저 인지시킴.
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
          /* 보조 링크 + 일반 사용자 안내 (Direction A: 탐색자는 가입 불필요) */
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
            <p className="text-muted-foreground text-xs">
              ※ 一般の方は登録なしでご利用いただけます
            </p>
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
            慶應アカウントで
            <br />
            始めましょう
          </m.h1>

          {/* 서브카피: delay 0.21s (0.06s stagger 간격) */}
          <m.p
            className="text-muted-foreground text-sm leading-relaxed"
            variants={FADE_UP_VARIANTS}
            initial={initial}
            animate="visible"
            transition={makeFadeTransition(0.21)}
          >
            サークルを運営する代表者向けの登録です。
            <br />
            @keio.jp で慶應生として認証されます。
          </m.p>

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
            {/* Google OAuth 시작 — sign-up 플로우에서는 콜백 후 비밀번호 설정으로 이동 */}
            <GoogleButton label="Googleで続ける" />
          </m.div>
        </div>
      </AuthScreen>
    </LazyMotion>
  );
}
