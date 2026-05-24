"use client";

/**
 * ExpandableDescription — 동아리 概要(본문) 더보기/접기 컴포넌트.
 *
 * - 줄바꿈·이모지 보존(whitespace-pre-line).
 * - 본문이 COLLAPSED_LINES(기본 6줄)를 넘으면 line-clamp 로 자르고 「もっと見る」 버튼 표시.
 * - 버튼 클릭 시 전체 펼침 + 「閉じる」 로 토글.
 * - 잘림 여부는 마운트 후 실제 DOM 높이(scrollHeight > clientHeight)로 판정 → 짧은 본문은 버튼 미표시.
 *
 * client 컴포넌트인 이유: 펼침 state + DOM 높이 측정(useRef/useEffect) 필요.
 */

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

/** 접힘 상태에서 보여줄 최대 줄 수 */
const COLLAPSED_LINE_CLAMP = "line-clamp-[6]";

export function ExpandableDescription({ text }: { text: string }) {
  /** 펼침 여부 */
  const [expanded, setExpanded] = useState(false);
  /** 접힘 상태에서 내용이 잘리는지(=더보기 버튼 필요 여부) */
  const [isOverflowing, setIsOverflowing] = useState(false);

  const pRef = useRef<HTMLParagraphElement>(null);

  // 마운트 후(접힘 상태 기준) 실제 내용이 클램프 높이를 넘는지 측정.
  useEffect(() => {
    const el = pRef.current;
    if (!el) return;
    // 접힘 클램프가 적용된 상태에서 scrollHeight(전체) > clientHeight(보이는 높이) 이면 잘림.
    setIsOverflowing(el.scrollHeight > el.clientHeight + 1);
  }, [text]);

  return (
    <section className="space-y-2 border-b py-4">
      <h2 className="text-lg font-semibold">概要</h2>

      {/* 본문 — 접힘 시 line-clamp, 펼침 시 전체. 줄바꿈·이모지 보존. */}
      <p
        ref={pRef}
        className={cn(
          "text-foreground/80 text-[15px] leading-relaxed whitespace-pre-line",
          !expanded && COLLAPSED_LINE_CLAMP
        )}
      >
        {text}
      </p>

      {/* 더보기/접기 버튼 — 잘리는 경우에만(또는 이미 펼친 경우) 표시 */}
      {(isOverflowing || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="text-keio-navy hover:text-keio-navy/80 inline-flex items-center gap-0.5 text-sm font-medium transition-colors"
        >
          {expanded ? "閉じる" : "もっと見る"}
          <ChevronDown
            className={cn("size-4 transition-transform duration-200", expanded && "rotate-180")}
            aria-hidden="true"
          />
        </button>
      )}
    </section>
  );
}
