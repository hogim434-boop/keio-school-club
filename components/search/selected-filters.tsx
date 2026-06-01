"use client";

import { type Dispatch, type SetStateAction } from "react";
import { X } from "lucide-react";

import { ACTIVITY_FREQUENCY_LABELS } from "@/lib/constants/activity-frequency";
import { ACTIVITY_TIME_BAND_LABELS } from "@/lib/constants/activity-time-band";
import { CATEGORY_LABELS } from "@/lib/constants/category";
import { getOfficialTypeDisplayLabel } from "@/lib/constants/official-type";
import { RECRUITMENT_STATUS_LABELS } from "@/lib/constants/recruitment-status";
import { MEMBER_BAND_LABELS } from "@/lib/constants/member-band";
import { IRREGULAR_DAY, TAG_LABELS } from "@/lib/circles/filter-labels";
import type { CirclesSearchParams } from "@/lib/circles/search-params";

interface SelectedFiltersProps {
  draft: CirclesSearchParams;
  setDraft: Dispatch<SetStateAction<CirclesSearchParams>>;
}

interface FilterChip {
  /** chip 식별 키 (React key 용) */
  id: string;
  /** chip 안 라벨 */
  label: string;
  /** X 클릭 시 호출 — draft 에서 해당 필터만 제거 */
  remove: () => void;
}

/**
 * 검색 페이지의 「選択中」 chip 영역 — Amazon / Etsy / H&M 패턴.
 *
 * draft 의 active filter 들을 chip 으로 노출. 각 chip 에 X 버튼으로 즉시 제거.
 * 「すべて解除」 텍스트 링크로 모든 필터 일괄 초기화.
 *
 * 라벨 접두어 규칙 (값 단독 의미 명확성 기준):
 * - 접두어 붙임: 「会員数: 31〜100」 (값만으로는 의미 불명확)
 * - 값만 (값 자체로 명확): カテゴリ (「スポーツ」), 요일 (「金曜日」), 募集状態 (「募集中」),
 *   活動頻度 (「週1回」), 時間帯 (「平日夜」), 団体区分 (「体育会」), タグ (「初心者歓迎」)
 *
 * 並び替え 는 chip 영역에서 제외 — 「선택된 필터」 보다는 「결과 정렬」 의미라 시각적 분리.
 *
 * 빈 배열 시 자체 hide (노이즈 제거).
 */
export function SelectedFilters({ draft, setDraft }: SelectedFiltersProps) {
  const chips = extractChips(draft, setDraft);
  if (chips.length === 0) return null;

  function handleClearAll() {
    setDraft((prev) => ({
      ...prev,
      category: [],
      frequency: [],
      officialType: [],
      tags: [],
      activityDays: [],
      memberBands: [],
      recruitmentStatus: [],
      activityTimeBand: [],
      sort: undefined,
      // q, page 는 별도 영역이라 유지
    }));
  }

  return (
    <section className="space-y-2" aria-label="適用済みフィルター">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">選択中</h2>
        <button
          type="button"
          onClick={handleClearAll}
          className="text-muted-foreground hover:text-foreground text-sm"
        >
          すべて解除
        </button>
      </div>
      <ul className="-mx-4 flex snap-x snap-mandatory [scroll-padding-inline:1rem] gap-2 overflow-x-auto [overscroll-behavior-x:contain] px-4 pb-1">
        {chips.map((chip) => (
          <li key={chip.id} className="shrink-0 snap-start">
            {/* chip 본체 = display 영역 + X 버튼. X 만 button (제거), 본체는 단순 div */}
            <div className="border-foreground bg-foreground text-background inline-flex h-9 items-center gap-1 rounded-full border pr-1 pl-3 text-sm">
              <span>{chip.label}</span>
              <button
                type="button"
                onClick={chip.remove}
                aria-label={`${chip.label}を解除`}
                className="text-background/70 hover:bg-background/10 hover:text-background focus-visible:ring-background inline-flex size-6 items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * draft 의 모든 active filter 를 chip 리스트로 추출.
 * 노출 순서: 카테고리 → 募集状態 → 活動頻度 → 時間帯 → 曜日 → 団体区分 → 会員数 → タグ → 並び替え
 * (FilterPanel 의 섹션 순서와 동일하여 사용자가 매핑 인식 쉬움)
 */
function extractChips(
  draft: CirclesSearchParams,
  setDraft: Dispatch<SetStateAction<CirclesSearchParams>>
): FilterChip[] {
  const chips: FilterChip[] = [];

  // カテゴリ — 값만 (「スポーツ」)
  draft.category.forEach((c) => {
    chips.push({
      id: `category:${c}`,
      label: CATEGORY_LABELS[c],
      remove: () =>
        setDraft((prev) => ({
          ...prev,
          category: prev.category.filter((x) => x !== c),
        })),
    });
  });

  // 募集状態 — 값만 (「募集中」)
  draft.recruitmentStatus.forEach((s) => {
    chips.push({
      id: `recruit:${s}`,
      label: RECRUITMENT_STATUS_LABELS[s],
      remove: () =>
        setDraft((prev) => ({
          ...prev,
          recruitmentStatus: prev.recruitmentStatus.filter((x) => x !== s),
        })),
    });
  });

  // 活動頻度 — 값만 (「週1回」)
  draft.frequency.forEach((f) => {
    chips.push({
      id: `freq:${f}`,
      label: ACTIVITY_FREQUENCY_LABELS[f],
      remove: () =>
        setDraft((prev) => ({
          ...prev,
          frequency: prev.frequency.filter((x) => x !== f),
        })),
    });
  });

  // 活動時間帯 — 값만 (「平日夜」)
  draft.activityTimeBand.forEach((b) => {
    chips.push({
      id: `band:${b}`,
      label: ACTIVITY_TIME_BAND_LABELS[b],
      remove: () =>
        setDraft((prev) => ({
          ...prev,
          activityTimeBand: prev.activityTimeBand.filter((x) => x !== b),
        })),
    });
  });

  // 活動曜日 — 요일 1자는 「金曜日」, 不定期 는 그대로 (「不定期曜日」 방지)
  draft.activityDays.forEach((d) => {
    chips.push({
      id: `day:${d}`,
      label: d === IRREGULAR_DAY ? d : `${d}曜日`,
      remove: () =>
        setDraft((prev) => ({
          ...prev,
          activityDays: prev.activityDays.filter((x) => x !== d),
        })),
    });
  });

  // 団体区分 — 体育会 / インカレ 만 chip 표시. 그 외 (公認/非公認/その他) 는 helper 가 null 반환 → chip 자체 숨김.
  draft.officialType.forEach((o) => {
    const label = getOfficialTypeDisplayLabel(o);
    if (!label) return;
    chips.push({
      id: `official:${o}`,
      label,
      remove: () =>
        setDraft((prev) => ({
          ...prev,
          officialType: prev.officialType.filter((x) => x !== o),
        })),
    });
  });

  // 会員数 — 선택한 member_band 각각 칩 (「会員数: 51〜100名」)
  draft.memberBands.forEach((band) => {
    chips.push({
      id: `member:${band}`,
      label: `会員数: ${MEMBER_BAND_LABELS[band]}`,
      remove: () =>
        setDraft((prev) => ({
          ...prev,
          memberBands: prev.memberBands.filter((b) => b !== band),
        })),
    });
  });

  // タグ — 값만 (「初心者歓迎」, 「ゆるい」 등 — 값 자체로 명확)
  draft.tags.forEach((t) => {
    const label = TAG_LABELS[t] ?? t; // 매핑 없는 slug 는 raw 표시 (fail-safe)
    chips.push({
      id: `tag:${t}`,
      label,
      remove: () =>
        setDraft((prev) => ({
          ...prev,
          tags: prev.tags.filter((x) => x !== t),
        })),
    });
  });

  // 並び替え 는 chip 영역에서 제외 — 「선택된 필터」 가 아닌 「결과 정렬」 의 의미라 분리.
  // 단, FilterPanel sheet 의 「並び替え」 섹션과 URL ?sort=... 보존은 그대로 유지.
  // 「すべて解除」 의 일괄 초기화에는 sort 도 포함되어 있어 chip 미노출이라도 reset 가능.

  return chips;
}
