import { Suspense } from "react";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Construction } from "lucide-react";

import { CircleActions } from "@/components/circles/circle-actions";
import { CircleDetailTabs } from "@/components/circles/circle-detail-tabs";
import { DetailPageHeader } from "@/components/circles/detail-page-header";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TAG_LABELS } from "@/lib/circles/filter-labels";
import { ACTIVITY_FREQUENCY_LABELS } from "@/lib/constants/activity-frequency";
import { ACTIVITY_TIME_BAND_LABELS } from "@/lib/constants/activity-time-band";
import { CATEGORY_LABELS } from "@/lib/constants/category";
import { getOfficialTypeDisplayLabel } from "@/lib/constants/official-type";
import { RECRUITMENT_STATUS_LABELS } from "@/lib/constants/recruitment-status";
import { getReportsByCircle } from "@/lib/supabase/queries/activity-reports";
import { getCircleById } from "@/lib/supabase/queries/circles";
import { createClient } from "@/lib/supabase/server";
import type { CircleDetail } from "@/lib/types/domain";

interface CircleDetailPageProps {
  params: Promise<{ id: string }>;
}

// 서클 상세 페이지 (RSC) — Phase 1.1 T-012 본 디자인
// dynamic params Promise → cacheComponents 모드 호환을 위해 본문 전체 Suspense 래핑 (T-011 패턴)
// pb-24 / md:pb-28: viewport sticky CTA 자리 확보 (콘텐츠가 CTA 뒤로 가리지 않도록)
// BottomNav 는 정규식으로 자동 hidden.
export default function CircleDetailPage({ params }: CircleDetailPageProps) {
  return (
    <main className="pb-24 md:pb-28">
      <Suspense fallback={<DetailFallback />}>
        <CircleDetailContent params={params} />
      </Suspense>
    </main>
  );
}

async function CircleDetailContent({ params }: CircleDetailPageProps) {
  const { id } = await params;
  const circle = await getCircleById(id);
  if (!circle) notFound();

  /**
   * 활동 리포트 — 최신순 정렬된 전체 목록.
   * 「ホーム」 탭 미리보기 (slice 5건) + 「掲示板」 탭 전체 리스트 둘 다 같은 데이터 source.
   */
  const reports = await getReportsByCircle(circle.id);

  const supabase = await createClient();

  /**
   * fire-and-forget 조회수 증가 RPC — await 하지 않아 렌더 블로킹 없음.
   * 에러 시 콘솔 출력만, UX에 영향 없음.
   */
  supabase.rpc("increment_view_count", { p_circle_id: id }).then(({ error }) => {
    if (error) console.warn("[increment_view_count]", error.message);
  });

  return (
    <article className="space-y-6">
      {/* 1. 커버 이미지 — 모바일 16:9 / 데스크탑 21:9 */}
      <CoverImage circle={circle} />

      <div className="container mx-auto max-w-6xl space-y-6 px-4">
        {/* 2. 헤더 — 뱃지 행 + 서클명 + 태그 칩 (데스크탑 inline 액션 제거됨) */}
        <Header circle={circle} />

        {/*
         * 4. 탭 구조 — Client wrapper (state 관리) + Server Component children (homeContent).
         * 「ホーム」 = SummaryGrid + Description + 活動レポート 미리보기 캐러셀
         * 「掲示板」 = 活動レポート 전체 세로 리스트
         * 「もっと見る」 클릭 시 내부 setTab("board") 으로 자동 전환.
         */}
        <CircleDetailTabs
          circleId={circle.id}
          reports={reports}
          homeContent={
            <>
              <SummaryGrid circle={circle} />
              <Description text={circle.description} />
            </>
          }
        />
      </div>

      {/*
       * 5. lagging spring sticky 액션 — viewport 하단 고정 + 스크롤 velocity 반응.
       * fixed positioning 이라 부모 영향 없음 → 시맨틱상 container 밖, article 의 마지막 자식.
       */}
      <CircleActions circle={circle} />
    </article>
  );
}

// 커버 이미지 — 모바일 16:9, 데스크탑 21:9 와이드. priority 로 LCP 개선
// 메루카리 패턴: 글로벌 헤더 hide + cover 가 viewport 최상단부터 풀-블리드.
// cover 위 absolute overlay 로 DetailPageHeader (뒤로가기·홈·공유) 노출.
function CoverImage({ circle }: { circle: CircleDetail }) {
  return (
    <div className="bg-muted relative aspect-[16/9] w-full md:aspect-[21/9]">
      {circle.cover_image_url ? (
        <Image
          src={circle.cover_image_url}
          alt={circle.name}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      ) : (
        <div className="text-muted-foreground flex h-full w-full items-center justify-center">
          <Construction className="h-12 w-12" />
        </div>
      )}
      {/* 메루카리 패턴 absolute overlay 헤더 — 뒤로가기 슬라이드 아웃 / 홈 / 공유 */}
      <DetailPageHeader circleName={circle.name} />
    </div>
  );
}

// 헤더 — 카테고리/official_type 뱃지 + 서클명 + 태그 칩
// 데스크탑 inline 액션은 제거됨 (데스크탑도 sticky floating pill 로 통일됨)
function Header({ circle }: { circle: CircleDetail }) {
  return (
    <header className="space-y-3">
      {/* 뱃지 행 */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{CATEGORY_LABELS[circle.category]}</Badge>
        {(() => {
          // 体育会 / インカレ 만 표시. 그 외 (公認/非公認/その他) 는 배지 비표시.
          const officialLabel = getOfficialTypeDisplayLabel(circle.official_type);
          return officialLabel ? <Badge variant="outline">{officialLabel}</Badge> : null;
        })()}
      </div>
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{circle.name}</h1>
      {circle.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {circle.tags.slice(0, 5).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs font-normal">
              {TAG_LABELS[tag] ?? tag}
            </Badge>
          ))}
        </div>
      )}
    </header>
  );
}

/**
 * 요약 카드 5종 — 신규 사양 (2026-05)
 *
 * | 순번 | 라벨     | 소스                                                         |
 * |------|----------|--------------------------------------------------------------|
 * | 1    | 募集状況 | recruitment_status (optional, 없으면 「—」)                   |
 * | 2    | 活動頻度 | activity_frequency (기존 유지)                               |
 * | 3    | 活動日   | activity_days (label 만 「活動曜日」→「活動日」 단축)           |
 * | 4    | 活動時間 | activity_time_band 배열 join (optional, 없으면 「—」)         |
 * | 5    | 会員数   | member_count (기존 유지)                                      |
 *
 * 그리드: 모바일 1열 / 데스크탑 3열 (5칸 → 3열 2행, 마지막 칸 비움)
 * 募集状況 카드만 text-keio-navy 강조
 */
function SummaryGrid({ circle }: { circle: CircleDetail }) {
  // 모집 상태 라벨 — optional 필드이므로 없으면 「—」
  const recruitmentLabel = circle.recruitment_status
    ? RECRUITMENT_STATUS_LABELS[circle.recruitment_status]
    : "—";

  // 활동 시간대 라벨 — optional 배열이므로 없거나 빈 배열이면 「—」
  const timeBandLabel =
    circle.activity_time_band && circle.activity_time_band.length > 0
      ? circle.activity_time_band.map((b) => ACTIVITY_TIME_BAND_LABELS[b]).join(" · ")
      : "—";

  const items: { label: string; value: string; emphasis?: boolean }[] = [
    {
      label: "募集状況",
      value: recruitmentLabel,
      emphasis: true, // 募集状況만 keio-navy 강조
    },
    {
      label: "活動頻度",
      value: ACTIVITY_FREQUENCY_LABELS[circle.activity_frequency],
    },
    {
      label: "活動日",
      value: circle.activity_days,
    },
    {
      label: "活動時間",
      value: timeBandLabel,
    },
    {
      label: "会員数",
      value: `${circle.member_count}名`,
    },
  ];

  return (
    <dl className="grid grid-cols-1 gap-3 md:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="rounded-md border p-3">
          <dt className="text-muted-foreground text-xs">{item.label}</dt>
          <dd
            className={
              item.emphasis
                ? "text-keio-navy dark:text-keio-navy/90 text-sm font-semibold"
                : "text-sm font-semibold"
            }
          >
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

// 개요 — 줄바꿈 보존
function Description({ text }: { text: string }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">概要</h2>
      <p className="text-muted-foreground text-sm whitespace-pre-line">{text}</p>
    </section>
  );
}

// Suspense fallback — 커버 + 헤더 + 요약(5종) + 개요 + 갤러리 영역 skeleton
function DetailFallback() {
  return (
    <article className="space-y-6">
      <Skeleton className="aspect-[16/9] w-full md:aspect-[21/9]" />
      <div className="container mx-auto max-w-6xl space-y-6 px-4">
        {/* 헤더 skeleton */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-16" />
          </div>
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-5 w-1/3" />
        </div>
        {/* 탭 네비게이션 skeleton */}
        <div className="flex gap-4 border-b pb-0">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-16" />
        </div>
        {/* 요약 카드 5종 skeleton — 신규 그리드 (md:grid-cols-3) 와 일치 */}
        <div className="grid grid-cols-1 gap-3 pt-6 md:grid-cols-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
        {/* 개요 skeleton */}
        <Skeleton className="h-20 w-full" />
        {/* 活動レポート 미리보기 캐러셀 skeleton — 정사각 카드 4개 */}
        <div className="space-y-3">
          <Skeleton className="h-6 w-32" />
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="w-36 shrink-0 space-y-2 md:w-44">
                <Skeleton className="aspect-square w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}
