import { Suspense } from "react";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Construction, ExternalLink } from "lucide-react";

import { CircleActions } from "@/components/circles/circle-actions";
import { CircleGallery } from "@/components/circles/circle-gallery";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ACTIVITY_FREQUENCY_LABELS } from "@/lib/constants/activity-frequency";
import { CATEGORY_LABELS } from "@/lib/constants/category";
import { OFFICIAL_TYPE_LABELS } from "@/lib/constants/official-type";
import { getCircleById } from "@/lib/dummy/circles";
import type { CircleDetail } from "@/lib/types/domain";

interface CircleDetailPageProps {
  params: Promise<{ id: string }>;
}

// 서클 상세 페이지 (RSC) — Phase 1.1 T-012 본 디자인
// dynamic params Promise → cacheComponents 모드 호환을 위해 본문 전체 Suspense 래핑 (T-011 패턴)
// pb-24 로 T-013 의 하단 액션 바 자리 미리 확보. BottomNav 는 정규식으로 자동 hidden.
export default function CircleDetailPage({ params }: CircleDetailPageProps) {
  return (
    <main className="pb-24 md:pb-12">
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
      <CoverImage circle={circle} />

      <div className="container mx-auto max-w-6xl space-y-6 px-4">
        <Header circle={circle} />
        <SummaryGrid circle={circle} />
        <Description text={circle.description} />
        <CircleGallery images={circle.images} circleName={circle.name} />
        <ContactSection circle={circle} />
      </div>

      {/* 모바일 하단 고정 액션 바 — md 이상에서 hidden */}
      <CircleActions circle={circle} layout="mobile" />
    </article>
  );
}

// 커버 이미지 — 모바일 16:9, 데스크탑 21:9 와이드. priority 로 LCP 개선
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
    </div>
  );
}

// 헤더 — 카테고리/official_type 뱃지 + 서클명 + 태그 칩 + 데스크탑 inline 액션 (T-013c)
function Header({ circle }: { circle: CircleDetail }) {
  return (
    <header className="space-y-3">
      {/* 뱃지 행 + 데스크탑 inline 액션 (md 이상에서 표시) */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{CATEGORY_LABELS[circle.category]}</Badge>
          <Badge variant="outline">{OFFICIAL_TYPE_LABELS[circle.official_type]}</Badge>
        </div>
        {/* 데스크탑 전용 inline 액션 바 — 모바일에서는 hidden */}
        <CircleActions circle={circle} layout="desktop" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{circle.name}</h1>
      {circle.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {circle.tags.slice(0, 5).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs font-normal">
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </header>
  );
}

// 요약 카드 5종 — 활동빈도/연회비/활동요일/회원수/신입생비율
function SummaryGrid({ circle }: { circle: CircleDetail }) {
  const items: { label: string; value: string }[] = [
    {
      label: "活動頻度",
      value: ACTIVITY_FREQUENCY_LABELS[circle.activity_frequency],
    },
    {
      label: "年会費",
      value:
        circle.annual_fee_yen === 0 ? "無料" : `${circle.annual_fee_yen.toLocaleString("ja-JP")}円`,
    },
    { label: "活動曜日", value: circle.activity_days },
    { label: "会員数", value: `${circle.member_count}名` },
    { label: "新入生比率", value: `${circle.freshmen_ratio}%` },
  ];

  return (
    <dl className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="rounded-md border p-3">
          <dt className="text-muted-foreground text-xs">{item.label}</dt>
          <dd className="text-sm font-semibold">{item.value}</dd>
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

// 연락처 — Instagram/X/LINE inline 버튼 (T-014 이후 「参加する」 모달로 교체)
function ContactSection({ circle }: { circle: CircleDetail }) {
  const channels: { label: string; url: string }[] = [];
  if (circle.contact_instagram)
    channels.push({ label: "Instagram", url: circle.contact_instagram });
  if (circle.contact_x) channels.push({ label: "X (Twitter)", url: circle.contact_x });
  if (circle.contact_line) channels.push({ label: "LINE", url: circle.contact_line });

  if (channels.length === 0) return null;

  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">連絡先</h2>
      <div className="flex flex-wrap gap-2">
        {channels.map((c) => (
          <Button key={c.label} asChild variant="outline" size="sm">
            <a href={c.url} target="_blank" rel="noopener noreferrer">
              {c.label}
              <ExternalLink className="ml-1 size-3" />
            </a>
          </Button>
        ))}
      </div>
    </section>
  );
}

// Suspense fallback — 커버 + 헤더 + 요약 + 갤러리 영역 skeleton
function DetailFallback() {
  return (
    <article className="space-y-6">
      <Skeleton className="aspect-[16/9] w-full md:aspect-[21/9]" />
      <div className="container mx-auto max-w-6xl space-y-6 px-4">
        <div className="space-y-3">
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-16" />
          </div>
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-5 w-1/3" />
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
        <Skeleton className="h-20 w-full" />
        <div className="hidden gap-2 md:grid md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[16/9] w-full" />
          ))}
        </div>
      </div>
    </article>
  );
}
