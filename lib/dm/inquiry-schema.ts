/**
 * lib/dm/inquiry-schema.ts
 *
 * 운영진 DM 신규 문의 발신 폼의 Zod 검증 스키마.
 *
 * ── 필드 구성 ───────────────────────────────────────────────────────────
 * body     : 문의 본문 (1~2000자, 필수)
 * category : 선택적(optional) — 채팅 개편 후 카테고리 없이 NULL 저장 가능.
 *            인박스·향후 재도입을 위해 상수(INQUIRY_CATEGORIES)는 삭제하지 않음.
 *
 * ── 에러 메시지 ─────────────────────────────────────────────────────────
 * 사용자 대면 에러 메시지는 일본어로 작성한다.
 * (CLAUDE.md 규칙: UI 카피 = 일본어)
 */

import { z } from "zod";

/**
 * 본문 전용 검증 스키마.
 *
 * sendInquiry Server Action(채팅 개편 후)에서 body 하나만 검증할 때 사용.
 * 최소 1자(빈 전송 방지), 최대 2000자(DB 컬럼 한도 및 UX 제한).
 */
export const bodySchema = z
  .string()
  .min(1, { message: "メッセージを入力してください" })
  .max(2000, { message: "メッセージは2000文字以内で入力してください" });

/**
 * @deprecated 채팅 개편(T-DM-CHAT) 이후 sendInquiry 에서는 bodySchema 를 사용.
 * 인박스 등 기존 소비처 호환을 위해 남겨둠.
 */
export const inquirySchema = z.object({
  /**
   * 문의 카테고리 (optional).
   * DB CHECK 제약 6값 enum — 값이 있으면 검증하고, 없으면(undefined/null) NULL 저장.
   * 채팅 개편 후 카테고리 UI 를 제거했으므로 실제로는 undefined 로 전달됨.
   */
  category: z
    .enum(["fee", "schedule", "vibe", "trial", "interest", "other"] as const, {
      error: "カテゴリを選択してください",
    })
    .optional(),

  /**
   * 문의 본문.
   * 최소 1자(빈 전송 방지), 최대 2000자(DB 컬럼 한도 및 UX 제한).
   */
  body: z
    .string()
    .min(1, { message: "お問い合わせ内容を入力してください" })
    .max(2000, { message: "お問い合わせ内容は2000文字以内で入力してください" }),
});

/** 스키마에서 추론한 TypeScript 타입 (기존 소비처 호환용) */
export type InquiryFormValues = z.infer<typeof inquirySchema>;
