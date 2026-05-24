"use client";

/**
 * components/layout/header-search-link.tsx
 *
 * 헤더 검색(돋보기) 아이콘 — 현재 필터를 유지한 채 /search 로 이동.
 *
 * /circles 결과 화면(필터 적용 상태)에서 돋보기를 누르면 필터가 초기화되던 문제를 해결.
 * /circles 의 현재 검색 파라미터(q·category·tags·activityDays 등)를 그대로 /search 에 실어,
 * 검색 페이지가 같은 필터로 프리필되도록 한다(/search 는 searchParams → parseCirclesSearchParams 로 초기화).
 *
 * - /circles 에 있을 때만 파라미터를 이어붙임(다른 페이지의 무관한 쿼리 전파 방지).
 * - 그 외 경로에서는 빈 /search 로 이동(기존 동작).
 */

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

// 헤더 아이콘 버튼 공통 클래스(header.tsx 와 동일 — 단순화 위해 복제)
const iconButton =
  "hover:bg-muted focus-visible:ring-ring inline-flex size-10 items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:outline-none";

export function HeaderSearchLink() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // /circles(결과·디스커버 공용) 에서만 현재 필터 파라미터를 이어붙인다.
  const query = pathname === "/circles" ? searchParams.toString() : "";
  const href = query ? `/search?${query}` : "/search";

  return (
    <Link href={href} aria-label="検索" className={iconButton}>
      <Search className="size-5" aria-hidden="true" />
    </Link>
  );
}
