import { Suspense } from "react";
import Image from "next/image";
import { notFound } from "next/navigation";
import { MapPin } from "lucide-react";

import { ReportPageHeader } from "@/components/circles/report-page-header";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ACTIVITY_REPORT_TYPE_LABELS } from "@/lib/constants/activity-report-type";
import { getActivityReportById } from "@/lib/dummy/activity-reports";
import { getCircleById } from "@/lib/dummy/circles";
import type { ActivityReport } from "@/lib/types/domain";

interface Props {
  params: Promise<{ id: string; reportId: string }>;
}

/**
 * 활동 리포트 상세 페이지 (RSC).
 *
 * URL: /circles/[id]/reports/[reportId]
 *
 * - params 는 Promise — cacheComponents:true + Suspense 래핑 패턴.
 * - circle_id 무결성 검증 — report.circle_id !== id 시 notFound().
 * - ReportTemplate (template.tsx) 이 iOS push 슬라이드 트랜지션 담당.
 */
export default function ActivityReportDetailPage({ params }: Props) {
  return (
    <main className="pb-12">
      <Suspense fallback={<ReportDetailFallback />}>
        <ReportDetailContent params={params} />
      </Suspense>
    </main>
  );
}

async function ReportDetailContent({ params }: Props) {
  const { id, reportId } = await params;

  // circle + report 병렬 fetch
  const [circle, report] = await Promise.all([getCircleById(id), getActivityReportById(reportId)]);

  // 존재하지 않거나 서클-리포트 불일치 시 404
  if (!circle || !report || report.circle_id !== id) notFound();

  const typeLabel = report.activity_type ? ACTIVITY_REPORT_TYPE_LABELS[report.activity_type] : null;
  const formattedDate = formatJpDateLong(report.created_at);

  return (
    <article className="space-y-6">
      {/* 좌상단 floating 뒤로가기 — sticky 헤더 제거 후 floating 버튼만 */}
      <ReportPageHeader />

      <div className="container mx-auto max-w-3xl space-y-6 px-4 pt-16">
        {/* 헤더 섹션 — 활동 종류 배지 + 제목 + 날짜 + 장소 */}
        <header className="space-y-3">
          {/* 메타 행: 활동 종류 배지 + 날짜 */}
          <div className="flex flex-wrap items-center gap-2">
            {typeLabel && <Badge variant="secondary">{typeLabel}</Badge>}
            <time className="text-muted-foreground text-sm" dateTime={report.created_at}>
              {formattedDate}
            </time>
          </div>

          {/* 제목 */}
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{report.title}</h1>

          {/* 활동 장소 — optional */}
          {report.location && (
            <p className="text-muted-foreground inline-flex items-center gap-1 text-sm">
              <MapPin className="size-4 shrink-0" aria-hidden="true" />
              <span>{report.location}</span>
            </p>
          )}
        </header>

        {/* 사진 갤러리 — 모바일 가로 snap scroll / 데스크탑 2-3열 grid */}
        {report.images.length > 0 && <ReportGallery images={report.images} title={report.title} />}

        {/* 본문 전체 — whitespace-pre-line 으로 줄바꿈 보존 */}
        <section>
          <p className="text-sm leading-relaxed whitespace-pre-line">{report.body}</p>
        </section>
      </div>
    </article>
  );
}

/**
 * 갤러리 섹션 — 모바일 가로 snap-x 스크롤 / 데스크탑(md+) 2-3열 grid.
 * 이미지 0장일 때는 호출되지 않음 (page.tsx 에서 조건부 렌더).
 */
function ReportGallery({ images, title }: { images: ActivityReport["images"]; title: string }) {
  return (
    <section aria-label="活動写真">
      {/*
       * 모바일: -mx-4 로 컨테이너 패딩 무효화 후 가로 전체 폭 snap scroll.
       * 데스크탑(md+): mx-0 복귀 + CSS grid 2열. 1024px+: 3열.
       */}
      <div
        className={[
          // 모바일: 가로 snap scroll
          "-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2",
          // 데스크탑: grid 전환
          "md:mx-0 md:grid md:grid-cols-2 md:gap-3 md:overflow-visible md:px-0 md:pb-0",
          "lg:grid-cols-3",
        ].join(" ")}
      >
        {images.map((img) => (
          <div
            key={img.id}
            className={[
              // 모바일: 고정 너비 카드 (snap item)
              "bg-muted relative aspect-square w-72 shrink-0 snap-start overflow-hidden rounded-lg",
              // 데스크탑: grid 셀에 맞게 확장
              "md:w-auto md:shrink",
            ].join(" ")}
          >
            <Image
              src={img.image_url}
              alt={title}
              fill
              sizes="(min-width: 1024px) 22rem, (min-width: 768px) 28rem, 18rem"
              className="object-cover"
            />
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * YYYY-MM-DD → 「4月1日」 긴 형태로 변환.
 * timezone shift 방지를 위해 split 후 직접 파싱.
 */
function formatJpDateLong(iso: string): string {
  const [, monthStr, dayStr] = iso.split("-");
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (Number.isNaN(month) || Number.isNaN(day)) return iso;
  return `${month}月${day}日`;
}

/**
 * Suspense fallback — 헤더 + 본문 영역 skeleton.
 */
function ReportDetailFallback() {
  return (
    <article className="space-y-6">
      {/* floating 뒤로가기는 작아서 skeleton 불필요 — 헤더 바 skeleton 제거 */}
      <div className="container mx-auto max-w-3xl space-y-6 px-4 pt-16">
        {/* 메타 + 제목 + 장소 skeleton */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-14" />
          </div>
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="h-5 w-1/2" />
        </div>

        {/* 갤러리 skeleton — 3장 */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square w-full" />
          ))}
        </div>

        {/* 본문 skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    </article>
  );
}
