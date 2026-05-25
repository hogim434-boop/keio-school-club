/**
 * lib/email/resend.ts
 *
 * 서버 전용 이메일 발송 헬퍼.
 * "use client" 금지 — Server Action / Route Handler 에서만 import 할 것.
 * RESEND_API_KEY / EMAIL_FROM 이 없을 때는 throw 없이 ok:false 를 반환(no-op).
 */

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ ok: boolean }> {
  // 환경 변수가 없으면 경고만 남기고 정상 반환 (빌드/동작에 영향 없음)
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!key || !from) {
    console.warn("[email] RESEND_API_KEY/EMAIL_FROM 미설정 — 발송 skip");
    return { ok: false };
  }

  // Resend 응답이 늦어도 무한정 매달리지 않도록 10초 타임아웃을 건다.
  // (타임아웃이 없으면 발송 호출이 hang 되어 호출부의 흐름까지 멈출 수 있음)
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: params.to,
        subject: params.subject,
        html: params.html,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      // HTTP 오류 상태 코드: 로그만 남기고 ok:false 반환
      console.error("[email] 발송 실패", res.status, await res.text());
      return { ok: false };
    }

    return { ok: true };
  } catch (e) {
    // 네트워크 예외·타임아웃(abort) 등: 로그만 남기고 ok:false 반환
    console.error("[email] 예외", e);
    return { ok: false };
  } finally {
    clearTimeout(timeout);
  }
}
