"use client";

import { useContext, useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Search } from "lucide-react";

import { SearchSlideOutContext } from "@/app/search/template";
import { RECENT_SEARCHES_KEY, RECENT_SEARCHES_MAX } from "@/components/search/recent-searches";
import { buildCirclesUrl, type CirclesSearchParams } from "@/lib/circles/search-params";

interface SearchPageHeaderProps {
  /** /search?... 로 들어왔을 때 보존된 검색·필터. submit 시 q 외 필터들이 결과 페이지에 같이 전달됨 */
  initial: CirclesSearchParams;
}

/**
 * 검색 페이지 상단 헤더 — sticky top-0, 글로벌 헤더 대신 노출.
 *
 * 구조: ChevronLeft (slide-out 트리거) | search input (focus 자동)
 *
 * 「戻る」 동작:
 * - router.back() 직접 호출 대신 SearchSlideOutContext 사용.
 * - app/search/template.tsx 의 m.div 가 slide-out 애니메이션 (우측으로 사라짐) 후 router.back() 호출.
 * - 상세 페이지 (app/circles/[id]/template.tsx) 의 동일한 패턴.
 *
 * submit 시:
 * - 입력값 trim → 빈 문자열이면 무시 (no-op)
 * - localStorage 최근 검색어 prepend (max 8, 중복 제거, FIFO)
 * - buildCirclesUrl 로 q + 기존 필터 보존 URL 조립 → router.push
 */
export function SearchPageHeader({ initial }: SearchPageHeaderProps) {
  const router = useRouter();
  const exit = useContext(SearchSlideOutContext);
  const [value, setValue] = useState(initial.q ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  // 페이지 진입 시 input 자동 focus — 당근앱 패턴, 모바일 키보드 즉시 노출
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function persistRecent(term: string) {
    try {
      const raw = window.localStorage.getItem(RECENT_SEARCHES_KEY);
      const prev: string[] = raw && Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [];
      // 중복 제거 후 맨 앞에 추가, 최대 8개로 잘라냄
      const next = [term, ...prev.filter((t) => t !== term)].slice(0, RECENT_SEARCHES_MAX);
      window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
    } catch {
      // localStorage 미사용 환경 / 저장 실패 — silent (검색 자체에 영향 없음)
    }
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const term = value.trim();
    if (term.length === 0) return;
    persistRecent(term);
    // 기존 필터 (category, frequency 등) 는 보존하면서 q 만 갱신
    router.push(buildCirclesUrl({ ...initial, q: term, page: undefined }));
  }

  return (
    <header className="bg-background/80 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-30 backdrop-blur">
      <div className="container mx-auto flex max-w-6xl items-center gap-2 px-4 py-3">
        <button
          type="button"
          onClick={() => exit({ kind: "back" })}
          aria-label="戻る"
          className="hover:bg-muted focus-visible:ring-ring inline-flex size-9 shrink-0 items-center justify-center rounded-full focus-visible:ring-2 focus-visible:outline-none"
        >
          <ChevronLeft className="size-5" aria-hidden="true" />
        </button>

        <form onSubmit={onSubmit} role="search" className="relative flex-1">
          <Search
            aria-hidden="true"
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          />
          <input
            ref={inputRef}
            type="search"
            name="q"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="サークルを検索"
            aria-label="サークルを検索"
            enterKeyHint="search"
            autoComplete="off"
            className="bg-muted/60 placeholder:text-muted-foreground focus-visible:ring-ring h-10 w-full rounded-full border-0 pr-4 pl-9 text-sm focus-visible:ring-2 focus-visible:outline-none"
          />
        </form>
      </div>
    </header>
  );
}
