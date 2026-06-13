import { Suspense } from "react";

import { HomeCategoryGrid } from "@/components/circles/home-category-grid-simple";
import { HomeSearchBar } from "@/components/circles/home-search-bar";
import { HorizontalCircleStrip } from "@/components/circles/horizontal-circle-strip";
import { HourlyCategoryStrip } from "@/components/circles/hourly-category-strip";
import { NewCirclesStrip } from "@/components/circles/new-circles-strip";
import { PromoTileCarousel } from "@/components/circles/promo-tile-carousel";
import { HomeCoachmark } from "@/components/onboarding/home-coachmark";
import { UpcomingEventsStrip } from "@/components/home/upcoming-events-strip";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getFeaturedCircles,
  getUpcomingEvents,
  getRecommendedCircles,
  isShinkanSeason,
} from "@/lib/supabase/queries/home-curation";
import { getNewCircles } from "@/lib/supabase/queries/circles";
import { PUBLIC_EVENTS_ENABLED } from "@/lib/constants/features";
import { getCurrentRecruitingStatuses } from "@/lib/constants/recruitment-status";

/**
 * ホーム画面 (RSC) — T-009 キュレーション 3セクション.
 *
 * セクション構成:
 *   1. 今週新歓キュレーション — シーズン判定 (4·5·10·11月) で活性/非活性
 *   2. 直近のイベント 3件 — starts_at ASC, public, 未キャンセル
 *   3. おすすめサークル — シンプルカテゴリグリッド + 人気順
 *
 * パターン:
 *   - Server Component のみ (state なし, 'use client' なし)
 *   - 各セクションを Suspense で包み、スケルトン fallback で段階表示
 *   - anon クライアント + unstable_cache (revalidate 300s) で公開データキャッシュ
 *
 * ホームは CirclesPageShell を使用しない。
 * CirclesPageShell 内部の useSearchParams() が Suspense なしで呼ばれると
 * Next.js 静的プリレンダリング時にビルドエラーが発生するため。
 * カテゴリグリッドは Link ベースのシンプル版 (home-category-grid-simple) を使用。
 */
export default function HomePage() {
  return (
    <main className="pb-20 md:pb-12">
      {/* 각 섹션은 Suspense로 독립적으로 스트리밍. 하나가 느려도 다른 섹션은 즉시 표시. */}
      <Suspense fallback={<HomePageFallback />}>
        <HomeContent />
      </Suspense>
    </main>
  );
}

/**
 * ホームコンテンツ本体 (async RSC).
 *
 * Promise.all で 3 クエリを並列実行して初期表示を高速化.
 * isShinkanSeason() はサーバーサイドで評価され、シーズン判定の差異なく
 * ビルド時ではなくリクエスト時に実行される (cacheComponents OFF のため毎回最新).
 */
async function HomeContent() {
  const inSeason = isShinkanSeason();

  // 이벤트 쿼리는 PUBLIC_EVENTS_ENABLED=true 일 때만 실행 (false 이면 빈 배열로 대체)
  // → 디렉터리 우선 단계에서 불필요한 DB 왕복 제거
  const [featured, upcomingEvents, recommended, newCircles] = await Promise.all([
    getFeaturedCircles(8),
    PUBLIC_EVENTS_ENABLED ? getUpcomingEvents(3) : Promise.resolve([]),
    getRecommendedCircles(6),
    getNewCircles(8),
  ]);

  return (
    <div className="container mx-auto max-w-6xl space-y-8 px-4 py-6">
      {/* 検索バー — /search へのリンク型 (実入力なし) */}
      <HomeSearchBar />

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          プロモーションタイル キャロセル (検索バー直下に配置)
          シャッフル / お気に入り / カテゴリ検索 の 3タイル自動回転
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <PromoTileCarousel />

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          カテゴリグリッド (最上部へ移動)
          カテゴリ → /circles?category={slug} へスライドイン遷移
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <HomeCategoryGrid />

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          セクション 1: 今週新歓キュレーション
          シーズン中 (4·5·10·11月): 募集中サークルを強調表示
          シーズン外: 通年募集サークルのみ (セクションは表示維持)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {featured.length > 0 && (
        <HorizontalCircleStrip
          title={inSeason ? "今週の新歓サークル" : "募集中のサークル・部活動"}
          circles={featured}
          // 시기별 모집 상태로 필터 — 평시: 募集中(year_round)만 / 新歓시즌: 新歓+募集中
          seeMoreHref={`/circles?recruit=${getCurrentRecruitingStatuses().join(",")}`}
          layout="carousel"
          markRecruiting
        />
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          セクション 3: 時間帯カテゴリ (T-009 前の構造に復元)
          Math.floor(Date.now() / 3_600_000) で1時間ごとに表示カテゴリが順環する
          async RSC — 親 Suspense が処理
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <HourlyCategoryStrip />

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          直近のイベント (中間配置)
          PUBLIC_EVENTS_ENABLED=false の間は非表示 (디렉터리 우선 단계).
          true に変えると即復活する.
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {PUBLIC_EVENTS_ENABLED && <UpcomingEventsStrip events={upcomingEvents} />}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          おすすめサークル
          view_count 降順 (Phase 2 でパーソナライズ予定)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {recommended.length > 0 && (
        <HorizontalCircleStrip
          title="おすすめのサークル・部活動"
          circles={recommended}
          seeMoreHref="/circles"
          layout="carousel"
        />
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          新着のサークル・部活動 (홈 최하단)
          created_at 최신순 — 큰 16:9 커버 카드 가로 캐러셀 + NEW 배지
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {newCircles.length > 0 && (
        <NewCirclesStrip
          title="新着のサークル・部活動"
          circles={newCircles}
          seeMoreHref="/circles?sort=recent"
        />
      )}

      {/* オンボーディングコーチマーク — 初回訪問時のみ自動表示 (localStorage で記憶) */}
      <HomeCoachmark />
    </div>
  );
}

/**
 * ホームページ全体の Suspense fallback.
 * HomeContent の 3クエリが完了するまで表示するスケルトン.
 */
function HomePageFallback() {
  return (
    <div className="container mx-auto max-w-6xl space-y-8 px-4 py-6">
      {/* 検索バー skeleton */}
      <Skeleton className="h-12 w-full rounded-xl" />

      {/* PromoTile skeleton (検索바 직하 배치) */}
      <Skeleton className="h-20 w-full rounded-2xl" />

      {/* カテゴリグリッド skeleton (最上部へ移動) */}
      <div className="space-y-3">
        <Skeleton className="h-5 w-24" />
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-[88px] rounded-lg" />
          ))}
        </div>
      </div>

      {/* 新歓セクション skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-6 w-40" />
        <div className="flex gap-4">
          <Skeleton className="h-24 w-[88%] shrink-0 rounded-lg" />
        </div>
      </div>

      {/* 時間帯カテゴリ skeleton (横スクロール chip) */}
      <div className="space-y-3">
        <Skeleton className="h-5 w-32" />
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-24 shrink-0 rounded-full" />
          ))}
        </div>
      </div>

      {/* イベントセクション skeleton — PUBLIC_EVENTS_ENABLED=true のときのみ表示 */}
      {PUBLIC_EVENTS_ENABLED && (
        <div className="space-y-2">
          <Skeleton className="h-6 w-36" />
          <div className="divide-y rounded-xl border">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-start gap-3 p-3">
                <Skeleton className="size-16 shrink-0 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* おすすめセクション skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-6 w-48" />
        <div className="flex gap-4">
          <Skeleton className="h-24 w-[88%] shrink-0 rounded-lg" />
        </div>
      </div>

      {/* 新着セクション skeleton — 큰 16:9 커버 카드 가로 레일 */}
      <div className="space-y-3">
        <Skeleton className="h-6 w-40" />
        <div className="flex gap-4">
          <Skeleton className="aspect-[16/9] w-[72%] shrink-0 rounded-lg" />
          <Skeleton className="aspect-[16/9] w-[72%] shrink-0 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
