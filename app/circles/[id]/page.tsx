import React, { Suspense } from "react";
import { notFound } from "next/navigation";
import {
  Calendar,
  Clock,
  Instagram,
  RefreshCw,
  Twitter,
  UserCheck,
  Users,
  type LucideIcon,
  Info,
} from "lucide-react";

import { CircleActions } from "@/components/circles/circle-actions";
import { CircleAlbum } from "@/components/circles/circle-album";
import { CircleGalleryTab } from "@/components/circles/circle-gallery-tab";
import { CoverCarousel } from "@/components/circles/cover-carousel";
import { CircleDetailFadeIn } from "@/components/circles/circle-detail-fade-in";
import { CircleDetailSkeleton } from "@/components/circles/circle-detail-skeleton";
import { CircleDetailTabs } from "@/components/circles/circle-detail-tabs";
import { OwnerProfileCard } from "@/components/circles/owner-profile-card";
import { TAG_LABELS } from "@/lib/circles/filter-labels";
import { ACTIVITY_FREQUENCY_LABELS } from "@/lib/constants/activity-frequency";
import { ACTIVITY_TIME_BAND_LABELS } from "@/lib/constants/activity-time-band";
import { CATEGORY_LABELS } from "@/lib/constants/category";
import { MEMBER_BAND_LABELS } from "@/lib/constants/member-band";
import { getOfficialTypeDisplayLabel } from "@/lib/constants/official-type";
import { RECRUITMENT_STATUS_LABELS } from "@/lib/constants/recruitment-status";
import { getReportsByCircle } from "@/lib/supabase/queries/activity-reports";
import { listGalleries } from "@/lib/supabase/queries/circle-galleries";
import {
  getApprovedCircleById,
  getCircleById,
  getCirclesByCategory,
} from "@/lib/supabase/queries/circles";
import { getAvgResponseTime } from "@/lib/supabase/queries/inquiries";
import { AvgResponseTimeBadge } from "@/components/dm/avg-response-time";
import { CircleCard } from "@/components/circles/circle-card";
import { ExpandableDescription } from "@/components/circles/expandable-description";
import { createClient } from "@/lib/supabase/server";
import type { CircleDetail, CircleSummary } from "@/lib/types/domain";

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
      <Suspense fallback={<CircleDetailSkeleton />}>
        <CircleDetailContent params={params} />
      </Suspense>
    </main>
  );
}

/**
 * 캐시 우선 서클 상세 취득 헬퍼.
 *
 * 1순위: getApprovedCircleById(anon + unstable_cache 60초) — approved 공개 서클.
 *         캐시 히트 시 네트워크 왕복 없이 Vercel Data Cache 에서 즉시 반환.
 * 2순위: getCircleById(쿠키/RLS) — 캐시가 null 이면 폴백.
 *         오너·어드민의 pending/rejected 미리보기 케이스를 커버.
 * 둘 다 null → 호출측에서 notFound().
 */
async function fetchCircleWithFallback(id: string): Promise<CircleDetail | null> {
  // 먼저 캐시된 approved 상세 시도
  const cached = await getApprovedCircleById(id);
  if (cached) return cached;
  // null 이면 쿠키 클라이언트(RLS)로 폴백 — pending/rejected 오너·어드민 케이스
  return getCircleById(id);
}

async function CircleDetailContent({ params }: CircleDetailPageProps) {
  const { id } = await params;
  /**
   * circle 조회 + 활동 리포트 조회를 병렬 실행 (성능 개선 Phase 1).
   *
   * circle 취득은 "캐시 우선 + 폴백" 패턴(fetchCircleWithFallback):
   *   - approved 서클: getApprovedCircleById(캐시 60초, anon) → 빠름.
   *   - 미승인/unknown: getCircleById(쿠키/RLS) 폴백 → 오너 미리보기 유지.
   * reports 취득은 getReportsByCircle(캐시 30초, anon).
   *
   * - circle가 null(존재하지 않는 서클)인 경우엔 reports 조회는 빈 배열로 무해하게 끝남.
   */
  const [circle, reports, galleries, avgResponseTime] = await Promise.all([
    fetchCircleWithFallback(id),
    getReportsByCircle(id),
    listGalleries(id),
    // T-034: 평균 응답 시간 — 공개 집계 수치, unstable_cache(tags:["circles"]) 적용됨
    getAvgResponseTime(id),
  ]);
  if (!circle) notFound();

  // 승인 여부 — pending 상태이면 関連サークル 조회 생략 + 審査中 배너 표시
  const isApproved = circle.status === "approved";

  /**
   * 관련 동아리 — 승인된 서클만 조회. pending 상태이면 불필요한 쿼리 절약 겸 빈 배열 반환.
   * (getCirclesByCategory 는 approved 만 반환하므로 pending 서클은 어차피 포함 안 됨)
   * 9건 fetch 후 본인 제외 → 8건 보장.
   */
  const relatedCircles = isApproved
    ? (await getCirclesByCategory(circle.category, 9)).filter((c) => c.id !== circle.id).slice(0, 8)
    : [];

  const supabase = await createClient();

  /**
   * 소유자 판별 — getClaims() 로 로컬 JWT 검증 (네트워크 왕복 없음).
   * getUser() 는 Supabase /user 엔드포인트를 호출하므로 매 렌더마다 외부 요청이 발생하나,
   * getClaims() 는 서명 검증만 수행해 요청 비용이 없다.
   * claims.sub === user UUID. 미로그인 시 data.claims 가 null → uid undefined → isOwner false.
   */
  const { data: claimsData } = await supabase.auth.getClaims();
  const uid = claimsData?.claims?.sub;
  const isOwner = !!uid && circle.owner_id === uid;

  /**
   * fire-and-forget 조회수 증가 RPC — await 하지 않아 렌더 블로킹 없음.
   * approved 서클만, 그리고 **소유자(생성자) 본인 조회는 제외**하고 증가시킨다.
   * (소유자가 자기 동아리를 열람할 때는 조회수에 포함하지 않음)
   * 에러 시 콘솔 출력만, UX에 영향 없음.
   */
  if (circle.status === "approved" && !isOwner) {
    supabase.rpc("increment_view_count", { p_circle_id: id }).then(({ error }) => {
      if (error) console.warn("[increment_view_count]", error.message);
    });
  }

  return (
    <article className="space-y-6">
      {/*
       * 진입 fade-up — 커버 + 본문 container 를 감싸 스켈레톤 → 실제 전환을 부드럽게.
       * CircleActions(fixed)는 래퍼 밖에 두어 transform 영향을 받지 않게 한다(아래 주석 참조).
       */}
      <CircleDetailFadeIn>
        {/* 1. 커버 캐러셀 — 복수 커버 지원 (1장: 단일 이미지 / 2장~: 스냅 캐러셀) */}
        {/* 커버 하단 전체 폭 경계선 — 커버와 본문 영역을 시각적으로 구분 */}
        <div className="border-b">
          <CoverCarousel images={circle.images} circleName={circle.name} />
        </div>

        <div className="container mx-auto max-w-6xl space-y-6 px-4">
          {/* 審査中 배너 — pending 상태(소유자/관리자 미리보기) 일 때만 표시 */}
          {!isApproved && (
            <div
              role="status"
              className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200"
            >
              {/* 아이콘 — 장식용이므로 스크린리더 무시 */}
              <Clock aria-hidden className="size-4 shrink-0" />
              <p className="text-sm font-semibold">審査中です</p>
            </div>
          )}

          {/* 2. 헤더 — 뱃지 행 + 서클명 + 태그 칩 (데스크탑 inline 액션 제거됨) */}
          <Header circle={circle} />

          {/* 2-1. 소유자 전용 카드 — 프로필 完成度 게이지 + 「編集する」. 일반 방문자에겐 미노출.
            (심사중·승인 무관하게 본인이면 표시 — 미리 프로필을 채우고 편집 가능) */}
          {isOwner && <OwnerProfileCard circle={circle} />}

          {/*
           * 3. 탭 구조 (2탭: ホーム / アルバム) — T-010 개편.
           * 「ホーム」 = SummaryGrid + Description + 活動レポート 미리보기 + 全レポートリスト
           * 「アルバム」 = 커버 + 리포트 사진 자동 집계
           * isOwner: 소유자 전용 「＋ 投稿する」 버튼 표시 여부 전달.
           */}
          {/*
           * 앨범 이미지 자동 집계 — 추가 쿼리 없음.
           * 커버 이미지(복수, isCover=true) 를 sort_order 순으로 맨 앞, 이후 리포트 사진을 최신순으로 나열.
           * circle.images 는 circle_images(복수 커버) — 레거시 동아리는 쿼리 fallback 으로 cover_image_url 1장이 채워짐.
           */}
          {(() => {
            /**
             * アルバム 탭 구성 (T-011 개편):
             *
             * 섹션 1 — 활동 리포트 사진 자동 집계 (CircleAlbum)
             *   커버 이미지(circle.images) + 활동 리포트(activity_reports) 사진을
             *   추가 쿼리 없이 자동으로 합쳐서 표시.
             *
             * 섹션 2 — 갤러리 (CircleGalleryTab)
             *   circle_galleries 테이블의 사진. 운영진이 직접 업로드한 활동 아카이브.
             *   학기 필터(봄학기 / 가을학기)로 기간 좁히기 가능.
             *   0건이면 빈 상태 메시지만 표시.
             */
            const albumImages = [
              ...circle.images.map((img) => ({
                url: img.image_url,
                isCover: true as const,
              })),
              ...reports.flatMap((r) =>
                r.images.map((img) => ({
                  url: img.image_url,
                  reportId: r.id,
                  reportTitle: r.title,
                }))
              ),
            ];

            // アルバム 탭 전체 콘텐츠
            const albumContent = (
              <div className="space-y-8">
                {/* 섹션 1: 커버 + 리포트 자동 집계 — 기존 CircleAlbum 재사용 */}
                {albumImages.length > 0 && (
                  <section className="space-y-3">
                    <h3 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                      活動レポートの写真
                    </h3>
                    <CircleAlbum images={albumImages} circleId={circle.id} />
                  </section>
                )}

                {/* 섹션 2: circle_galleries — 운영진 업로드 아카이브 */}
                <section className="space-y-3">
                  {/* albumImages가 있을 때만 구분 헤더 표시 */}
                  {albumImages.length > 0 && (
                    <h3 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                      ギャラリー
                    </h3>
                  )}
                  <CircleGalleryTab circleId={circle.id} galleries={galleries} />
                </section>
              </div>
            );

            return (
              <CircleDetailTabs
                circleId={circle.id}
                reports={reports}
                isOwner={isOwner}
                homeContent={
                  <>
                    <SummaryGrid circle={circle} />
                    {/*
                     * T-034: 평균 응답 시간 배지 — SummaryGrid 아래, 소개글 위.
                     * 「DM で質問する」CTA(CircleActions)와 연계해 반응속도를 미리 안내.
                     * 강제·약속 표현 금지, 어디까지나 「平均的に」 톤.
                     */}
                    <div className="flex items-center gap-2 pt-1">
                      <AvgResponseTimeBadge value={avgResponseTime} />
                    </div>
                    <ExpandableDescription text={circle.description} />
                  </>
                }
                // 관련 동아리 — 「ホーム」 탭 맨 아래(全レポートリスト 뒤)에 표시. 0건이면 미표시.
                relatedContent={
                  relatedCircles.length > 0 ? <RelatedCircles circles={relatedCircles} /> : null
                }
                // アルバム 탭 — 리포트 사진 집계 + circle_galleries 갤러리 (T-011)
                albumContent={albumContent}
              />
            );
          })()}

          {/*
           * 4. 외부 SNS 풋터 — Instagram / X 링크만 표시 (LINE 그룹 링크 금지).
           * T-010 요구사항: LINE 은 개인 정보 위험(무제한 링크 확산)으로 공개 금지.
           * contact_instagram / contact_x 중 하나라도 있을 때만 섹션 렌더.
           */}
          <SnsSnsFooter circle={circle} />
        </div>
      </CircleDetailFadeIn>

      {/*
       * 5. lagging spring sticky 액션 — viewport 하단 고정 + 스크롤 velocity 반응.
       * fixed positioning 이라 CircleDetailFadeIn(진입 transform) 밖에 둔다 →
       * 진입 애니 중에도 viewport 기준 고정 유지. article 의 마지막 자식.
       */}
      <CircleActions circle={circle} />
    </article>
  );
}

// 헤더 — 카테고리/official_type 칩 + 서클명 + 태그 칩
// 데스크탑 inline 액션은 제거됨 (데스크탑도 sticky floating pill 로 통일됨)
// Badge 컴포넌트 대신 keio-navy 소프트 pill / muted pill 로 통일해 앱 네이티브 느낌 강화
function Header({ circle }: { circle: CircleDetail }) {
  return (
    <header className="space-y-3">
      {/* 칩 행 — 카테고리(keio-navy 소프트) + official_type(muted) */}
      <div className="flex flex-wrap items-center gap-2">
        {/* 카테고리: keio-navy/10 배경 + keio-navy 텍스트 — 브랜드 강조 */}
        <span className="bg-keio-navy/10 text-keio-navy inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold">
          {CATEGORY_LABELS[circle.category]}
        </span>
        {(() => {
          // 体育会 / インカレ 만 표시. 그 외 (公認/非公認/その他) 는 칩 비표시.
          const officialLabel = getOfficialTypeDisplayLabel(circle.official_type);
          // official_type 칩: muted 배경 + muted-foreground — 서브 정보
          return officialLabel ? (
            <span className="text-muted-foreground bg-muted inline-flex items-center rounded-full px-3 py-1 text-xs font-medium">
              {officialLabel}
            </span>
          ) : null;
        })()}
      </div>
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{circle.name}</h1>
      {circle.tags.some((tag) => TAG_LABELS[tag]) && (
        <div className="flex flex-wrap gap-1.5">
          {/* 라벨 정의된(현행) 태그만 노출 — 정리로 제거된 태그는 숨김 */}
          {circle.tags
            .filter((tag) => TAG_LABELS[tag])
            .slice(0, 5)
            .map((tag) => (
              // 태그 칩: muted/60 배경 + muted-foreground — 세번째 계층 정보
              <span
                key={tag}
                className="text-muted-foreground bg-muted/60 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs"
              >
                {TAG_LABELS[tag]}
              </span>
            ))}
        </div>
      )}
    </header>
  );
}

/**
 * 요약 정보 5종 — 아이콘 + 라벨 + 값 세로 행 리스트 (2026-05 개선)
 *
 * | 순번 | 라벨     | 아이콘     | 소스                                                              |
 * |------|----------|-----------|-------------------------------------------------------------------|
 * | 1    | 募集状況 | UserCheck | recruitment_status (optional, 없으면 「—」)                        |
 * | 2    | 活動頻度 | RefreshCw | activity_frequency (기존 유지)                                    |
 * | 3    | 活動日   | Calendar  | activity_days (label 만 「活動曜日」→「活動日」 단축)                |
 * | 4    | 活動時間 | Clock     | activity_time_band 배열 join (optional, 없으면 「—」)              |
 * | 5    | 会員数   | Users     | member_band 범위 라벨 (마이그레이션 008, 없으면 「—」)               |
 *
 * 레이아웃: border 그리드 → divide-y 세로 행 리스트로 변경 (앱 네이티브 설정 화면 느낌)
 * 아이콘: w-6 고정 너비, text-muted-foreground (값과 구분)
 * 募集状況 값만 text-keio-navy 강조 (기존 emphasis 유지)
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

  // 부원 수 범위 라벨 — member_band 없으면 「—」
  const memberBandLabel = circle.member_band ? MEMBER_BAND_LABELS[circle.member_band] : "—";

  const items: { label: string; value: string; icon: LucideIcon; emphasis?: boolean }[] = [
    {
      label: "募集状況",
      value: recruitmentLabel,
      icon: UserCheck,
      emphasis: true, // 募集状況만 keio-navy 강조
    },
    {
      label: "活動頻度",
      value: ACTIVITY_FREQUENCY_LABELS[circle.activity_frequency],
      icon: RefreshCw,
    },
    {
      label: "活動日",
      value: circle.activity_days,
      icon: Calendar,
    },
    {
      label: "活動時間",
      value: timeBandLabel,
      icon: Clock,
    },
    {
      label: "会員数",
      value: memberBandLabel,
      icon: Users,
    },
  ];

  return (
    /*
     * divide-y: 각 행 사이에 수평선을 자동으로 그어줌
     * → 기존 border 박스 5개 그리드 대신 깔끔한 세로 설정 메뉴 스타일
     */
    <dl className="divide-border divide-y">
      {items.map(({ label, value, icon: Icon, emphasis }) => (
        <div key={label} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
          {/* 아이콘 — 고정 너비 w-6 로 라벨/값 열이 세로로 정렬됨 */}
          <Icon className="text-muted-foreground size-5 w-6 shrink-0" />
          {/* 라벨 + 값 세로 스택 */}
          <div className="flex min-w-0 flex-1 flex-col">
            <dt className="text-muted-foreground text-xs">{label}</dt>
            <dd
              className={
                emphasis
                  ? "text-keio-navy text-sm font-semibold"
                  : "text-foreground text-sm font-semibold"
              }
            >
              {value}
            </dd>
          </div>
        </div>
      ))}
    </dl>
  );
}

/**
 * SnsSnsFooter — 외부 SNS 풋터 (Instagram / X 만, LINE 금지).
 *
 * T-010 변경:
 * - LINE 그룹 링크 공개 금지 (개인 정보 위험 — 무제한 링크 확산).
 * - contact_line 데이터는 DB 에 보존, 운영진 DM 답신 시 개별 안내용.
 *
 * M-024 변경 (미claim 핸드오프):
 * - is_claimed=false: SNS 링크를 「연락 창구」로 격상하는 헤더 문구로 변경.
 * - is_claimed=true: 기존 「公式SNS」 표기 유지.
 * - 두 경우 모두 contact_instagram / contact_x 가 없으면 섹션 자체 미렌더.
 *
 * 추가: 미claim 동아리에게 「管理する」 유도 배너 표시.
 */
function SnsSnsFooter({ circle }: { circle: CircleDetail }) {
  const hasSns = circle.contact_instagram || circle.contact_x;
  if (!hasSns && circle.is_claimed) return null;
  if (!hasSns && !circle.is_claimed) {
    // 未claim + SNS なし: 管理유도 배너만 표示
    return <UnclaimedBanner circleId={circle.id} />;
  }

  // SNS あり — claim 여부에 따라 섹션 헤더 문구 분기
  const sectionHeading = circle.is_claimed ? "公式SNS" : "このサークル・部活動への問い合わせ先";

  return (
    <section className="space-y-4 border-t pt-6">
      <h2 className="text-muted-foreground text-base font-semibold">{sectionHeading}</h2>

      {/* 미claim 안내 문구 — 인앱 DM 없음을 자연스럽게 설명 */}
      {!circle.is_claimed && (
        <p className="text-muted-foreground text-sm leading-relaxed">
          現在、公式SNSからお問い合わせください。
        </p>
      )}

      <div className="flex items-center gap-3">
        {/* Instagram 링크 */}
        {circle.contact_instagram && (
          <a
            href={circle.contact_instagram}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram で見る"
            className="hover:bg-muted flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors"
          >
            {/* Instagram 공식 그라데이션 아이콘 배경 */}
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#feda75] via-[#d62976] to-[#4f5bd5]">
              <Instagram className="size-3.5 text-white" aria-hidden />
            </span>
            Instagram
          </a>
        )}
        {/* X (Twitter) 링크 */}
        {circle.contact_x && (
          <a
            href={circle.contact_x}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="X (Twitter) で見る"
            className="hover:bg-muted flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors"
          >
            {/* X 공식 블랙 아이콘 배경 */}
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-black">
              <Twitter className="size-3.5 text-white" aria-hidden />
            </span>
            X
          </a>
        )}
      </div>

      {/* 미claim 動아리 관리 유도 배너 */}
      {!circle.is_claimed && <UnclaimedBanner circleId={circle.id} />}
    </section>
  );
}

/**
 * UnclaimedBanner — 미claim 동아리에 표시하는 「管理する」 유도 배너 (M-024).
 *
 * 실제 운영자에게 인앱 관리 등록을 안내한다.
 * claim 본 플로우는 후속 구현 예정 — 현재는 /mypage 로 임시 안내.
 *
 * 카피 규칙: 「公認」「必ず」등 금지어 미사용. 동아리は「サークル・部活動」.
 */
function UnclaimedBanner({ circleId }: { circleId: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-dashed px-4 py-3">
      <Info className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">このサークル・部活動を運営していますか？</p>
        <p className="text-muted-foreground mt-0.5 text-xs">
          登録することで、アプリ内でのお問い合わせ管理や情報更新が可能になります。
        </p>
        {/* claim 신청 라우트 (M-025) */}
        <a
          href={`/circles/${circleId}/claim`}
          className="text-keio-navy mt-1.5 inline-block text-xs font-semibold underline-offset-2 hover:underline"
        >
          管理する
        </a>
      </div>
    </div>
  );
}

// 관련 동아리 — 같은 카테고리 인기 동아리. 「ホーム」 탭 전용, 가로 스크롤(모든 화면).
// recruiting-strip 의 가로 스크롤 패턴(-mx-4 + snap-x + overflow-x-auto) 차용.
function RelatedCircles({ circles }: { circles: CircleSummary[] }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">関連サークル</h2>
      {/* 좌우 풀-블리드 가로 스크롤. 각 카드 고정폭 + snap. */}
      <ul className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto overscroll-x-contain px-4">
        {circles.map((c) => (
          <li key={c.id} className="w-56 shrink-0 snap-start sm:w-60">
            <CircleCard circle={c} />
          </li>
        ))}
      </ul>
    </section>
  );
}
