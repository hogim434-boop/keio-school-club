"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ACTIVITY_FREQUENCIES,
  ACTIVITY_FREQUENCY_LABELS,
  type ActivityFrequency,
} from "@/lib/constants/activity-frequency";
import {
  OFFICIAL_TYPES,
  OFFICIAL_TYPE_LABELS,
  type OfficialType,
} from "@/lib/constants/official-type";
import { buildCirclesUrl, type CirclesSearchParams } from "@/lib/circles/search-params";
import { cn } from "@/lib/utils";

/**
 * PRD 「태그 마스터」 시드 10종 — Phase 1.2 T-009 이후 tags 테이블 fetch 로 교체 예정.
 * slug 는 DB 키, label_ja 는 UI 라벨.
 */
const TAG_SEEDS: { slug: string; label_ja: string }[] = [
  { slug: "beginner_ok", label_ja: "初心者歓迎" },
  { slug: "kenser_ok", label_ja: "兼サー可" },
  { slug: "yurui", label_ja: "ゆるい" },
  { slug: "gachi", label_ja: "ガチ" },
  { slug: "low_drinking", label_ja: "飲み少なめ" },
  { slug: "has_camp", label_ja: "合宿あり" },
  { slug: "women_many", label_ja: "女子多め" },
  { slug: "men_many", label_ja: "男子多め" },
  { slug: "once_a_week", label_ja: "週1回" },
  { slug: "low_fee", label_ja: "年会費1万円以下" },
];

/** Select 의 「제한 없음」 sentinel — shadcn Select 는 빈 문자열 value 허용 안 함 */
const FEE_MAX_ANY = "all";
const FEE_MAX_OPTIONS: { value: string; label: string }[] = [
  { value: FEE_MAX_ANY, label: "制限なし" },
  { value: "5000", label: "5,000円以下" },
  { value: "10000", label: "10,000円以下" },
  { value: "30000", label: "30,000円以下" },
];

interface FilterPanelProps {
  /** 호출 시점의 URL 파라미터 — useState 초기값. 호출처 key 로 리마운트하여 동기화 */
  initial: CirclesSearchParams;
  /** sheet: 모바일 Sheet 안. sidebar: 데스크탑 좌측 사이드바. 버튼 위치만 분기 */
  mode: "sheet" | "sidebar";
  /** Sheet 닫기 등 후처리 콜백 — 「適用」 클릭 후 호출 */
  onApply?: () => void;
}

// 검색·필터 패널 (Client)
// useState 로 draft 보관 → 「適用」 클릭 시 router.push 로 URL 갱신.
// 모든 필터 변경은 page 를 1로 리셋(URL 의 page 파라미터 생략).
export function FilterPanel({ initial, mode, onApply }: FilterPanelProps) {
  const router = useRouter();
  const [draft, setDraft] = useState<CirclesSearchParams>(initial);

  function toggleFrequency(value: ActivityFrequency) {
    setDraft((prev) => ({
      ...prev,
      frequency: prev.frequency.includes(value)
        ? prev.frequency.filter((v) => v !== value)
        : [...prev.frequency, value],
    }));
  }

  function toggleOfficialType(value: OfficialType) {
    setDraft((prev) => ({
      ...prev,
      officialType: prev.officialType.includes(value)
        ? prev.officialType.filter((v) => v !== value)
        : [...prev.officialType, value],
    }));
  }

  function toggleTag(slug: string) {
    setDraft((prev) => ({
      ...prev,
      tags: prev.tags.includes(slug) ? prev.tags.filter((s) => s !== slug) : [...prev.tags, slug],
    }));
  }

  function handleApply() {
    router.push(
      buildCirclesUrl({
        q: draft.q,
        category: draft.category,
        frequency: draft.frequency,
        officialType: draft.officialType,
        tags: draft.tags,
        feeMax: draft.feeMax,
        // 필터 변경 시 1페이지로 리셋 (page=undefined → URL 에서 생략)
        page: undefined,
      })
    );
    onApply?.();
  }

  function handleReset() {
    router.push("/circles");
    onApply?.();
  }

  return (
    <div className="flex h-full flex-col">
      <div className={cn("flex-1 space-y-6", mode === "sheet" ? "overflow-y-auto" : "")}>
        {/* 검색어 */}
        <section className="space-y-2">
          <Label htmlFor="filter-q">キーワード</Label>
          <Input
            id="filter-q"
            type="search"
            placeholder="サークル名で検索"
            value={draft.q ?? ""}
            onChange={(e) => setDraft((p) => ({ ...p, q: e.target.value || undefined }))}
          />
        </section>

        {/* 활동빈도 */}
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">活動頻度</h3>
          <div className="space-y-2">
            {ACTIVITY_FREQUENCIES.map((freq) => {
              const id = `filter-freq-${freq}`;
              return (
                <div key={freq} className="flex items-center gap-2">
                  <Checkbox
                    id={id}
                    checked={draft.frequency.includes(freq)}
                    onCheckedChange={() => toggleFrequency(freq)}
                  />
                  <Label htmlFor={id} className="cursor-pointer font-normal">
                    {ACTIVITY_FREQUENCY_LABELS[freq]}
                  </Label>
                </div>
              );
            })}
          </div>
        </section>

        {/* 公認 구분 */}
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">団体区分</h3>
          <div className="space-y-2">
            {OFFICIAL_TYPES.map((type) => {
              const id = `filter-official-${type}`;
              return (
                <div key={type} className="flex items-center gap-2">
                  <Checkbox
                    id={id}
                    checked={draft.officialType.includes(type)}
                    onCheckedChange={() => toggleOfficialType(type)}
                  />
                  <Label htmlFor={id} className="cursor-pointer font-normal">
                    {OFFICIAL_TYPE_LABELS[type]}
                  </Label>
                </div>
              );
            })}
          </div>
        </section>

        {/* 태그 10종 */}
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">タグ</h3>
          <div className="grid grid-cols-2 gap-2">
            {TAG_SEEDS.map((tag) => {
              const id = `filter-tag-${tag.slug}`;
              return (
                <div key={tag.slug} className="flex items-center gap-2">
                  <Checkbox
                    id={id}
                    checked={draft.tags.includes(tag.slug)}
                    onCheckedChange={() => toggleTag(tag.slug)}
                  />
                  <Label htmlFor={id} className="cursor-pointer text-xs font-normal">
                    {tag.label_ja}
                  </Label>
                </div>
              );
            })}
          </div>
        </section>

        {/* 연회비 상한 */}
        <section className="space-y-2">
          <Label htmlFor="filter-fee">年会費</Label>
          <Select
            value={draft.feeMax !== undefined ? String(draft.feeMax) : FEE_MAX_ANY}
            onValueChange={(value) =>
              setDraft((p) => ({
                ...p,
                feeMax: value === FEE_MAX_ANY ? undefined : Number(value),
              }))
            }
          >
            <SelectTrigger id="filter-fee">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FEE_MAX_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </section>
      </div>

      {/* 적용 / 리셋 버튼 — Sheet 모드에서는 sticky bottom */}
      <div
        className={cn(
          "flex gap-2 pt-4",
          mode === "sheet" && "bg-background sticky bottom-0 border-t pb-2"
        )}
      >
        <Button variant="outline" onClick={handleReset} className="flex-1">
          リセット
        </Button>
        <Button
          onClick={handleApply}
          className="bg-keio-navy text-keio-navy-foreground hover:bg-keio-navy/90 flex-1"
        >
          適用
        </Button>
      </div>
    </div>
  );
}
