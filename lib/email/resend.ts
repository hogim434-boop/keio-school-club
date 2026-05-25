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
    });

    if (!res.ok) {
      // HTTP 오류 상태 코드: 로그만 남기고 ok:false 반환
      console.error("[email] 발송 실패", res.status, await res.text());
      return { ok: false };
    }

    return { ok: true };
  } catch (e) {
    // 네트워크 예외 등: 로그만 남기고 ok:false 반환
    console.error("[email] 예외", e);
    return { ok: false };
  }
}
