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
    slug: (row.slug as string) ?? undefined,
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
 * 정렬: newcomer_only 우선 → 1시간마다 랜덤 회전(hour 시드 셔플)
 * 캐시: 5분 TTL, tags:["circles:public"] (단, hourSeed 인자별로 매시간 새 항목)
 */

/**
 * seededShuffle — 시드 기반 결정적 Fisher-Yates 셔플.
 *
 * 같은 시드면 항상 같은 순서를 반환(결정적)하되, 시드가 바뀌면 순서가 달라진다.
 * 홈 「募集中」 섹션을 1시간마다 회전시키기 위해 hour 값을 시드로 넘긴다.
 * (mulberry32 PRNG — 작고 빠르며 시드 분포가 균일)
 */
function seededShuffle<T>(arr: T[], seed: number): T[] {
  let a = seed >>> 0;
  const rand = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export const getFeaturedCircles = unstable_cache(
  // hourSeed: 호출측에서 Math.floor(Date.now()/3_600_000) 를 넘긴다.
  //   → unstable_cache 가 인자별로 캐시하므로 매시간 새 항목으로 갱신(시간당 1회 DB 조회).
  //   기본값 0: 시드 미전달 호출 호환(고정 셔플).
  async (limit = 8, hourSeed = 0): Promise<CircleSummary[]> => {
    const supabase = createAnonClient();

    // 시즌 판별 — 시즌 중이면 newcomer_only 포함
    const inSeason = isShinkanSeason();
    const recruitStatuses: RecruitmentStatus[] = inSeason
      ? ["newcomer_only", "year_round"]
      : ["year_round"];

    // 회전 풀을 넉넉히 취득(최대 100) — 이 풀 안에서 매시간 다른 8개를 뽑는다.
    const { data, error } = await supabase
      .from("circles")
      .select("*, circle_tags(tags(slug))")
      .eq("status", "approved")
      .in("recruitment_status", recruitStatuses)
      .order("view_count", { ascending: false })
      .limit(100);

    if (error) {
      console.error("[getFeaturedCircles]", error.message);
      return [];
    }

    const pool = (data ?? []).map((row) => toCircleSummary(row as Record<string, unknown>));

    // 우선순위 그룹(newcomer_only / 그 외)을 분리해 각 그룹을 hour 시드로 셔플 후 결합.
    // → 매시간 노출 순서가 바뀌면서도, 新歓 시즌엔 newcomer_only 가 앞에 유지된다.
    const newcomers = seededShuffle(
      pool.filter((c) => c.recruitment_status === "newcomer_only"),
      hourSeed
    );
    const yearRound = seededShuffle(
      pool.filter((c) => c.recruitment_status !== "newcomer_only"),
      hourSeed + 1
    );

    return [...newcomers, ...yearRound].slice(0, limit);
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
  /** 主催サークル ID — 詳細ページリンク用 (slug 없을 때 fallback) */
  circle_id: string;
  /** 主催サークル slug — 詳細ページの「예쁜 URL」用 (circles JOIN). 없으면 circle_id 로 fallback */
  circle_slug: string | null;
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
        "id, title, description, starts_at, ends_at, location, cover_image_url, is_all_day, circle_id, circles(name, slug)"
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
      const circle = r.circles as { name: string; slug: string | null } | null;
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
        circle_slug: circle?.slug ?? null,
      };
    });
  },
  ["home-curation", "upcoming-events"],
  { revalidate: 300, tags: ["events:public"] }
);

/**
 * 승인된 동아리 총 수 취득 — 히어로 섹션 카운트 표시용.
 *
 * head:true + count:"exact" 로 rows 전송 없이 COUNT(*) 만 반환 → 최경량.
 * 캐시: 5분 TTL, tags:["circles:public"]
 */
export const getApprovedCircleCount = unstable_cache(
  async (): Promise<number> => {
    const supabase = createAnonClient();

    const { count, error } = await supabase
      .from("circles")
      .select("*", { count: "exact", head: true })
      .eq("status", "approved");

    if (error) {
      console.error("[getApprovedCircleCount]", error.message);
      return 0;
    }

    return count ?? 0;
  },
  ["home-curation", "approved-count"],
  { revalidate: 300, tags: ["circles:public"] }
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
