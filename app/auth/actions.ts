"use server";

/**
 * app/auth/actions.ts
 *
 * 인증/온보딩 관련 Server Actions.
 *
 * - sendWelcomeEmail: 회원가입(온보딩) 완료 시 본인에게 환영 메일 1회 발송.
 *   닉네임 저장 직후(클라이언트)에서 호출한다.
 *   RESEND_API_KEY 미설정이면 sendEmail 이 no-op. 모든 실패는 흡수(온보딩 흐름에 영향 없음).
 */

import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/resend";
import { welcomeEmail } from "@/lib/email/templates";

/**
 * 현재 로그인한 사용자에게 가입 환영 메일을 발송한다 (best-effort).
 * 인증 이메일(user.email)을 수신지로 사용하고, profiles.display_name 으로 인사말을 개인화한다.
 */
export async function sendWelcomeEmail(): Promise<void> {
  try {
    const supabase = await createClient();

    // 현재 로그인 사용자 — 미로그인이거나 이메일 없으면 발송하지 않음
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) return;

    // 닉네임 조회(인사말 개인화용) — 없으면 일반 인사로 fallback
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle();

    const mail = welcomeEmail(profile?.display_name ?? undefined);
    await sendEmail({ to: user.email, subject: mail.subject, html: mail.html });
  } catch (e) {
    // 환영 메일 실패는 가입 자체에 영향 없음 — 로그만 남김
    console.error("[sendWelcomeEmail]", e);
  }
}
