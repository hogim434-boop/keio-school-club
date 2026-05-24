import Link from "next/link";
import { Search } from "lucide-react";

/**
 * HomeSearchBar — 홈 최상단(헤더 직하) 전폭 검색 진입 바 (RSC).
 *
 * 실제 입력 필드가 아니라 /search 로 가는 "검색바 모양 링크"(메루카리·당근 패턴).
 * 헤더의 검색 아이콘에만 있던 진입점을 상단에 크게 노출해 발견성을 높이고,
 * 헤더↔카테고리 사이 빈 공간을 채운다.
 */
export function HomeSearchBar() {
  return (
    <Link
      href="/search"
      aria-label="サークルを検索"
      // 코치마크 엔진이 이 속성으로 요소를 찾아 말풍선을 표시함
      data-coachmark="search"
      className="bg-muted text-muted-foreground hover:bg-muted/80 focus-visible:ring-ring flex h-12 w-full items-center gap-2.5 rounded-xl px-4 transition-colors focus-visible:ring-2 focus-visible:outline-none"
    >
      <Search className="size-5 shrink-0" aria-hidden="true" />
      <span className="text-sm">サークル名・カテゴリで探す</span>
    </Link>
  );
}
