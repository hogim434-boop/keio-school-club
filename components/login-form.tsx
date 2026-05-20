"use client";

/**
 * LoginForm — 이메일+비밀번호 로그인 화면
 *
 * Google OAuth를 제거하고 Keio 이메일(@keio.jp) + 비밀번호로만 로그인.
 * AuthScreen 풀스크린 셸을 사용한다.
 *
 * useSearchParams()를 사용하므로 page.tsx에서 반드시 <Suspense>로 감싸야 한다.
 *
 * 애니메이션 전략:
 *   - LazyMotion + domAnimation + m.* 패턴 (프로젝트 표준)
 *   - 로고(자체 애니메이션) → 타이틀(delay 0.15s) stagger
 *   - 폼 영역: 진입 애니메이션은 다음 단계 전문가가 stagger 추가 예정
 *   - 로그인 버튼: m.div whileTap press 피드백
 *   - KCircleLogo는 자체 mount 애니메이션 보유 → 중복 방지
 *   - useReducedMotion() 준수 (WCAG SC 2.3.3)
 */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { LazyMotion, domAnimation, m, useReducedMotion } from "motion/react";
import { ArrowRight } from "lucide-react";

import { AuthScreen } from "@/components/auth/auth-screen";
import { PasswordInput } from "@/components/auth/password-input";
import { KCircleLogo } from "@/components/layout/kcircle-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { sanitizeNext } from "@/lib/auth/sanitize-next";
import { AUTH_INPUT_CLS } from "@/lib/auth/input-class";

// ── Primary CTA 버튼 스타일 토큰 ──
// 慶應 네이비 배경, disabled 시 회색 전환 없이 불투명도만 낮춤
const CTA_BTN_CLS =
  "h-12 w-full rounded-xl bg-keio-navy text-base font-semibold text-keio-navy-foreground transition-opacity hover:opacity-90 disabled:opacity-40";

// ── 공통 easing — 프로젝트 표준 expo-out (iOS 풍, 빠르게 시작해 부드럽게 멈춤)
const EASE_EXPO_OUT = [0.22, 1, 0.36, 1] as const;

// ── 진입 애니메이션 variants ──
// y 10px 아래에서 올라오며 페이드인. 절제된 이동 거리가 뉴욕 스타일의 핵심.
const FADE_UP_VARIANTS = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
} as const;

export function LoginForm() {
  const router = useRouter();

  // 로그인 전 가려던 경로 — 로그인 완료 후 복원하기 위해 사용
  const searchParams = useSearchParams();
  const next = searchParams.get("next");

  // ── 폼 상태 ──
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // reduced motion 사용자는 initial을 완성 상태로 강제 (애니메이션 즉시 완료)
  const reducedMotion = useReducedMotion();
  const initial = reducedMotion ? "visible" : "hidden";

  // reduced motion 시 duration 0으로 즉시 전환
  const makeTransition = (delay: number) =>
    reducedMotion ? { duration: 0 } : { duration: 0.42, ease: EASE_EXPO_OUT, delay };

  // ── 로그인 처리 핸들러 ──
  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const supabase = createClient();

    // 이메일+비밀번호로 로그인 시도
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      // 보안상 구체적 실패 이유를 노출하지 않음 (이메일/비밀번호 구분 없이 동일 메시지)
      setError("メールアドレスまたはパスワードが正しくありません");
      setIsLoading(false);
      return;
    }

    // 로그인 성공 → next 파라미터가 안전하면 해당 경로로, 없으면 서클 목록으로 이동
    const safeNext = sanitizeNext(next);
    router.push(safeNext ?? "/circles");
  };

  return (
    <LazyMotion features={domAnimation}>
      <AuthScreen align="center">
        {/* ── 중앙 집약 그룹 ── 로고·타이틀·폼·신규가입 링크를 한 덩어리로 */}
        <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-6">
          {/*
            KCircleLogo는 자체 Ring Draw 애니메이션을 보유하므로
            별도 모션 래퍼 없이 그대로 사용 (중복 방지).
          */}
          <KCircleLogo size="lg" />

          {/* 타이틀 + 운영자 안내 — 한 블록으로 묶어 좁은 간격(서브타이틀처럼 보이게) */}
          <div className="flex flex-col items-center gap-1.5 text-center">
            {/* 타이틀: delay 0.15s — 로고 애니메이션 완료 후 자연스럽게 이어짐 */}
            <m.h1
              className="text-[1.75rem] font-bold tracking-tight"
              variants={FADE_UP_VARIANTS}
              initial={initial}
              animate="visible"
              transition={makeTransition(0.15)}
            >
              ログイン
            </m.h1>
            {/* Direction A: 계정은 서클 대표(운영자)/관리자용임을 명시 */}
            <m.p
              className="text-muted-foreground text-sm"
              variants={FADE_UP_VARIANTS}
              initial={initial}
              animate="visible"
              transition={makeTransition(0.18)}
            >
              サークル運営者向けのログインです
            </m.p>
          </div>

          {/* ── 로그인 폼 — 엔터 제출 지원을 위해 <form>으로 감쌈 ── */}
          <form onSubmit={handleLogin} className="flex w-full flex-col gap-4">
            {/* 이메일 필드: delay 0.21s — 타이틀(0.15s) 다음 0.06s stagger 간격 */}
            <m.div
              className="flex flex-col gap-2"
              variants={FADE_UP_VARIANTS}
              initial={initial}
              animate="visible"
              transition={makeTransition(0.21)}
            >
              <Label htmlFor="email">メールアドレス</Label>
              {/* 프리미엄 스타일 오버라이드 — globals.css의 Input 기본값 위에 덮어씀 */}
              <Input
                id="email"
                type="email"
                placeholder="taro@keio.jp"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className={AUTH_INPUT_CLS}
              />
            </m.div>

            {/* 비밀번호 필드: delay 0.27s — 이메일 필드 다음 0.06s stagger 간격 */}
            <m.div
              className="flex flex-col gap-2"
              variants={FADE_UP_VARIANTS}
              initial={initial}
              animate="visible"
              transition={makeTransition(0.27)}
            >
              <Label htmlFor="password">パスワード</Label>
              {/* PasswordInput: show/hide 토글 내장 — 기존 Input type="password"를 대체 */}
              <PasswordInput
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="パスワードを入力"
                autoComplete="current-password"
              />
            </m.div>

            {/* 인라인 에러 메시지 — 동적 표시 요소이므로 애니메이션 없이 그대로 */}
            {error && (
              <p className="text-sm text-red-500" role="alert">
                {error}
              </p>
            )}

            {/*
              로그인 버튼: delay 0.33s — 비밀번호 필드(0.27s) 다음 0.06s stagger 간격.
              진입 FADE_UP + whileTap press 피드백을 한 엘리먼트에 공존.
              whileTap 내부에 transition을 직접 지정해 진입 transition(0.42s)과 격리.
              Button type="submit" — form의 onSubmit 트리거는 그대로 유지.
            */}
            <m.div
              variants={FADE_UP_VARIANTS}
              initial={initial}
              animate="visible"
              transition={makeTransition(0.33)}
              whileTap={reducedMotion ? undefined : { scale: 0.98, transition: { duration: 0.1 } }}
            >
              {/* CTA 스타일: 네이비 배경, disabled 시 회색 전환 없이 불투명도만 낮춤 */}
              <Button type="submit" disabled={isLoading} className={CTA_BTN_CLS}>
                {isLoading ? (
                  "ログイン中…"
                ) : (
                  /* 텍스트 + 화살표 아이콘 — flex 정렬로 나란히 배치 */
                  <span className="flex items-center justify-center gap-2">
                    ログイン
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </span>
                )}
              </Button>
            </m.div>
          </form>

          {/* 신규 가입 안내 — 로그인 버튼 바로 아래(눈에 잘 띄게). next 보존. */}
          <m.p
            className="text-muted-foreground text-center text-sm"
            variants={FADE_UP_VARIANTS}
            initial={initial}
            animate="visible"
            transition={makeTransition(0.39)}
          >
            アカウントをお持ちでないですか?{" "}
            <Link
              href={`/auth/sign-up${next ? `?next=${encodeURIComponent(next)}` : ""}`}
              className="text-foreground font-semibold underline underline-offset-4"
            >
              新規登録
            </Link>
          </m.p>
        </div>
      </AuthScreen>
    </LazyMotion>
  );
}
