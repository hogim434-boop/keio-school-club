"use client";

/**
 * LoginForm — Google 전용 로그인 화면
 *
 * 가입이 Google OAuth 전용(비밀번호 단계 없음)이고, 비밀번호로 만들어진
 * 기존 사용자가 없으므로 이메일+비밀번호 폼은 제거했다.
 * → 로그인 수단은 Google 하나로 통일.
 *
 * useSearchParams()를 사용하므로 page.tsx에서 반드시 <Suspense>로 감싸야 한다.
 *
 * 애니메이션 전략:
 *   - LazyMotion + domAnimation + m.* 패턴 (프로젝트 표준)
 *   - 로고(자체 애니메이션) → 서브카피(0.15s) → GoogleButton(0.21s) → 신규가입 링크(0.30s)
 *   - KCircleLogo는 자체 mount 애니메이션 보유 → 중복 방지
 *   - useReducedMotion() 준수 (WCAG SC 2.3.3)
 */

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LazyMotion, domAnimation, m, useReducedMotion } from "motion/react";

import { AuthScreen } from "@/components/auth/auth-screen";
import { GoogleButton } from "@/components/auth/google-button";
import { KCircleLogo } from "@/components/layout/kcircle-logo";

// ── 공통 easing — 프로젝트 표준 expo-out (iOS 풍, 빠르게 시작해 부드럽게 멈춤)
const EASE_EXPO_OUT = [0.22, 1, 0.36, 1] as const;

// ── 진입 애니메이션 variants ──
// y 10px 아래에서 올라오며 페이드인. 절제된 이동 거리가 뉴욕 스타일의 핵심.
const FADE_UP_VARIANTS = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
} as const;

export function LoginForm() {
  // 로그인 전 가려던 경로 — 로그인 완료 후 복원하기 위해 사용.
  // next= を優先. 旧 redirect_to= も fallback として読む (下位互換・移行期安全策)
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? searchParams.get("redirect_to");

  // reduced motion 사용자는 initial을 완성 상태로 강제 (애니메이션 즉시 완료)
  const reducedMotion = useReducedMotion();
  const initial = reducedMotion ? "visible" : "hidden";

  // reduced motion 시 duration 0으로 즉시 전환
  const makeTransition = (delay: number) =>
    reducedMotion ? { duration: 0 } : { duration: 0.42, ease: EASE_EXPO_OUT, delay };

  return (
    <LazyMotion features={domAnimation}>
      <AuthScreen align="center" backHref="/">
        {/* ── 중앙 집약 그룹 ── 로고·서브카피·Google 버튼·신규가입 링크를 한 덩어리로 */}
        <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-6">
          {/*
            KCircleLogo는 자체 Ring Draw 애니메이션을 보유하므로
            별도 모션 래퍼 없이 그대로 사용 (중복 방지).
          */}
          <KCircleLogo size="lg" />

          {/* 서브카피: delay 0.15s — 로고 다음 자연스럽게 이어짐 */}
          <m.p
            className="text-muted-foreground text-center text-sm leading-relaxed"
            variants={FADE_UP_VARIANTS}
            initial={initial}
            animate="visible"
            transition={makeTransition(0.15)}
          >
            慶應アカウントでログイン
          </m.p>

          {/*
            Google 로그인 버튼 — 유일한 로그인 수단.
            delay 0.21s — 서브카피 다음 0.06s stagger 간격.
          */}
          <m.div
            className="w-full"
            variants={FADE_UP_VARIANTS}
            initial={initial}
            animate="visible"
            transition={makeTransition(0.21)}
          >
            <GoogleButton next={next} label="Googleでログイン" />
          </m.div>

          {/* 신규 가입 안내 — Google 버튼 바로 아래. next 보존. */}
          <m.p
            className="text-muted-foreground text-center text-sm"
            variants={FADE_UP_VARIANTS}
            initial={initial}
            animate="visible"
            transition={makeTransition(0.3)}
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
