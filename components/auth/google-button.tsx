"use client";

/**
 * GoogleButton — Google OAuth 로그인 버튼
 *
 * 클릭 시 Supabase OAuth 플로우를 시작해 Google 로그인 화면으로 이동한다.
 * - 개방 정책: 도메인 제한(hd) 없음 — 모든 Google 계정 허용. @keio.jp 메일은 keio_verified 배지만 자동 부여.
 * - prompt=select_account: 이미 로그인된 계정이 있어도 선택 화면을 노출
 * - redirectTo: Google 인증 완료 후 돌아올 콜백 URL. next 파라미터를 그대로 전달해
 *   콜백 라우트(/auth/callback)에서 원래 목적지로 최종 리다이렉트한다.
 */

import { useState } from "react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { sanitizeNext } from "@/lib/auth/sanitize-next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface GoogleButtonProps {
  /** 로그인 완료 후 이동할 경로 (sanitizeNext 로 검증됨) */
  next?: string | null;
  /** 버튼 라벨 텍스트 (기본값: "Googleで続ける") */
  label?: string;
  /** 추가 Tailwind 클래스 */
  className?: string;
  /** 가입 의도 — 콜백 라우트에서 온보딩 분기에 사용 */
  intent?: "general" | "operator";
}

export function GoogleButton({
  next,
  label = "Googleで続ける",
  className,
  intent,
}: GoogleButtonProps) {
  // 로딩 상태 — OAuth 리다이렉트 중에는 버튼을 비활성화하여 중복 클릭 방지
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setIsLoading(true);

    // 브라우저 전용 클라이언트 사용 (Client Component)
    const supabase = createClient();

    // 오픈 리다이렉트 방지: next 파라미터를 안전한 상대 경로로 검증
    const safeNext = sanitizeNext(next ?? null);

    // 콜백 URL 조립: /auth/callback?next=<safe-path>&intent=<intent>
    // - next, intent 모두 없으면 /auth/callback 만 사용
    // - intent는 콜백 라우트에서 신규 사용자 온보딩 분기에 사용
    const callbackParams = new URLSearchParams();
    if (safeNext) callbackParams.set("next", safeNext);
    if (intent) callbackParams.set("intent", intent);
    const callbackQuery = callbackParams.toString();
    const callbackUrl = `${window.location.origin}/auth/callback${
      callbackQuery ? `?${callbackQuery}` : ""
    }`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl,
        queryParams: {
          // 개방 정책: keio.jp 도메인 힌트(hd) 제거 → 모든 Google 계정으로 가입/로그인 가능.
          // (@keio.jp 메일은 trigger 의 is_keio_email 로 keio_verified 배지만 자동 부여 — 차단 아님)
          // 이미 로그인 상태여도 계정 선택 화면 표시 (계정 전환 가능)
          prompt: "select_account",
        },
      },
    });

    if (error) {
      // 에러 발생 시 토스트 표시 후 로딩 해제 (성공 시에는 Google로 이동하므로 해제 불필요)
      toast.error("ログインに失敗しました。もう一度お試しください。");
      setIsLoading(false);
    }
    // 성공 시 브라우저가 Google 로그인 페이지로 이동하므로 별도 router.push 불필요
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleGoogleLogin}
      disabled={isLoading}
      className={cn("h-12 w-full text-base", className)}
    >
      {isLoading ? (
        // 리다이렉트 중 표시 — 스피너 대신 텍스트로 상태 전달 (접근성 친화)
        <span>リダイレクト中…</span>
      ) : (
        <>
          {/* Google 멀티컬러 G 로고 (공식 브랜드 가이드라인 색상) */}
          <svg
            aria-hidden="true"
            width="18"
            height="18"
            viewBox="0 0 18 18"
            xmlns="http://www.w3.org/2000/svg"
            className="mr-2 shrink-0"
          >
            <path
              d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
              fill="#4285F4"
            />
            <path
              d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
              fill="#34A853"
            />
            <path
              d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
              fill="#FBBC05"
            />
            <path
              d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"
              fill="#EA4335"
            />
          </svg>
          <span>{label}</span>
        </>
      )}
    </Button>
  );
}
