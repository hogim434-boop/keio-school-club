"use client";

import Link from "next/link";
import { useContext } from "react";
import { ChevronLeft, Home, Share2 } from "lucide-react";
import { toast } from "sonner";

import { SlideOutContext } from "@/app/circles/[id]/template";
import { cn } from "@/lib/utils";

interface DetailPageHeaderProps {
  /** 공유 메시지에 포함될 서클명 */
  circleName: string;
}

/**
 * 서클 상세 페이지 전용 오버레이 헤더 (메루카리 패턴).
 *
 * - 좌측: 「戻る」 (슬라이드 아웃 트리거) + 「ホームに移動」 (홈 진입)
 * - 우측: 「共有」 (Web Share API + 데스크탑 clipboard fallback + sonner toast)
 * - 흰 아이콘 + 반투명 검은 원형 배경 — 이미지 어두운·밝은 영역 모두 가독성
 * - cover image 위 absolute overlay (z-20)
 * - safe-area-inset-top 으로 notch·status bar 회피
 */
export function DetailPageHeader({ circleName }: DetailPageHeaderProps) {
  const slideOut = useContext(SlideOutContext);

  // 공유 — 모바일 native share sheet 또는 데스크탑 clipboard 복사 + toast
  async function handleShare() {
    if (typeof window === "undefined") return;
    const url = window.location.href;
    const text = `${circleName} | KCircle`;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: text, text, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("URLをコピーしました");
      }
    } catch {
      // share 시트 cancel·clipboard 실패 등 — 사용자 의도된 취소나 권한 거부라 무시
    }
  }

  // 공통 원형 아이콘 버튼 클래스 — hit target 40×40px + focus ring + 다크 모드 친화
  const iconButton = cn(
    "inline-flex h-10 w-10 items-center justify-center rounded-full",
    "bg-black/40 text-white backdrop-blur-sm",
    "transition-colors hover:bg-black/60",
    "focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-0 focus-visible:outline-none"
  );

  return (
    <div
      className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-4 pb-2"
      style={{ paddingTop: "max(env(safe-area-inset-top), 1rem)" }}
    >
      <div className="flex gap-2">
        <button type="button" onClick={slideOut} aria-label="戻る" className={iconButton}>
          <ChevronLeft className="size-5" aria-hidden="true" />
        </button>
        <Link href="/" aria-label="ホームに移動" className={iconButton}>
          <Home className="size-5" aria-hidden="true" />
        </Link>
      </div>
      <button type="button" onClick={handleShare} aria-label="共有" className={iconButton}>
        <Share2 className="size-5" aria-hidden="true" />
      </button>
    </div>
  );
}
