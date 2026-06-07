"use client";

/**
 * ClaimForm — 동아리 권한 이양 신청 폼 (Client Component).
 *
 * 상태:
 * - idle: 신청 전 폼 표시
 * - pending: 전송 중 버튼 비활성
 * - done: 신청 완료 확인 화면
 * - error: 에러 메시지 표시
 *
 * contact_note(textarea) 필수 입력 → submitClaimRequest Server Action 호출.
 */

import { useRef, useState, useTransition } from "react";
import { CheckCircle } from "lucide-react";

import { submitClaimRequest } from "@/app/circles/[id]/claim/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface ClaimFormProps {
  /** 대상 동아리 UUID */
  circleId: string;
  /** 동아리 표시명 — 확인 화면에 표시 */
  circleName: string;
}

export function ClaimForm({ circleId, circleName }: ClaimFormProps) {
  // useTransition: Server Action 호출 중 isPending 플래그 제공
  const [isPending, startTransition] = useTransition();

  // 화면 상태 — "idle" | "done"
  const [isDone, setIsDone] = useState(false);
  // 에러 메시지 (null = 없음)
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // textarea ref — 제출 후 값 참조
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const note = textareaRef.current?.value ?? "";

    setErrorMessage(null);

    startTransition(async () => {
      const result = await submitClaimRequest(circleId, note);
      if (result.ok) {
        setIsDone(true);
      } else {
        setErrorMessage(result.error ?? "エラーが発生しました。もう一度お試しください。");
      }
    });
  }

  // ── 申請完了 画面 ───────────────────────────────────────────────────────────
  if (isDone) {
    return (
      <div className="bg-card flex flex-col items-center gap-4 rounded-2xl border px-6 py-10 text-center shadow-sm">
        {/* 완료 아이콘 */}
        <CheckCircle className="size-10 text-emerald-500" aria-hidden />
        <div className="space-y-1.5">
          <p className="text-base font-semibold">申請を受け付けました</p>
          <p className="text-muted-foreground text-sm leading-relaxed">
            内容を確認のうえ、ご連絡します。
            <br />
            しばらくお待ちください。
          </p>
        </div>
        {/* 동아리 상세로 돌아가기 */}
        <a
          href={`/circles/${circleId}`}
          className="text-keio-navy mt-2 text-sm font-medium underline-offset-2 hover:underline"
        >
          {circleName} のページへ戻る
        </a>
      </div>
    );
  }

  // ── 신청 폼 ──────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* 필드: 본인 증명 정보 */}
      <div className="space-y-2">
        <Label htmlFor="contact_note" className="text-sm font-medium">
          本人確認情報
          <span className="text-destructive ml-1" aria-hidden>
            *
          </span>
        </Label>

        <Textarea
          id="contact_note"
          ref={textareaRef}
          name="contact_note"
          required
          minLength={10}
          maxLength={1000}
          rows={5}
          placeholder="公式SNSアカウントURL・連絡先など、サークル・部活動の運営者ご本人であることを確認できる情報をご記入ください。（例: https://instagram.com/xxx、代表者氏名、部員しか知らない情報など）"
          className={cn(
            "resize-none text-sm",
            errorMessage && "border-destructive focus-visible:ring-destructive"
          )}
          aria-describedby={errorMessage ? "claim-form-error" : undefined}
          disabled={isPending}
        />

        <p className="text-muted-foreground text-xs">
          ※ ご記入いただいた情報は、運営者確認のみに使用します。
        </p>
      </div>

      {/* 에러 메시지 */}
      {errorMessage && (
        <p
          id="claim-form-error"
          role="alert"
          className="text-destructive rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400"
        >
          {errorMessage}
        </p>
      )}

      {/* 제출 버튼 */}
      <Button type="submit" className="w-full" disabled={isPending} aria-busy={isPending}>
        {isPending ? "送信中…" : "申請する"}
      </Button>
    </form>
  );
}
