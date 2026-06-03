import { Skeleton } from "@/components/ui/skeleton";

/**
 * /messages ルート進入時に即座に表示されるスケルトン UI.
 *
 * ── レイアウト同期 ────────────────────────────────────────────────────────────
 * MessageRow と同じ構造にすることで、ローディング→実コンテンツ切替時の
 * レイアウトシフト(CLS)を防ぐ.
 *
 * 構造:
 * - ページヘッダー (タイトル + サブテキスト)
 * - 行スケルトン × 6 (アバター size-12 + 上段 + 下段 + インセット区切り線)
 *
 * アバターは size-12 (48px) 円形. 内容行は ml-[60px] から開始
 * (アバター 48px + gap 12px = 60px) — MessageRow の実レイアウトと一致.
 */
export default function MessagesLoading() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-6">
      {/* ── ページヘッダー ── */}
      <div className="mb-4 space-y-1.5">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-4 w-44" />
      </div>

      {/* ── 行スケルトン × 6 ── */}
      <div className="-mx-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="relative px-4 py-3">
            <div className="flex items-center gap-3">
              {/* アバター円 size-12 = 48px */}
              <Skeleton className="size-12 shrink-0 rounded-full" />

              {/* 本文 */}
              <div className="min-w-0 flex-1 space-y-2">
                {/* 上段: サークル名 + タイムスタンプ */}
                <div className="flex items-center justify-between gap-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-10" />
                </div>
                {/* 下段: メッセージプレビュー */}
                <Skeleton className="h-3.5 w-3/4" />
              </div>
            </div>

            {/* インセット区切り線 (ml-[72px] = アバター48px + gap12px + px4 余白) */}
            <div className="border-border/60 absolute right-4 bottom-0 left-[88px] border-b" />
          </div>
        ))}
      </div>
    </div>
  );
}
