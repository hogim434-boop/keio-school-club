import { Suspense } from "react";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Construction } from "lucide-react";

import { CircleActions } from "@/components/circles/circle-actions";
import { CircleGallery } from "@/components/circles/circle-gallery";
import { DetailPageHeader } from "@/components/circles/detail-page-header";
import { ShinkanBanner } from "@/components/circles/shinkan-banner";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TAG_LABELS } from "@/lib/circles/filter-labels";
import { ACTIVITY_FREQUENCY_LABELS } from "@/lib/constants/activity-frequency";
import { ACTIVITY_TIME_BAND_LABELS } from "@/lib/constants/activity-time-band";
import { CATEGORY_LABELS } from "@/lib/constants/category";
import { getOfficialTypeDisplayLabel } from "@/lib/constants/official-type";
import { RECRUITMENT_STATUS_LABELS } from "@/lib/constants/recruitment-status";
import { getCircleById } from "@/lib/dummy/circles";
import type { CircleDetail } from "@/lib/types/domain";

interface CircleDetailPageProps {
  params: Promise<{ id: string }>;
}

// 서클 상세 페이지 (RSC) — Phase 1.1 T-012 본 디자인
// dynamic params Promise → cacheComponents 모드 호환을 위해 본문 전체 Suspense 래핑 (T-011 패턴)
// pb-24: 모바일 하단 sticky 바 자리 확보 / md:pb-28: 데스크탑 floating pill 자리 확보
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

  return (
    <article className="space-y-6">
      {/* 1. 커버 이미지 — 모바일 16:9 / 데스크탑 21:9 */}
      <CoverImage circle={circle} />

      <div className="container mx-auto max-w-6xl space-y-6 px-4">
        {/* 2. 헤더 — 뱃지 행 + 서클명 + 태그 칩 (데스크탑 inline 액션 제거됨) */}
        <Header circle={circle} />

        {/* 3. 新歓 배너 — 오늘 이후 이벤트가 있을 때만 조건부 렌더 */}
        <ShinkanBanner events={circle.shinkan_events} />

        {/* 4. 요약 카드 5종 — 모집상황/활동빈도/활동일/활동시간/회원수 */}
        <SummaryGrid circle={circle} />

        {/* 5. 개요 설명 — 갤러리보다 위에 위치 */}
        <Description text={circle.description} />

        {/* 6. 갤러리 — 개요 아래 */}
        <CircleGallery images={circle.images} circleName={circle.name} />
      </div>

      {/* 7. 하단 sticky 액션 바 — 모바일/데스크탑 모두 fixed bottom */}
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
        {/* 요약 카드 5종 skeleton — 신규 그리드 (md:grid-cols-3) 와 일치 */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
        {/* 개요 skeleton */}
        <Skeleton className="h-20 w-full" />
        {/* 갤러리 skeleton (데스크탑만) */}
        <div className="hidden gap-2 md:grid md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[16/9] w-full" />
          ))}
        </div>
      </div>
    </article>
  );
}
