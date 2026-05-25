/**
 * lib/email/templates.ts
 *
 * 가입 환영 / 서클 승인 / 서클 거절 이메일 템플릿.
 * circleName · reason · displayName 등 사용자 입력은 HTML 출력 전에 반드시 escape 처리.
 */

// -------------------------------------------------------
// 내부 유틸: HTML 인젝션 방지용 문자 이스케이프
// & < > " ' 를 HTML 엔티티로 치환함
// -------------------------------------------------------
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// -------------------------------------------------------
// 공통 래퍼: 이메일 외곽 레이아웃
// -------------------------------------------------------
function wrapLayout(content: string): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.1);">
    <!-- 헤더 -->
    <div style="background:#1a1a1a;padding:24px 32px;">
      <p style="margin:0;color:#ffffff;font-size:18px;font-weight:700;letter-spacing:.5px;">Keio Club</p>
    </div>
    <!-- 본문 -->
    <div style="padding:32px;">
      ${content}
    </div>
    <!-- 푸터 -->
    <div style="padding:16px 32px;background:#f0f0f0;border-top:1px solid #e0e0e0;">
      <p style="margin:0;color:#888;font-size:12px;">このメールはシステムから自動送信されています。返信はできません。</p>
    </div>
  </div>
</body>
</html>`;
}

// -------------------------------------------------------
// 승인 메일
// 件名: 「{circleName}」が公開されました
// -------------------------------------------------------
export function circleApprovedEmail(circleName: string): {
  subject: string;
  html: string;
} {
  // HTML インジェクション防止のためエスケープ
  const safeName = escapeHtml(circleName);

  const subject = `「${safeName}」が公開されました`;

  const content = `
    <h1 style="margin:0 0 16px;font-size:22px;color:#1a1a1a;">掲載が承認されました 🎉</h1>
    <p style="margin:0 0 12px;font-size:15px;color:#333;line-height:1.7;">
      <strong>「${safeName}」</strong>が審査を通過し、<strong>Keio Club</strong> に正式に掲載されました。
    </p>
    <p style="margin:0 0 12px;font-size:15px;color:#333;line-height:1.7;">
      これより新入生・在校生がサークルページを閲覧できるようになります。
      部員募集や活動内容をしっかりアピールしましょう！
    </p>
    <div style="margin:24px 0;padding:16px 20px;background:#f0faf4;border-left:4px solid #22c55e;border-radius:4px;">
      <p style="margin:0;font-size:14px;color:#15803d;line-height:1.6;">
        ✅ Keio Club に掲載済み<br />
        新入生のサークル検索に表示されるようになりました。
      </p>
    </div>
    <p style="margin:0;font-size:13px;color:#888;line-height:1.6;">
      掲載内容の変更はマイページから行えます。
    </p>
  `;

  return { subject, html: wrapLayout(content) };
}

// -------------------------------------------------------
// 가입 환영 메일
// 件名: Keio Club へようこそ 🎉
// 회원가입(온보딩) 완료 시 1회 발송
// displayName 은 선택 — 있으면 인사말에 사용
// -------------------------------------------------------
export function welcomeEmail(displayName?: string): {
  subject: string;
  html: string;
} {
  // HTML インジェクション防止のためエスケープ (닉네임은 사용자 입력)
  const safeName = displayName ? escapeHtml(displayName) : "";

  const subject = "Keio Club へようこそ 🎉";

  // 닉네임이 있으면 「{이름}さん、」로 시작, 없으면 일반 인사
  const greeting = safeName
    ? `${safeName}さん、ご登録ありがとうございます 🎉`
    : "ご登録ありがとうございます 🎉";

  const content = `
    <h1 style="margin:0 0 16px;font-size:22px;color:#1a1a1a;">${greeting}</h1>
    <p style="margin:0 0 12px;font-size:15px;color:#333;line-height:1.7;">
      この度は <strong>Keio Club</strong> にご登録いただき、ありがとうございます。
    </p>
    <div style="margin:24px 0;padding:16px 20px;background:#f0faf4;border-left:4px solid #22c55e;border-radius:4px;">
      <p style="margin:0;font-size:14px;color:#15803d;line-height:1.7;">
        マイページからサークルの<strong>登録・管理</strong>を始められます。<br />
        サークルを申請すると、審査後に新入生・在校生へ公開されます。
      </p>
    </div>
    <p style="margin:0;font-size:13px;color:#888;line-height:1.6;">
      ご不明な点がございましたら、運営チームまでお問い合わせください。
    </p>
  `;

  return { subject, html: wrapLayout(content) };
}

// -------------------------------------------------------
// 거절 메일
// 件名: 「{circleName}」の掲載について
// -------------------------------------------------------
export function circleRejectedEmail(
  circleName: string,
  reason: string
): { subject: string; html: string } {
  // HTML インジェクション防止のためエスケープ
  const safeName = escapeHtml(circleName);
  const safeReason = escapeHtml(reason);

  const subject = `「${safeName}」の掲載について`;

  const content = `
    <h1 style="margin:0 0 16px;font-size:22px;color:#1a1a1a;">掲載審査の結果について</h1>
    <p style="margin:0 0 12px;font-size:15px;color:#333;line-height:1.7;">
      このたびは <strong>Keio Club</strong> へのサークル登録申請ありがとうございました。
    </p>
    <p style="margin:0 0 12px;font-size:15px;color:#333;line-height:1.7;">
      誠に恐れ入りますが、<strong>「${safeName}」</strong>については、
      今回は掲載を見合わせる結果となりました。
    </p>

    <!-- 거절 사유 인용 박스 -->
    <div style="margin:20px 0;padding:16px 20px;background:#fff5f5;border-left:4px solid #ef4444;border-radius:4px;">
      <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#b91c1c;letter-spacing:.5px;">審査コメント</p>
      <p style="margin:0;font-size:14px;color:#7f1d1d;line-height:1.7;white-space:pre-wrap;">${safeReason}</p>
    </div>

    <p style="margin:0 0 12px;font-size:15px;color:#333;line-height:1.7;">
      上記の内容をご確認のうえ、必要な修正を行っていただいた後、
      再度申請いただけますと幸いです。
    </p>
    <p style="margin:0;font-size:13px;color:#888;line-height:1.6;">
      ご不明な点がございましたら、運営チームまでお問い合わせください。
    </p>
  `;

  return { subject, html: wrapLayout(content) };
}
