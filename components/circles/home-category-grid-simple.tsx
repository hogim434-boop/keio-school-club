import Link from "next/link";

import { Emoji, type EmojiName } from "@/components/ui/emoji";
import { CATEGORIES, CATEGORY_LABELS, type Category } from "@/lib/constants/category";

/**
 * カテゴリ → Fluent 3D Emoji マッピング (ホームグリッド 8種).
 * home-category-grid.tsx と同一マッピング (CirclesSlideOutContext なし版).
 */
const CATEGORY_EMOJIS: Record<Category, EmojiName> = {
  sports: "trophy",
  culture_art: "artist-palette",
  music: "musical-notes",
  academic: "books",
  international: "globe",
  event: "party-popper",
  volunteer: "handshake",
  media: "clapper-board",
};

/**
 * ホームカテゴリグリッド — シンプル版 (RSC).
 *
 * home-category-grid.tsx (CirclesPageShell / useContext 依存版) との違い:
 * - CirclesSlideOutContext · useContext 不使用 → 純粋な RSC
 * - クリック時は通常の Link 遷移 (/circles?category={slug})
 * - ホームページ (app/(tabs)/page.tsx) 専用
 *   → /circles ページは引き続き CirclesPageShell でラップされた
 *     home-category-grid.tsx (スライドアウト版) を使用
 *
 * CirclesPageShell を使わない理由:
 *   CirclesPageShell 内部で useSearchParams() を呼ぶため、
 *   Suspense で包まずに静的プリレンダリングするとビルドエラーになる。
 */
export function HomeCategoryGrid() {
  return (
    <section
      className="space-y-3"
      aria-label="カテゴリから探す"
      data-coachmark="category"
    >
      <h2 className="text-base font-semibold">カテゴリ</h2>
      <ul className="grid grid-cols-4 gap-2 sm:gap-3">
        {CATEGORIES.map((category) => (
          <li key={category} className="flex">
            <Link
              href={`/circles?category=${category}`}
              aria-label={`${CATEGORY_LABELS[category]}のサークル・部活動を見る`}
              className="group focus-visible:ring-ring flex min-h-[88px] w-full flex-col items-center justify-start gap-2 rounded-lg p-2 transition-colors focus-visible:ring-2 focus-visible:outline-none sm:min-h-[96px] sm:p-3"
            >
              <div className="bg-muted group-hover:bg-muted/70 flex size-12 shrink-0 items-center justify-center rounded-full transition-all sm:size-14">
                <Emoji name={CATEGORY_EMOJIS[category]} size={28} />
              </div>
              <span className="text-foreground w-full text-center text-xs leading-tight font-medium">
                {CATEGORY_LABELS[category]}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
