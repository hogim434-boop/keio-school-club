/**
 * ShinkanBanner — 新歓イベント 개최 안내 배너
 *
 * 렌더 조건: shinkan_events 배열 중 event_date >= 오늘 인 건이 1개 이상일 때만 표시.
 * 가장 가까운 이벤트 날짜를 「5月20日(水)」 형식으로 표시.
 * Phase 2 에서 「詳細」 chevron 클릭 시 페이지 내 anchor 로 연결 예정.
 */

import { Calendar, ChevronRight } from "lucide-react";

import type { ShinkanEvent } from "@/lib/types/domain";

/**
 * ISO date 문자열 (YYYY-MM-DD) 을 일본어 날짜 표기로 변환
 * 예: "2026-05-20" → "5月20日(水)"
 *
 * 주의: new Date("YYYY-MM-DD") 는 UTC 00:00 기준으로 파싱됨.
 * JST(UTC+9) 환경에서 요일/날짜가 틀릴 수 있으므로
 * 문자열을 직접 분해하여 로컬 Date 로 생성함.
 */
function formatJpDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  // 로컬 타임존 기준으로 생성 (month 는 0-indexed)
  const d = new Date(year, month - 1, day);
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  return `${d.getMonth() + 1}月${d.getDate()}日(${weekdays[d.getDay()]})`;
}

interface ShinkanBannerProps {
  /** 서클의 新歓 이벤트 목록 */
  events: ShinkanEvent[];
}

/**
 * 新歓 이벤트 배너 컴포넌트.
 * 오늘 이후 이벤트가 없으면 null 반환 (조건부 렌더).
 */
export function ShinkanBanner({ events }: ShinkanBannerProps) {
  // 오늘 날짜를 ISO date 문자열로 계산 (UTC 기준, 비교 일관성 확보)
  const today = new Date().toISOString().slice(0, 10);

  // 오늘 이후 이벤트만 필터링 후 날짜 오름차순 정렬
  const upcoming = events
    .filter((e) => e.event_date >= today)
    .sort((a, b) => a.event_date.localeCompare(b.event_date));

  // 표시할 이벤트 없으면 렌더 생략
  if (upcoming.length === 0) return null;

  const nearest = upcoming[0];

  return (
    <div
      className="border-keio-navy bg-keio-navy/10 dark:bg-keio-navy/20 flex min-h-[44px] items-center gap-3 rounded-md border-l-4 px-4 py-2"
      role="status"
      aria-label="新歓イベント開催中"
    >
      {/* 달력 아이콘 */}
      <Calendar className="text-keio-navy h-4 w-4 shrink-0" aria-hidden="true" />

      {/* 배너 메인 텍스트 */}
      <span className="text-keio-navy dark:text-keio-navy/90 flex-1 text-sm font-medium">
        新歓イベント開催中
        <span className="text-keio-navy/60 mx-1">·</span>
        次回:{" "}
        <time dateTime={nearest.event_date} className="font-semibold">
          {formatJpDate(nearest.event_date)}
        </time>
      </span>

      {/* TODO: Phase 2 — 클릭 시 페이지 내 新歓 섹션으로 anchor 스크롤 */}
      <button
        type="button"
        onClick={() => {}}
        aria-label="新歓イベントの詳細を見る"
        className="hover:bg-keio-navy/10 rounded p-0.5 transition-colors active:scale-95 motion-reduce:transform-none"
      >
        <ChevronRight className="text-keio-navy h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
