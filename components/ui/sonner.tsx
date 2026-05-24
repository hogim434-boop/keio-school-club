"use client";

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

// 다크모드 제거로 theme 은 항상 "light" 고정 (이전엔 next-themes useTheme() 사용).
//
// 스타일 컨셉 — 「하단 다크 알약」(토스·당근 풍):
//  - position: bottom-center, 모바일은 하단 탭바(≈64px) 위로 띄우기 위해 mobileOffset 으로 회피.
//  - 다크 배경 + 흰 글씨 + 알약(rounded-full) + 내용폭(w-auto) + 그림자.
//  - richColors / closeButton 미사용(자동 fade-out) — 깔끔한 한 줄 알림.
//  - 타입별 색은 배경이 아니라 아이콘 색으로만 구분(다크 배경 위에서 또렷).
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      position="bottom-center"
      // 표시 시간 단축 — 기본 4초 → 2초
      duration={2000}
      // 모바일: 하단 탭바 위로 충분히 띄움 / 데스크탑: 일반 하단 여백
      mobileOffset={{ bottom: "80px" }}
      offset={{ bottom: "24px" }}
      // 타입별 아이콘 — 다크 배경에서 또렷하게 보이도록 컬러 부여
      icons={{
        success: <CircleCheckIcon className="size-4 text-emerald-400" />,
        info: <InfoIcon className="size-4 text-sky-400" />,
        warning: <TriangleAlertIcon className="size-4 text-amber-400" />,
        error: <OctagonXIcon className="size-4 text-red-400" />,
        loading: <Loader2Icon className="size-4 animate-spin text-white/70" />,
      }}
      toastOptions={{
        classNames: {
          // 알약 본체: 내용폭(w-fit) + 중앙 정렬(가로/내부) + 다크 배경 + 흰 글씨 + 큰 라운드 + 그림자
          toast:
            "group !mx-auto !flex !w-fit !max-w-[90vw] !items-center !justify-center !gap-2.5 !rounded-full !border-0 !bg-neutral-900 !px-5 !py-3 !text-white !shadow-xl",
          title: "!text-sm !font-medium !whitespace-nowrap !text-white",
          description: "!text-xs !text-white/70",
          icon: "!m-0",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
