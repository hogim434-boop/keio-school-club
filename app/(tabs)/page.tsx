import { Suspense } from "react";

import { PullToRefresh } from "@/components/layout/pull-to-refresh";
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
    // PullToRefresh: 서버 컴포넌트(HomePage) 내부에서 클라이언트 래퍼로 children 전달.
    // overscroll-behavior-y: contain 으로 브라우저 기본 PTR 억제 + 터치 제스처 감지.
    // 레이아웃은 변경 없음 — main 태그가 그대로 children으로 전달됨.
    <PullToRefresh>
      <main className="pb-20 md:pb-12">
        {/* 각 섹션은 Suspense로 독립적으로 스트리밍. 하나가 느려도 다른 섹션은 즉시 표시. */}
        <Suspense fallback={<HomePageFallback />}>
          <HomeContent />
        </Suspense>
      </main>
    </PullToRefresh>
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
          reveal-on-view: 스크롤로 뷰포트 진입 시 fade+slide-up 등장
          (검색바·프로모·카테고리는 초기 화면 노출이므로 제외)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {featured.length > 0 && (
        <div className="reveal-on-view">
          <HorizontalCircleStrip
            title={inSeason ? "今週の新歓サークル" : "募集中のサークル・部活動"}
            circles={featured}
            // 시기별 모집 상태로 필터 — 평시: 募集中(year_round)만 / 新歓시즌: 新歓+募集中
            seeMoreHref={`/circles?recruit=${getCurrentRecruitingStatuses().join(",")}`}
            layout="carousel"
            markRecruiting
          />
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          セクション 3: 時間帯カテゴリ (T-009 前の構造に復元)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="reveal-on-view">
        <HourlyCategoryStrip />
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          直近のイベント (中間配置)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {PUBLIC_EVENTS_ENABLED && (
        <div className="reveal-on-view">
          <UpcomingEventsStrip events={upcomingEvents} />
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          おすすめサークル
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {recommended.length > 0 && (
        <div className="reveal-on-view">
          <HorizontalCircleStrip
            title="おすすめのサークル・部活動"
            circles={recommended}
            // おすすめ = 인기순 큐레이션이므로 「もっと見る」는 인기순 결과 목록으로
            // (필터 없는 "/circles" 는 디스커버 모드 = 홈과 동일 화면이라 부적절)
            seeMoreHref="/circles?sort=popular"
            layout="carousel"
          />
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          新着のサークル・部活動 (홈 최하단)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {newCircles.length > 0 && (
        <div className="reveal-on-view">
          <NewCirclesStrip
            title="新着のサークル・部活動"
            circles={newCircles}
            seeMoreHref="/circles?sort=recent"
          />
        </div>
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

      {/* PromoTile skeleton — 넓은 배너이므로 shimmer 적용 */}
      <Skeleton className="h-20 w-full rounded-2xl" shimmer />

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

      {/* 新着セクション skeleton — 큰 16:9 커버 카드에 shimmer 적용
          aspect-[16/9] 비율 카드는 "큰 커버"에 해당 → shimmer 로 고급감 강조 */}
      <div className="space-y-3">
        <Skeleton className="h-6 w-40" />
        <div className="flex gap-4">
          <Skeleton className="aspect-[16/9] w-[72%] shrink-0 rounded-lg" shimmer />
          <Skeleton className="aspect-[16/9] w-[72%] shrink-0 rounded-lg" shimmer />
        </div>
      </div>
    </div>
  );
}
