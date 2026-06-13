"use client";

import Link from "next/link";
import { type MouseEvent, type ReactNode } from "react";

import { cn } from "@/lib/utils";

interface Props {
  href: string;
  className?: string;
  children: ReactNode;
}

/** 서클 상세 진입 재발화 신호 이름 — template.tsx 와 본 컴포넌트가 공유. */
export const CIRCLE_REENTER_EVENT = "kcircle:circle-reenter";

/**
 * 서클 카드용 Link wrapper.
 * Next.js <Link> 의 same-URL click 은 default no-op (RSC fetch 없음, 컴포넌트 재 mount 없음).
 * → 같은 카드 재진입 시 template.tsx 의 slide-in entry animation 이 발화하지 않는 문제.
 *
 * 해결: same-URL click 감지 시 default 동작 차단 + CustomEvent 발화.
 *       template.tsx 의 listener 가 animKey 토글 → m.div key 변경 → motion node re-mount
 *       → motion 의 initial→animate transition 자동 발화 → slide-in 재실행.
 *
 * 다른 URL click 은 default Link 동작 (Next.js prefetch + soft navigation) 유지.
 *
 * NOTE: same-URL 판정에 usePathname() 대신 window.location.pathname 사용.
 * 이유: cacheComponents:true 환경에서 React context 기반 usePathname() 이 stale 가능.
 * onClick 은 항상 client 에서만 실행되므로 window.location 직접 참조가 안전하고 신선함.
 */
export function CircleCardLink({ href, className, children }: Props) {
  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (window.location.pathname === href) {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent(CIRCLE_REENTER_EVENT));
    }
  };

  return (
    // active:scale-[0.98]: 탭/클릭 순간 카드가 살짝 눌리는 press 효과 (150ms로 빠르게)
    // motion-reduce:active:scale-100: 「애니메이션 줄이기」 설정 시 press 효과 비활성
    <Link
      href={href}
      className={cn(
        "transition-transform duration-150 active:scale-[0.98] motion-reduce:active:scale-100",
        className
      )}
      onClick={handleClick}
    >
      {children}
    </Link>
  );
}
