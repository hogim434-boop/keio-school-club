/**
 * lib/supabase/queries/home-curation.ts
 *
 * ホーム画面のキュレーション専用 fetch 関数群 (T-009).
 * circles.ts とは別ファイルに分離し、Wave 1 並列作業での競合を回避する。
 *
 * 3つの公開関数:
 *   - getFeaturedCircles(limit)   : 今週新歓キュレーション (신환 시즌 활성)
 *   - getUpcomingEvents(limit)    : 直近のイベント (starts_at ASC, 公開・未キャンセル)
 *   - getRecommendedCircles(limit): おすすめサークル (인기순 단순 룰 기반)
 *
 * キャッシュ戦略:
 *   - createAnonClient() 使用: unstable_cache 内で cookies() 呼び出し禁止のため
 *   - tags: ["circles:public"] / ["events:public"]
 *   - revalidate: 300 (5 分)
 *
 * 注意:
 *   - Fluid compute 原則: 関数内で毎回新規生成 (グローバル変数禁止)
 *   - シーズン判定は月ベースの単純ロジック (Phase 3 で cron 自動化予定)
 */

import { unstable_cache } from "next/cache";

import { createAnonClient } from "@/lib/supabase/anon";
import type { CircleSummary } from "@/lib/types/domain";
import type { RecruitmentStatus } from "@/lib/constants/recruitment-status";

// ============================================================
// シーズン判定ヘルパー
// ============================================================

/**
 * 新歓シーズン判定 — 4・5・10・11 月が活性.
 *
 * 春新歓: 4〜5月 / 秋新歓: 10〜11月
 * Phase 3 で cron + DB フラグに格上げ予定.
 */
export function isShinkanSeason(now: Date = new Date()): boolean {
  const m = now.getMonth() + 1; // 1〜12
  return [4, 5, 10, 11].includes(m);
}

// ============================================================
// 내부 매핑 헬퍼
// ============================================================

/** Supabase JOIN 결과 행 → CircleSummary 변환 (home-curation 전용 경량판) */
function toCircleSummary(row: Record<string, unknown>): CircleSummary {
  // circle_tags JOIN → [{tags: {slug: 'x'}}, ...] → string[]
  const tagRows = (row.circle_tags as { tags: { slug: string } | null }[] | null) ?? [];
  const tags = tagRows.map((ct) => ct.tags?.slug).filter((s): s is string => Boolean(s));

  return {
    id: row.id as string,
    name: row.name as string,
    category: row.category as CircleSummary["category"],
    official_type: row.official_type as CircleSummary["official_type"],
    activity_frequency: row.activity_frequency as CircleSummary["activity_frequency"],
    cover_image_url: (row.cover_image_url as string | null) ?? null,
    view_count: (row.view_count as number) ?? 0,
    inquiry_count: (row.inquiry_count as number) ?? 0,
    tags,
    description: (row.description as string) ?? "",
    recruitment_status: (row.recruitment_status as RecruitmentStatus | null) ?? null,
  };
}

// ============================================================
// 公開 fetch 関数
// ============================================================

/**
 * 今週新歓キュレーション — 신환 시즌(4·5·10·11월) 활성 모집 중 동아리.
 *
 * 시즌 중: newcomer_only + year_round (両方)
 * 시즌 외: year_round のみ (通年募集)
 *
 * 정렬: newcomer_only 우선 → view_count 내림차순
 * 캐시: 5분 TTL, tags:["circles:public"]
 */
export const getFeaturedCircles = unstable_cache(
  async (limit = 8): Promise<CircleSummary[]> => {
    const supabase = createAnonClient();

    // 시즌 판별 — 시즌 중이면 newcomer_only 포함
    const inSeason = isShinkanSeason();
    const recruitStatuses: RecruitmentStatus[] = inSeason
      ? ["newcomer_only", "year_round"]
      : ["year_round"];

    const { data, error } = await supabase
      .from("circles")
      .select("*, circle_tags(tags(slug))")
      .eq("status", "approved")
      .in("recruitment_status", recruitStatuses)
      .order("view_count", { ascending: false })
      .limit(24); // 정렬 후 slice하기 위해 여유 있게 취득

    if (error) {
      console.error("[getFeaturedCircles]", error.message);
      return [];
    }

    // newcomer_only를 year_round보다 앞에 배치 (신환 시즌 긴급도 반영)
    const priority: Record<string, number> = { newcomer_only: 0, year_round: 1 };
    return (data ?? [])
      .map((row) => toCircleSummary(row as Record<string, unknown>))
      .sort(
        (a, b) =>
          (priority[a.recruitment_status ?? "year_round"] ?? 1) -
          (priority[b.recruitment_status ?? "year_round"] ?? 1)
      )
      .slice(0, limit);
  },
  ["home-curation", "featured"],
  { revalidate: 300, tags: ["circles:public"] }
);

// ============================================================
// イベントの型定義
// ============================================================

/**
 * ホーム表示用イベント要約型.
 * events テーブルの必要最低限フィールド + circle 名称 (JOIN).
 */
export type UpcomingEvent = {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  cover_image_url: string | null;
  is_all_day: boolean;
  /** 主催サークル名 — circles JOIN */
  circle_name: string;
  /** 主催サークル ID — 詳細ページリンク用 */
  circle_id: string;
};

/**
 * 直近のイベント取得 — ホーム「今後のイベント」セクション.
 *
 * 条件: starts_at > now() AND visibility = 'public' AND cancelled_at IS NULL
 * 정렬: starts_at ASC (가장 가까운 순서)
 * 캐시: 5분 TTL, tags:["events:public"]
 *
 * @param limit 취득 건수 (기본 3건)
 */
export const getUpcomingEvents = unstable_cache(
  async (limit = 3): Promise<UpcomingEvent[]> => {
    const supabase = createAnonClient();

    const { data, error } = await supabase
      .from("events")
      .select(
        "id, title, description, starts_at, ends_at, location, cover_image_url, is_all_day, circle_id, circles(name)"
      )
      .gt("starts_at", new Date().toISOString())
      .eq("visibility", "public")
      .is("cancelled_at", null)
      .order("starts_at", { ascending: true })
      .limit(limit);

    if (error) {
      console.error("[getUpcomingEvents]", error.message);
      return [];
    }

    return (data ?? []).map((row) => {
      const r = row as Record<string, unknown>;
      // circles JOIN は to-one FK なので単一オブジェクト
      const circle = r.circles as { name: string } | null;
      return {
        id: r.id as string,
        title: r.title as string,
        description: (r.description as string | null) ?? null,
        starts_at: r.starts_at as string,
        ends_at: (r.ends_at as string | null) ?? null,
        location: (r.location as string | null) ?? null,
        cover_image_url: (r.cover_image_url as string | null) ?? null,
        is_all_day: Boolean(r.is_all_day),
        circle_name: circle?.name ?? "",
        circle_id: r.circle_id as string,
      };
    });
  },
  ["home-curation", "upcoming-events"],
  { revalidate: 300, tags: ["events:public"] }
);

/**
 * おすすめサークル取得 — ホーム「おすすめ」セクション.
 *
 * Phase 1: view_count 降順の単純ルールベース.
 * Phase 2: ユーザーのカテゴリ閲覧履歴・タグ嗜好を加味したパーソナライズに格上げ予定.
 *
 * 「今週新歓」との重複を避けるため not_recruiting を含む全モジュールから取得.
 * 캐시: 5분 TTL, tags:["circles:public"]
 *
 * @param limit 取得件数 (デフォルト 6件)
 */
export const getRecommendedCircles = unstable_cache(
  async (limit = 6): Promise<CircleSummary[]> => {
    const supabase = createAnonClient();

    const { data, error } = await supabase
      .from("circles")
      .select("*, circle_tags(tags(slug))")
      .eq("status", "approved")
      .order("view_count", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[getRecommendedCircles]", error.message);
      return [];
    }

    return (data ?? []).map((row) => toCircleSummary(row as Record<string, unknown>));
  },
  ["home-curation", "recommended"],
  { revalidate: 300, tags: ["circles:public"] }
);
