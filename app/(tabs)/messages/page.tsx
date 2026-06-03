/**
 * app/(tabs)/messages/page.tsx
 *
 * メッセージページ — LINE型トークリスト (SERVER Component).
 *
 * ── アーキテクチャ ─────────────────────────────────────────────────────────────
 * このファイルは Server Component. データ取得・認証ガードを担当し、
 * 個々の行レンダリングは Client Component (MessageRow) に委譲する.
 *
 * MessagesPage (export default, server) ← Suspense 境界
 *   └─ MessagesContent (server async)  ← 認証 + データ取得
 *        └─ MessagesList (client)      ← 行一覧 + スワイプ状態管理
 *             └─ MessageRow (client)   ← 1行 + スワイプアクション
 *
 * ── デザイン ──────────────────────────────────────────────────────────────────
 * LINE / iMessage ベンチマーク.
 * - カード枠なし、全幅行 + インセット区切り線
 * - アバター: size-12 円形、サークル固有色イニシャル (F058)
 * - P0-1: 時刻混合表記 (今日=H:mm, 昨日, 曜日, M月D日)
 * - P0-2: インセット区切り線 (ml-[72px] から border-b)
 * - P0-3: 解決済み opacity-60 + バッジ
 * - P0-4: サークル固有パステルカラー
 * - スワイプ: 左スワイプ → [既読][削除]
 *
 * ── 認証ガード ────────────────────────────────────────────────────────────────
 * getClaims() 未認証 → /auth/login?next=/messages. proxy.ts との二重防衛.
 *
 * ── キャッシュ ────────────────────────────────────────────────────────────────
 * DM は個人データ → unstable_cache 絶対禁止. 毎リクエスト最新値.
 *
 * ── A-5 準拠 ──────────────────────────────────────────────────────────────────
 * 「既読」テキスト表示禁止. 未読数バッジ(数値)のみ.
 *
 * ── F058 準拠 ─────────────────────────────────────────────────────────────────
 * サークルイニシャルのみ. 運営者個人アバター/名前は非表示.
 */

import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { MessageCircle } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getMyInquiries } from "@/lib/supabase/queries/inquiries";

import MessagesList from "@/components/messages/messages-list";
import MessagesLoading from "./loading";

// ── Suspense 境界 ─────────────────────────────────────────────────────────────

export default function MessagesPage() {
  return (
    <Suspense fallback={<MessagesLoading />}>
      <MessagesContent />
    </Suspense>
  );
}

// ── 本体サーバーコンポーネント ─────────────────────────────────────────────────

async function MessagesContent() {
  // ── 認証ガード (Defense in Depth) ─────────────────────────────────────────
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    redirect(`/auth/login?next=${encodeURIComponent("/messages")}`);
  }

  // ── DM スレッド一覧取得 ────────────────────────────────────────────────────
  // RLS: sender_user_id = auth.uid() のみ返却
  // sender_hidden_at IS NULL: 本人がsoft deleteしたスレッドは除外
  const inquiries = await getMyInquiries();

  // ── 空状態 ────────────────────────────────────────────────────────────────
  if (inquiries.length === 0) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-6">
        <div className="mb-5">
          {/* LINE/카톡식 컴팩트 타이틀 — 사무적 부제 제거(깔끔한 메신저 톤) */}
          <h1 className="text-2xl font-bold tracking-tight">メッセージ</h1>
        </div>

        <div className="flex flex-col items-center justify-center py-20 text-center">
          <MessageCircle className="text-muted-foreground/40 mb-4 size-12" aria-hidden />
          <p className="text-muted-foreground text-sm font-medium">まだメッセージがありません</p>
          <p className="text-muted-foreground/70 mt-1 text-xs">
            サークル・部活動に問い合わせると、ここに表示されます
          </p>
          <Link
            href="/search"
            className="bg-primary text-primary-foreground hover:bg-primary/90 mt-6 rounded-md px-4 py-2 text-sm font-medium transition-colors"
          >
            サークル・部活動を探す
          </Link>
        </div>
      </div>
    );
  }

  // ── トークリスト ────────────────────────────────────────────────────────────
  // -mx-4: container 좌우 패딩을 상쇄해 행을 화면 가장자리까지 확장 (LINE 풀폭 행)
  return (
    <div className="container mx-auto max-w-2xl px-4 py-6">
      <div className="mb-5">
        {/* LINE/카톡식 컴팩트 타이틀 — 사무적 부제 제거(깔끔한 메신저 톤) */}
        <h1 className="text-2xl font-bold tracking-tight">メッセージ</h1>
      </div>

      {/* スワイプ対応トークリスト — Client Component に委譲 */}
      <MessagesList items={inquiries} />
    </div>
  );
}
