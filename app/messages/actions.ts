"use server";

/**
 * app/messages/actions.ts
 *
 * メッセージ(DM)関連の Server Actions.
 *
 * ── 収録 Action ─────────────────────────────────────────────────────────────
 * 1. markInquiryMessagesRead — スレッド進入時に運営からのメッセージを既読に設定.
 * 2. getMyUnreadInquiriesTotal — ヘッダーバッジ用: 全未読件数の合計を返す.
 *
 * ── セキュリティ ─────────────────────────────────────────────────────────────
 * - getClaims() で認証確認. 未認証なら no-op(0 返却 or early return).
 * - RLS: inquiry_messages_update_read 정책が「本人受信分のみ UPDATE 허용」を担保.
 *   マイグレーション不要.
 *
 * ── A-5 準拠 ────────────────────────────────────────────────────────────────
 * 「既読」テキストを画面に表示しない. is_read は DB フラグと数値バッジにのみ使用.
 *
 * ── キャッシュ ──────────────────────────────────────────────────────────────
 * DM は個人データ → unstable_cache 絶対禁止. 毎リクエスト最新値.
 * markInquiryMessagesRead は client(dm-thread)の effect から呼ばれるため、
 * revalidatePath は使わない(レンダー中 revalidate 禁止に抵触するため)。
 * /messages は cacheComponents OFF で毎回 server-render され、
 * ヘッダーバッジは kc:dm-read イベント + 60秒ポーリングで更新される。
 */

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getMyInquiries } from "@/lib/supabase/queries/inquiries";

// ══════════════════════════════════════════════════════════════════════════════
//  hideInquiry — 발신자 본인 목록에서 스레드 숨기기 (soft delete)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * 발신자(학생)가 본인 메시지 목록에서 특정 스레드를 숨긴다(soft delete).
 *
 * ── 동작 ─────────────────────────────────────────────────────────────────────
 * - inquiries.sender_hidden_at 을 now() 로 UPDATE.
 * - 운영진 측에는 영향 없음 (스레드 자체는 DB에 그대로 유지됨).
 * - 다음 getMyInquiries() 호출 시 sender_hidden_at IS NULL 필터로 자동 제외.
 *
 * ── 보안 (Defense in Depth) ──────────────────────────────────────────────────
 * 1. getClaims() 로 인증 확인 → 미인증 시 early return.
 * 2. RLS(inquiries_update_sender): sender_user_id = auth.uid() 조건으로
 *    본인 스레드만 UPDATE 가능. 타인의 스레드를 숨기는 것 불가.
 * 3. .eq("sender_user_id", uid) 로 RLS 와 이중 방어.
 *
 * ── 캐시 갱신 ────────────────────────────────────────────────────────────────
 * revalidatePath("/messages") 로 목록 페이지를 재검증한다.
 * client 이벤트 핸들러(스와이프 액션 탭)에서 호출되므로 레더 중 revalidate 금지 규칙에
 * 해당하지 않는다.
 *
 * @param inquiryId - 숨길 inquiry UUID
 * @returns { ok: true } | { ok: false; error: string }
 */
export async function hideInquiry(
  inquiryId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  // ── Supabase 클라이언트 생성 (Fluid compute 대응: 매번 새로 생성) ──────────
  const supabase = await createClient();

  // ── 인증 확인 ─────────────────────────────────────────────────────────────
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) {
    return { ok: false, error: "認証が必要です" };
  }

  const uid = claimsData.claims.sub as string;

  // ── inquiries UPDATE: sender_hidden_at = now() ────────────────────────────
  // RLS(inquiries_update_sender) + sender_user_id 필터 이중 방어
  const { error } = await supabase
    .from("inquiries")
    .update({ sender_hidden_at: new Date().toISOString() })
    .eq("id", inquiryId)
    // RLS 와 이중 방어: 본인 스레드만 대상
    .eq("sender_user_id", uid);

  if (error) {
    console.error("[hideInquiry] update error:", error.message);
    return { ok: false, error: "削除に失敗しました。もう一度お試しください。" };
  }

  // ── 목록 페이지 재검증 ────────────────────────────────────────────────────
  // client 이벤트 핸들러에서 호출이므로 레더 중 revalidate 금지 규칙 비해당.
  revalidatePath("/messages");

  return { ok: true };
}

// ══════════════════════════════════════════════════════════════════════════════
//  markInquiryMessagesRead — スレッド進入時の自動既読処理
// ══════════════════════════════════════════════════════════════════════════════

/**
 * 指定スレッドの未読メッセージ(circle_staff 発信分)を is_read_by_recipient=true に更新する.
 *
 * ── 冪等性 ─────────────────────────────────────────────────────────────────
 * .eq("is_read_by_recipient", false) フィルターにより、再進入時の無駄な書き込みを防ぐ.
 *
 * ── RLS ────────────────────────────────────────────────────────────────────
 * inquiry_messages_update_read 정책:
 *   sender_user_id <> auth.uid() (本人送信分は更新不可)
 *   + inquiry 参加者(発信者 or 運営)のみ UPDATE 許可.
 *   → マイグレーション追加不要.
 *
 * ── 呼び出し元 ─────────────────────────────────────────────────────────────
 * components/dm/dm-thread.tsx — スレッド client マウント時 effect で 1 回呼ぶ.
 * (Server Component レンダー中に呼ぶと revalidate 制約に抵触するため client へ移動)
 *
 * @param inquiryId - 既読にする inquiry UUID
 */
export async function markInquiryMessagesRead(inquiryId: string): Promise<void> {
  // ── Supabase クライアント生成 (Fluid compute 対応: 毎回新規生成) ─────────
  const supabase = await createClient();

  // ── 認証確認 (未認証なら no-op) ────────────────────────────────────────
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) {
    // 未認証ユーザーは読み取りなし → 何もしない
    return;
  }

  const uid = claimsData.claims.sub as string;

  // ── inquiry_messages UPDATE ─────────────────────────────────────────────
  // circle_staff 発信 + 未読 メッセージを一括既読.
  // RLS が本人受信分(sender_user_id <> auth.uid())のみ UPDATE を許可する.
  // sender_role フィルターを追加することで更新対象を明示的に絞り込む.
  const { error } = await supabase
    .from("inquiry_messages")
    .update({ is_read_by_recipient: true })
    .eq("inquiry_id", inquiryId)
    // 本人が送ったメッセージは更新しない (RLS と二重防御)
    .neq("sender_user_id", uid)
    // circle_staff 発信分のみ対象 (inquirer 側の既読管理はしない)
    .eq("sender_role", "circle_staff")
    // 未読のみ更新 (冪等: 再進入時に無駄な書き込みを防ぐ)
    .eq("is_read_by_recipient", false);

  if (error) {
    // 失敗しても画面には影響なし。次回進入時に再試行される
    console.error("[markInquiryMessagesRead] update error:", error.message);
    return;
  }

  // revalidatePath は呼ばない(client effect から呼ばれるため、かつレンダー中 revalidate 禁止).
  // ヘッダーバッジは呼び出し元(dm-thread)が kc:dm-read イベントを発火して即時更新する.
}

// ══════════════════════════════════════════════════════════════════════════════
//  getMyUnreadInquiriesTotal — ヘッダーバッジ用 未読合計
// ══════════════════════════════════════════════════════════════════════════════

/**
 * 現在ログインしているユーザーの全 DM スレッドの未読件数合計を返す.
 *
 * ── 実装 ─────────────────────────────────────────────────────────────────────
 * getMyInquiries() を再利用し、unread_count を reduce で合算する.
 * N+1 なし(getMyInquiries がまとめて取得済み).
 *
 * ── 未認証・エラー ────────────────────────────────────────────────────────────
 * 未認証: getClaims() が null → 0 を返す.
 * 取得エラー: catch で 0 に fallback (バッジ非表示).
 *
 * ── 呼び出し元 ─────────────────────────────────────────────────────────────
 * components/layout/messages-link.tsx — 60秒ポーリング + マウント時 1 回.
 *
 * @returns 未読件数合計 (0 以上の整数)
 */
export async function getMyUnreadInquiriesTotal(): Promise<number> {
  try {
    // ── Supabase クライアント生成 (Fluid compute 対応: 毎回新規生成) ───────
    const supabase = await createClient();

    // ── 認証確認 (未認証なら 0 を返す) ────────────────────────────────────
    const { data: claimsData } = await supabase.auth.getClaims();
    if (!claimsData?.claims) {
      // 未認証: ヘッダーアイコンは表示するがバッジは 0
      return 0;
    }

    // ── 全スレッドの未読件数を取得・合算 ─────────────────────────────────
    const inquiries = await getMyInquiries();
    return inquiries.reduce((sum, item) => sum + item.unread_count, 0);
  } catch {
    // 何らかのエラー時はバッジを非表示(0 = バッジなし)
    return 0;
  }
}
