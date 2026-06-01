"use client";

import { useRouter } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { buildSearchUrl, type CirclesSearchParams } from "@/lib/circles/search-params";

/**
 * 검색 결과 페이지에서 사용하는 정렬 기준 옵션.
 * circles-public.ts 의 SearchPublicCirclesParams.sort 와 동기화.
 *
 * 4종:
 * - popular: 人気順 (조회수 내림차순, 기본값)
 * - recent: 新着順 (등록일 내림차순)
 * - alphabetical: 名前順 (가나다 오름차순 — /search 전용, /circles 는 미지원)
 * - large: 規模順 (회원수 범위 내림차순)
 */
export type SearchSortOption = "popular" | "recent" | "alphabetical" | "large";

/** 정렬 옵션 라벨 — UI 표시용 */
const SORT_LABELS: Record<SearchSortOption, string> = {
  popular: "人気順",
  recent: "新着順",
  alphabetical: "名前順",
  large: "規模順",
};

interface SortDropdownProps {
  /** 현재 적용된 정렬 기준 (undefined 면 popular 로 처리) */
  currentSort?: SearchSortOption;
  /** URL 재조립용 기존 파라미터 */
  initial: CirclesSearchParams;
}

/**
 * 검색 결과 정렬 드롭다운 (Client Component).
 *
 * 선택 변경 시 현재 필터(q, category, frequency 등)를 보존하면서
 * ?sort=... 만 갱신한 URL 로 router.push.
 *
 * 주의:
 * - "alphabetical" 은 search-params.ts 의 sort allowlist 에 없으므로
 *   buildSearchUrl 의 sort 파라미터 직접 처리가 필요.
 * - 이 컴포넌트는 /search 전용. /circles 의 FilterPanel 정렬과는 별개.
 */
export function SortDropdown({ currentSort, initial }: SortDropdownProps) {
  const router = useRouter();
  const value = currentSort ?? "popular";

  function handleChange(sort: string) {
    // buildSearchUrl 은 CirclesSearchParams.sort ("popular"|"recent"|"large") 만 처리하므로
    // "alphabetical" 은 URLSearchParams 를 직접 조작해 추가한다.
    if (sort === "alphabetical") {
      const base = buildSearchUrl({ ...initial, sort: undefined, page: undefined });
      const sep = base.includes("?") ? "&" : "?";
      router.push(`${base}${sep}sort=alphabetical`);
    } else {
      const validSort = sort as "popular" | "recent" | "large";
      router.push(buildSearchUrl({ ...initial, sort: validSort, page: undefined }));
    }
  }

  return (
    <Select value={value} onValueChange={handleChange}>
      <SelectTrigger className="h-8 w-28 rounded-full text-xs" aria-label="並び替え">
        <SelectValue placeholder="並び替え" />
      </SelectTrigger>
      <SelectContent align="end">
        {(Object.entries(SORT_LABELS) as [SearchSortOption, string][]).map(([key, label]) => (
          <SelectItem key={key} value={key} className="text-sm">
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
