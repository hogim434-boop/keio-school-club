"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { SegmentedOption } from "@/components/circles/segmented-option";
import { Button } from "@/components/ui/button";
import {
  ACTIVITY_FREQUENCIES,
  ACTIVITY_FREQUENCY_LABELS,
  type ActivityFrequency,
} from "@/lib/constants/activity-frequency";
import {
  ACTIVITY_TIME_BANDS,
  ACTIVITY_TIME_BAND_LABELS,
  type ActivityTimeBand,
} from "@/lib/constants/activity-time-band";
import {
  OFFICIAL_TYPES,
  OFFICIAL_TYPE_LABELS,
  type OfficialType,
} from "@/lib/constants/official-type";
import {
  RECRUITMENT_STATUSES,
  RECRUITMENT_STATUS_LABELS,
  type RecruitmentStatus,
} from "@/lib/constants/recruitment-status";
import { buildCirclesUrl, type CirclesSearchParams } from "@/lib/circles/search-params";
import type { MemberSize } from "@/lib/dummy/circles";
import { cn } from "@/lib/utils";

/**
 * PRD 「태그 마스터」 시드 7종 — Phase 1.2 T-009 이후 tags 테이블 fetch 로 교체 예정.
 * 사용자 정책: 성별·술·연회비 관련 태그는 제외. 연회비는 별도 필터 섹션과 중복 회피.
 * 「活動頻度」 섹션과 의미 중복인 週1回(once_a_week) 는 제거.
 * slug 는 DB 키, label_ja 는 UI 라벨.
 */
const TAG_SEEDS: { slug: string; label_ja: string }[] = [
  { slug: "beginner_ok", label_ja: "初心者歓迎" },
  { slug: "kenser_ok", label_ja: "兼サー可" },
  { slug: "yurui", label_ja: "ゆるい" },
  { slug: "gachi", label_ja: "ガチ" },
  { slug: "has_camp", label_ja: "合宿あり" },
  { slug: "foreign_welcome", label_ja: "留学生歓迎" },
  { slug: "intl_activity", label_ja: "海外活動あり" },
];

/** 회원수 범위 옵션 */
const MEMBER_SIZE_OPTIONS: { value: MemberSize; label: string }[] = [
  { value: "small", label: "〜30名" },
  { value: "mid", label: "31〜100" },
  { value: "large", label: "101〜200" },
  { value: "huge", label: "200名+" },
];

/** 정렬 옵션 */
const SORT_OPTIONS: { value: "popular" | "recent" | "cheap" | "large"; label: string }[] = [
  { value: "popular", label: "人気順" },
  { value: "recent", label: "新着順" },
  { value: "cheap", label: "会費安い" },
  { value: "large", label: "会員数多" },
];

/** 활동 요일 7종 — 일본 한자 1자 */
const WEEKDAYS = ["月", "火", "水", "木", "金", "土", "日"] as const;
type Weekday = (typeof WEEKDAYS)[number];

interface FilterPanelProps {
  /** 호출 시점의 URL 파라미터 — useState 초기값. 호출처 key 로 리마운트하여 동기화 */
  initial: CirclesSearchParams;
  /** sheet: 모바일 Sheet 안. sidebar: 데스크탑 좌측 사이드바. 레이아웃만 분기 */
  mode: "sheet" | "sidebar";
  /** Sheet 닫기 등 후처리 콜백 — 「適用」 클릭 후 호출 */
  onApply?: () => void;
}

/**
 * 토스 스타일 필터 패널 — 9섹션 세그먼트 버튼 레이아웃.
 *
 * 검색어 input 은 sticky 검색바가 담당하므로 본 패널에서 제거.
 * 헤더(「フィルター」 + 「リセット」)는 패널 내부에 직접 렌더 — 데스크탑 사이드바에서도 동일.
 * 풋터「適用」는 sticky bottom 풀-width 검은 버튼.
 */
export function FilterPanel({ initial, mode, onApply }: FilterPanelProps) {
  const router = useRouter();
  const [draft, setDraft] = useState<CirclesSearchParams>(initial);

  // ── 다중 선택 토글 헬퍼 ──────────────────────────────────────
  function toggleMulti<T>(arr: T[], val: T): T[] {
    return arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val];
  }

  // ── 단일 선택 토글 헬퍼 (다시 클릭하면 해제) ─────────────────
  function toggleSingle<T>(current: T | undefined, val: T): T | undefined {
    return current === val ? undefined : val;
  }

  // 募集状態 토글
  function toggleRecruitmentStatus(val: RecruitmentStatus) {
    setDraft((prev) => ({
      ...prev,
      recruitmentStatus: toggleMulti(prev.recruitmentStatus, val),
    }));
  }

  // 活動頻度 토글
  function toggleFrequency(val: ActivityFrequency) {
    setDraft((prev) => ({
      ...prev,
      frequency: toggleMulti(prev.frequency, val),
    }));
  }

  // 活動時間帯 토글
  function toggleTimeBand(val: ActivityTimeBand) {
    setDraft((prev) => ({
      ...prev,
      activityTimeBand: toggleMulti(prev.activityTimeBand, val),
    }));
  }

  // 活動曜日 토글
  function toggleDay(val: Weekday) {
    setDraft((prev) => ({
      ...prev,
      activityDays: toggleMulti(prev.activityDays, val),
    }));
  }

  // 団体区分 토글
  function toggleOfficialType(val: OfficialType) {
    setDraft((prev) => ({
      ...prev,
      officialType: toggleMulti(prev.officialType, val),
    }));
  }

  // 会員数 단일 선택 토글
  function toggleMemberSize(val: MemberSize) {
    setDraft((prev) => ({
      ...prev,
      memberSize: toggleSingle(prev.memberSize, val),
    }));
  }

  // タグ 토글
  function toggleTag(slug: string) {
    setDraft((prev) => ({
      ...prev,
      tags: toggleMulti(prev.tags, slug),
    }));
  }

  // 並び替え 단일 선택 토글
  function toggleSort(val: "popular" | "recent" | "cheap" | "large") {
    setDraft((prev) => ({
      ...prev,
      sort: toggleSingle(prev.sort, val),
    }));
  }

  // 필터 적용 — URL 갱신 후 Sheet 닫기
  function handleApply() {
    router.push(
      buildCirclesUrl({
        q: draft.q,
        category: draft.category,
        frequency: draft.frequency,
        officialType: draft.officialType,
        tags: draft.tags,
        activityDays: draft.activityDays,
        memberSize: draft.memberSize,
        recruitmentStatus: draft.recruitmentStatus,
        activityTimeBand: draft.activityTimeBand,
        sort: draft.sort,
        // 필터 변경 시 1페이지로 리셋 (page=undefined → URL 에서 생략)
        page: undefined,
      })
    );
    onApply?.();
  }

  // 전체 리셋 — /circles 로 이동 후 Sheet 닫기
  function handleReset() {
    router.push("/circles");
    onApply?.();
  }

  return (
    <div className="flex h-full flex-col">
      {/* ── 패널 헤더: 「フィルター」 + 「リセット」 ── */}
      <header className="flex items-center justify-between pb-4">
        <h2 className="text-lg font-semibold">フィルター</h2>
        <button
          type="button"
          onClick={handleReset}
          className="text-muted-foreground hover:text-foreground text-sm"
        >
          リセット
        </button>
      </header>

      {/* ── 스크롤 영역 ── */}
      <div className={cn("flex-1 space-y-6", mode === "sheet" ? "overflow-y-auto" : "")}>
        {/* §1 募集状態 — 다중 선택, 풀-블리드 가로 스크롤 */}
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">募集状態</h3>
          <div className="-mx-4 flex snap-x snap-mandatory [scroll-padding-inline:1.25rem] gap-3 overflow-x-auto [overscroll-behavior-x:contain] px-5 pb-1">
            {RECRUITMENT_STATUSES.map((status) => (
              <SegmentedOption
                key={status}
                label={RECRUITMENT_STATUS_LABELS[status]}
                active={draft.recruitmentStatus.includes(status)}
                onClick={() => toggleRecruitmentStatus(status)}
                className="snap-start"
              />
            ))}
          </div>
        </section>

        {/* §2 活動頻度 — 다중 선택, 풀-블리드 가로 스크롤 */}
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">活動頻度</h3>
          <div className="-mx-4 flex snap-x snap-mandatory [scroll-padding-inline:1.25rem] gap-3 overflow-x-auto [overscroll-behavior-x:contain] px-5 pb-1">
            {ACTIVITY_FREQUENCIES.map((freq) => (
              <SegmentedOption
                key={freq}
                label={ACTIVITY_FREQUENCY_LABELS[freq]}
                active={draft.frequency.includes(freq)}
                onClick={() => toggleFrequency(freq)}
                className="snap-start"
              />
            ))}
          </div>
        </section>

        {/* §3 活動時間帯 — 다중 선택, 풀-블리드 가로 스크롤 */}
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">活動時間帯</h3>
          <div className="-mx-4 flex snap-x snap-mandatory [scroll-padding-inline:1.25rem] gap-3 overflow-x-auto [overscroll-behavior-x:contain] px-5 pb-1">
            {ACTIVITY_TIME_BANDS.map((band) => (
              <SegmentedOption
                key={band}
                label={ACTIVITY_TIME_BAND_LABELS[band]}
                active={draft.activityTimeBand.includes(band)}
                onClick={() => toggleTimeBand(band)}
                className="snap-start"
              />
            ))}
          </div>
        </section>

        {/* §4 活動曜日 — 다중 선택, 풀-블리드 가로 스크롤 (7옵션) */}
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">活動曜日</h3>
          <div className="-mx-4 flex snap-x snap-mandatory [scroll-padding-inline:1.25rem] gap-3 overflow-x-auto [overscroll-behavior-x:contain] px-5 pb-1">
            {WEEKDAYS.map((day) => (
              <SegmentedOption
                key={day}
                label={day}
                active={draft.activityDays.includes(day)}
                onClick={() => toggleDay(day)}
                className="snap-start"
              />
            ))}
          </div>
        </section>

        {/* §5 団体区分 — 다중 선택, 풀-블리드 가로 스크롤 (5옵션) */}
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">団体区分</h3>
          <div className="-mx-4 flex snap-x snap-mandatory [scroll-padding-inline:1.25rem] gap-3 overflow-x-auto [overscroll-behavior-x:contain] px-5 pb-1">
            {OFFICIAL_TYPES.map((type) => (
              <SegmentedOption
                key={type}
                label={OFFICIAL_TYPE_LABELS[type]}
                active={draft.officialType.includes(type)}
                onClick={() => toggleOfficialType(type)}
                className="snap-start"
              />
            ))}
          </div>
        </section>

        {/* §6 会員数 — 단일 선택, 풀-블리드 가로 스크롤 (4옵션) */}
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">会員数</h3>
          <div className="-mx-4 flex snap-x snap-mandatory [scroll-padding-inline:1.25rem] gap-3 overflow-x-auto [overscroll-behavior-x:contain] px-5 pb-1">
            {MEMBER_SIZE_OPTIONS.map((opt) => (
              <SegmentedOption
                key={opt.value}
                label={opt.label}
                active={draft.memberSize === opt.value}
                onClick={() => toggleMemberSize(opt.value)}
                className="snap-start"
              />
            ))}
          </div>
        </section>

        {/* §7 タグ — 다중 선택, 풀-블리드 가로 스크롤 (7옵션). 年会費 섹션 제거됨 */}
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">タグ</h3>
          <div className="-mx-4 flex snap-x snap-mandatory [scroll-padding-inline:1.25rem] gap-3 overflow-x-auto [overscroll-behavior-x:contain] px-5 pb-1">
            {TAG_SEEDS.map((tag) => (
              <SegmentedOption
                key={tag.slug}
                label={tag.label_ja}
                active={draft.tags.includes(tag.slug)}
                onClick={() => toggleTag(tag.slug)}
                className="snap-start"
              />
            ))}
          </div>
        </section>

        {/* §9 並び替え — 단일 선택, 풀-블리드 가로 스크롤 (4옵션) */}
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">並び替え</h3>
          <div className="-mx-4 flex snap-x snap-mandatory [scroll-padding-inline:1.25rem] gap-3 overflow-x-auto [overscroll-behavior-x:contain] px-5 pb-1">
            {SORT_OPTIONS.map((opt) => (
              <SegmentedOption
                key={opt.value}
                label={opt.label}
                active={draft.sort === opt.value}
                onClick={() => toggleSort(opt.value)}
                className="snap-start"
              />
            ))}
          </div>
        </section>
      </div>

      {/* ── 풋터: 풀-width 검은 「適用」 버튼 ── */}
      <div className="bg-background sticky bottom-0 border-t pt-3 pb-2">
        <Button
          onClick={handleApply}
          className="bg-foreground text-background hover:bg-foreground/90 h-12 w-full text-base font-semibold"
        >
          適用
        </Button>
      </div>
    </div>
  );
}
