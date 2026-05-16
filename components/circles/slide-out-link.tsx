"use client";

import { useContext, type MouseEvent, type ReactNode } from "react";
import Link from "next/link";

import { CirclesSlideOutContext } from "@/components/circles/circles-page-shell";

interface Props {
  href: string;
  className?: string;
  /** 접근성 라벨 (필요 시) */
  "aria-label"?: string;
  children: ReactNode;
}

/**
 * CirclesPageShell 의 exit context 를 발화하는 Link wrapper (client).
 *
 * 일반 `<Link>` 와 동일하게 동작하되, 클릭 시 shell 의 트랜지션
 * (옛 페이지 좌측 슬라이드 아웃 → 새 페이지 페이드 인) 을 일으킨다.
 *
 * 우클릭 「새 탭에서 열기」, Cmd/Ctrl/Shift/Alt 클릭, 중간 클릭은 브라우저 기본 동작 유지
 * — `Link` 의 href 가 그대로 유지되므로 SSR/SEO·앵커 동작도 정상.
 *
 * HomeCategoryGrid 의 카테고리 칩 클릭과 동일한 패턴.
 */
export function SlideOutLink({ href, className, children, "aria-label": ariaLabel }: Props) {
  const exit = useContext(CirclesSlideOutContext);

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    // modifier 키·중간 클릭은 브라우저 기본 동작 유지 (새 탭 등)
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button === 1) return;
    e.preventDefault();
    exit({ kind: "navigate", url: href });
  };

  return (
    <Link href={href} className={className} onClick={handleClick} aria-label={ariaLabel}>
      {children}
    </Link>
  );
}
