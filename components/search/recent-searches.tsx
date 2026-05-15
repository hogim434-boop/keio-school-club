"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";

/** localStorage key — 최근 검색어 8개까지 보존 (FIFO). 외부에서도 import 해 검색 페이지 헤더가 쓰기 가능 */
export const RECENT_SEARCHES_KEY = "kcircle.recent_searches";
export const RECENT_SEARCHES_MAX = 8;

/**
 * 최근 검색어 — localStorage 에 사용자별 검색 이력을 FIFO 로 보존.
 *
 * 동작:
 * - mount 시 localStorage 읽기. 키 없거나 빈 배열이면 컴포넌트 자체 hide.
 * - 각 항목은 우측 X 버튼으로 개별 삭제. 「すべて削除」 로 일괄 삭제.
 * - storage 이벤트로 다른 탭에서의 변경도 즉시 반영.
 *
 * SSR safety: useEffect 안에서만 localStorage 접근. mount 전에는 null 반환.
 */
export function RecentSearches() {
  const [items, setItems] = useState<string[] | null>(null);

  // mount 시 localStorage 로드 + 다른 탭 동기화
  useEffect(() => {
    const load = () => {
      try {
        const raw = window.localStorage.getItem(RECENT_SEARCHES_KEY);
        if (!raw) {
          setItems([]);
          return;
        }
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setItems(parsed.filter((v): v is string => typeof v === "string"));
        } else {
          setItems([]);
        }
      } catch {
        // 파싱 실패 시 빈 배열 — localStorage 오염 대비
        setItems([]);
      }
    };
    load();
    const onStorage = (e: StorageEvent) => {
      if (e.key === RECENT_SEARCHES_KEY) load();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // 개별 삭제
  function removeOne(term: string) {
    setItems((prev) => {
      const next = (prev ?? []).filter((t) => t !== term);
      window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
      return next;
    });
  }

  // 전체 삭제
  function clearAll() {
    window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify([]));
    setItems([]);
  }

  // SSR / 빈 이력 시 hide — TopSearches / Categories 로 자연스럽게 첫 화면 채워짐
  if (items === null || items.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">最近の検索</h2>
        <button
          type="button"
          onClick={clearAll}
          className="text-muted-foreground hover:text-foreground text-sm"
        >
          すべて削除
        </button>
      </div>
      <ul className="-mx-4 flex snap-x snap-mandatory [scroll-padding-inline:1rem] gap-2 overflow-x-auto [overscroll-behavior-x:contain] px-4 pb-1">
        {items.map((term) => (
          <li key={term} className="shrink-0 snap-start">
            {/* 칩 + X 버튼 — 칩 본체는 Link, X 만 button. 중첩 button 회피용 wrapper div */}
            <div className="border-border bg-background inline-flex h-9 items-center gap-1 rounded-full border pr-1 pl-3 text-sm">
              <Link
                href={`/circles?q=${encodeURIComponent(term)}`}
                className="hover:text-foreground/80 text-foreground"
              >
                {term}
              </Link>
              <button
                type="button"
                onClick={() => removeOne(term)}
                aria-label={`${term}を削除`}
                className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex size-6 items-center justify-center rounded-full"
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
