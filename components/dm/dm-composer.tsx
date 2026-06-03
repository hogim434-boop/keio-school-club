"use client";

/**
 * components/dm/dm-composer.tsx
 *
 * DM 스레드 메시지 입력창 (Client Component).
 *
 * ── 기능 ─────────────────────────────────────────────────────────────────
 * - Textarea: 메시지 입력 (Enter 단독은 줄바꿈, Ctrl/Cmd+Enter 는 전송)
 * - 전송 버튼:
 *   - onSend prop 있으면 → onSend(body) 호출 (신규 문의 빈 채팅창용)
 *   - onSend prop 없으면 → replyToInquiry Server Action (기존 스레드 후방 호환)
 * - useTransition: pending 중 입력 비활성 + 버튼 로딩 표시
 * - 전송 후 Textarea 자동 초기화
 * - Realtime 으로 메시지가 다시 들어오므로 optimistic 추가 없이 단순 처리
 *   (dm-thread.tsx 의 dedupe 로 중복 방지)
 *
 * ── 접근성 ────────────────────────────────────────────────────────────────
 * - Textarea 에 aria-label 부여
 * - 전송 중 aria-busy="true"
 * - 에러 메시지 role="alert"
 */

import { useState, useTransition, useRef } from "react";

import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { SendHorizonal } from "lucide-react";
import { replyToInquiry } from "@/app/circles/[id]/dm/actions";
import { cn } from "@/lib/utils";

// 메시지 최대 글자 수 — 서버 Action 과 동일하게 유지
const MESSAGE_MAX_LENGTH = 2000;

interface DmComposerProps {
  /**
   * 메시지를 전송할 inquiry UUID.
   * onSend 가 있으면 optional (신규 문의 빈 채팅창에서는 아직 inquiryId 없음).
   */
  inquiryId?: string;
  /** 현재 스레드가 속한 서클 UUID (Server Action 에 전달) */
  circleId: string;
  /**
   * 커스텀 전송 핸들러 (신규 문의 빈 채팅창용).
   * 이 prop 이 있으면 replyToInquiry 대신 이 함수를 호출한다.
   * 반환값:
   *   - void: 성공 (서버 측에서 redirect 처리 또는 추가 액션 불필요)
   *   - { error: string }: 에러 메시지를 인라인으로 표시
   *   - { error: "REQUIRE_RESPECT_AGREEMENT" }: 부모(new-dm-chat)가 동의 모달을 표시해야 함
   *
   * onSend 가 없으면 기존 replyToInquiry(inquiryId, circleId, body) 로 폴백됨.
   */
  onSend?: (body: string) => Promise<{ error: string } | void>;
}

/**
 * DM 스레드 하단 메시지 입력창.
 *
 * onSend prop 으로 신규 문의(new-dm-chat)와 기존 스레드(dm-thread) 양쪽에서 재사용.
 * onSend 없으면 replyToInquiry Server Action 을 그대로 호출 (후방 호환).
 */
export function DmComposer({ inquiryId, circleId, onSend }: DmComposerProps) {
  const [body, setBody] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const bodyLength = body.length;
  const isOverLimit = bodyLength > MESSAGE_MAX_LENGTH;
  const canSubmit = body.trim().length > 0 && !isOverLimit && !isPending;

  /** 폼 전송 핸들러 */
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;

    const trimmedBody = body.trim();
    setServerError(null);

    startTransition(async () => {
      let result: { error: string } | void;

      if (onSend) {
        // onSend prop 있으면 커스텀 핸들러 호출 (신규 문의 빈 채팅창용)
        result = await onSend(trimmedBody);
      } else {
        // onSend 없으면 기존 replyToInquiry 호출 (기존 스레드 후방 호환)
        if (!inquiryId) {
          setServerError("お問い合わせIDが見つかりません");
          return;
        }
        result = await replyToInquiry(inquiryId, circleId, trimmedBody);
      }

      if (result?.error) {
        // REQUIRE_RESPECT_AGREEMENT 는 부모(new-dm-chat)가 onSend 안에서 처리하므로
        // 여기에서는 일반 에러로 표시 (부모가 이미 모달을 띄울 것임)
        setServerError(result.error);
      } else {
        // 전송 성공 → 입력창 초기화
        setBody("");
        // 포커스 유지 (계속 입력 가능하도록)
        textareaRef.current?.focus();
      }
    });
  }

  /**
   * Ctrl+Enter (macOS: Cmd+Enter) 로 빠르게 전송.
   * Enter 단독은 줄바꿈.
   */
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (canSubmit) {
        // 폼 submit 이벤트를 직접 호출
        e.currentTarget.form?.requestSubmit();
      }
    }
  }

  return (
    <div className="bg-background border-t shadow-sm">
      {/* pb-safe: iOS home indicator 영역 확보 */}
      {/* 풀스크린 flex 레이아웃의 마지막 자식으로 배치 — bottom-16(탭바)은 이 경로에 없음 */}
      <div className="px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
        {/* 서버 에러 메시지 */}
        {serverError && (
          <div
            role="alert"
            className="border-destructive/30 bg-destructive/10 mb-2 rounded-lg border px-3 py-2"
          >
            <p className="text-destructive text-xs">{serverError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          {/* 메시지 입력 Textarea */}
          <div className="relative flex-1">
            <Textarea
              ref={textareaRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="メッセージを入力…"
              rows={1}
              disabled={isPending}
              aria-label="メッセージ入力欄"
              aria-invalid={isOverLimit}
              maxLength={MESSAGE_MAX_LENGTH + 1}
              className={cn(
                // 최소 높이 ~ 최대 4행 auto-resize は CSS で管理
                "max-h-36 min-h-[2.75rem] resize-none overflow-y-auto py-2.5 pr-16 text-sm",
                "rounded-xl leading-snug",
                isOverLimit && "border-destructive focus-visible:border-destructive"
              )}
            />
            {/* 글자 수 카운터 — Textarea 우측 하단 오버레이 */}
            {bodyLength > 0 && (
              <span
                aria-live="polite"
                className={cn(
                  "pointer-events-none absolute right-2 bottom-2 text-[10px] tabular-nums",
                  isOverLimit
                    ? "text-destructive font-semibold"
                    : bodyLength > MESSAGE_MAX_LENGTH * 0.8
                      ? "text-amber-500"
                      : "text-muted-foreground"
                )}
              >
                {bodyLength}/{MESSAGE_MAX_LENGTH}
              </span>
            )}
          </div>

          {/* 전송 버튼 */}
          <Button
            type="submit"
            size="icon"
            disabled={!canSubmit}
            aria-busy={isPending}
            aria-label="送信"
            className={cn(
              "size-11 shrink-0 rounded-full",
              "bg-keio-navy text-keio-navy-foreground hover:bg-keio-navy/90",
              "disabled:opacity-40"
            )}
          >
            <SendHorizonal className="size-5" aria-hidden />
          </Button>
        </form>

        {/* Ctrl/Cmd+Enter ヒント */}
        <p className="text-muted-foreground/70 mt-1 text-center text-[10px]">Ctrl + Enter で送信</p>
      </div>
    </div>
  );
}
