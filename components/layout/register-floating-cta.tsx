"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { LazyMotion, domAnimation, m, useReducedMotion } from "motion/react";

// ─── 스크롤 감지 훅 ───────────────────────────────────────────────────────────
// 80px 이상 스크롤하면 true 반환. passive: true로 성능 최적화.
function useIsScrolled(threshold = 80): boolean {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setIsScrolled(window.scrollY > threshold);
    };

    // 페이지 중간에서 새로고침된 경우를 대비해 마운트 시 즉시 체크
    onScroll();

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return isScrolled;
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────
export function RegisterFloatingCTA() {
  const pathname = usePathname();
  const isScrolled = useIsScrolled(80);
  const reducedMotion = useReducedMotion();

  // 서클 상세 페이지 — 「参加する」 액션 바와 자리 충돌 회피
  const isCircleDetail = /^\/circles\/[0-9a-f-]+$/i.test(pathname) && pathname !== "/circles/new";
  // 등록 페이지 자기 자신 — 중복 노출 회피
  const isRegisterPage = pathname === "/circles/new";

  if (isCircleDetail || isRegisterPage) return null;

  // collapsed(스크롤 내림) = 원형 56px, expanded(최상단) = 알약 형태
  const collapsed = isScrolled;

  // 모션 비활성화 사용자는 duration 0으로 즉시 전환
  const transition = reducedMotion
    ? { duration: 0 }
    : { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const };

  const textTransition = reducedMotion
    ? { duration: 0 }
    : { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const };

  return (
    <LazyMotion features={domAnimation}>
      {/*
        외곽 컨테이너:
        - padding만 모핑 (collapsed 시 18px, expanded 시 20px — 살짝의 시각적 톤 변화)
        - 너비는 명시하지 않음 → 자식(텍스트)의 width 변화에 따라 자연스럽게 조절됨
        - overflow-hidden 으로 텍스트가 컨테이너 밖으로 비져나오는 걸 깔끔히 잘라냄
      */}
      <m.div
        initial={false}
        animate={{
          paddingLeft: collapsed ? 18 : 20,
          paddingRight: collapsed ? 18 : 20,
        }}
        transition={transition}
        className="bg-keio-navy text-keio-navy-foreground fixed right-4 z-40 flex h-14 items-center overflow-hidden rounded-full shadow-lg transition-shadow hover:shadow-xl md:hidden"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 4.5rem)" }}
      >
        <Link
          href="/circles/new"
          aria-label="サークルを登録に移動"
          className="focus-visible:ring-ring flex h-full items-center text-sm font-semibold focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          <Plus className="size-5 shrink-0" aria-hidden="true" />

          {/*
            텍스트:
            - width 0 ↔ "auto" 로 가로 공간 자체를 모핑 (부모 컨테이너 너비가 자동으로 따라감)
            - marginLeft 0 ↔ 8 로 ＋ 아이콘과의 간격 조절 (gap-2 대신 자체 마진으로 정밀 제어)
            - opacity 로 페이드 인/아웃
          */}
          <m.span
            initial={false}
            animate={{
              width: collapsed ? 0 : "auto",
              marginLeft: collapsed ? 0 : 8,
              opacity: collapsed ? 0 : 1,
            }}
            transition={textTransition}
            className="overflow-hidden whitespace-nowrap"
          >
            サークルを登録
          </m.span>
        </Link>
      </m.div>
    </LazyMotion>
  );
}
