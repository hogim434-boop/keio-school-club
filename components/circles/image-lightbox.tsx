"use client";

/**
 * ImageLightbox — 앨범 탭 전체화면 이미지 뷰어.
 *
 * 구현 방식:
 * - 외부 라이브러리 없이 Radix Dialog + 가로 snap-scroll 로 구현.
 * - 리포트 상세 페이지 ReportGallery 의 snap-x snap-mandatory 패턴 재사용.
 * - open 시 tapped index 로 scrollIntoView (즉시, 스크롤 애니메이션 없음).
 *
 * 접근성:
 * - DialogContent aria-label 로 "アルバム" 레이블 부여.
 * - 이미지 alt 는 reportTitle 또는 서클명으로 의미있게 제공.
 * - useReducedMotion: 현재 scroll 동작 자체에는 영향 없음(브라우저 네이티브 스크롤).
 *
 * 카운터:
 * - 가로 스크롤 위치(scrollLeft / 컨테이너 폭)로 현재 index 를 계산 → n/total 표시.
 *   (IntersectionObserver 는 스와이프 중 갱신을 놓치는 경우가 있어 scroll 기반으로 교체)
 *
 * 하단 링크:
 * - 현재 이미지가 reportId 를 가지면 「投稿を見る」 링크 표시.
 * - 커버 이미지(isCover=true)는 링크 없음.
 * - 링크 클릭 시 Dialog 닫고 이동.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";

// ─────────────────────────────────────────────────────────────────────────────
// 타입
// ─────────────────────────────────────────────────────────────────────────────

export interface AlbumImage {
  /** 이미지 URL */
  url: string;
  /** 커버 이미지 여부 — true 면 「投稿を見る」 링크 없음 */
  isCover?: boolean;
  /** 연결된 활동 리포트 ID — 있으면 하단에 링크 표시 */
  reportId?: string;
  /** 리포트 제목 — 이미지 alt 텍스트로 사용 */
  reportTitle?: string;
}

interface ImageLightboxProps {
  /** 표시할 이미지 배열 */
  images: AlbumImage[];
  /** 서클 ID — 「投稿を見る」 링크 URL 생성용 */
  circleId: string;
  /** Dialog open 여부 */
  open: boolean;
  /** 처음 열릴 때 보여줄 이미지 index */
  initialIndex: number;
  /** open/close 제어 콜백 */
  onOpenChange: (open: boolean) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// 컴포넌트
// ─────────────────────────────────────────────────────────────────────────────

export function ImageLightbox({
  images,
  circleId,
  open,
  initialIndex,
  onOpenChange,
}: ImageLightboxProps) {
  // 현재 화면에 보이는 이미지 index (IntersectionObserver 기반)
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  // 스크롤 컨테이너 ref — 열릴 때 초기 index 로 즉시 이동
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // 각 이미지 셀 ref 배열 — IntersectionObserver 관찰 대상
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // ── 초기 scroll 위치 설정 ──────────────────────────────────────────────────
  // open 될 때마다 initialIndex 셀로 즉시 이동 (애니메이션 없이)
  useEffect(() => {
    if (!open) return;

    // Dialog 가 DOM 에 마운트된 후 실행되어야 하므로 requestAnimationFrame 으로 지연
    const frame = requestAnimationFrame(() => {
      const el = itemRefs.current[initialIndex];
      if (!el) return;
      el.scrollIntoView({
        behavior: "instant" as ScrollBehavior,
        block: "nearest",
        inline: "start",
      });
      setCurrentIndex(initialIndex);
    });

    return () => cancelAnimationFrame(frame);
  }, [open, initialIndex]);

  // ── 스크롤 위치 기반 현재 index 추적 ──────────────────────────────────────
  // 각 이미지 셀이 컨테이너 폭(w-full)과 같으므로, 안착 위치의 scrollLeft 는 index*폭.
  // round(scrollLeft / 폭) 로 현재 index 를 결정 → 스와이프/스냅 어느 경우든 정확히 갱신.
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const width = container.clientWidth;
    if (width === 0) return;
    const index = Math.round(container.scrollLeft / width);
    // 범위 클램프 후 동일 값이면 React 가 리렌더를 생략하므로 throttle 불필요
    const clamped = Math.max(0, Math.min(index, images.length - 1));
    setCurrentIndex(clamped);
  }, [images.length]);

  // ── 닫기 핸들러 ───────────────────────────────────────────────────────────
  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const total = images.length;
  const currentImage = images[currentIndex];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        {/* 배경 — 기본 DialogOverlay 의 bg-black/50 보다 불투명하게 */}
        <DialogOverlay className="bg-black/95" />

        {/*
         * 전체화면 콘텐츠 — 기본 DialogContent 의 rounded/padding/max-w 를 완전히 덮어씀.
         * showCloseButton=false: 기본 X 버튼 숨기고, 직접 구현한 X 버튼 사용.
         */}
        <DialogContent
          showCloseButton={false}
          aria-label="アルバム"
          className="inset-0 top-0 left-0 h-dvh w-screen max-w-none translate-x-0 translate-y-0 rounded-none border-0 bg-transparent p-0 shadow-none"
        >
          {/* 스크린리더용 숨겨진 제목 */}
          <DialogTitle className="sr-only">アルバム</DialogTitle>

          {/* 상단 바 — 카운터 + 닫기 버튼 */}
          <div className="absolute top-0 right-0 left-0 z-10 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent px-4 pt-[calc(env(safe-area-inset-top)+12px)] pb-3">
            {/* 카운터 */}
            <span className="text-sm font-medium text-white/90 tabular-nums">
              {total > 0 ? `${currentIndex + 1} / ${total}` : ""}
            </span>

            {/* 닫기 버튼 */}
            <button
              type="button"
              onClick={handleClose}
              aria-label="閉じる"
              className="flex size-9 items-center justify-center rounded-full bg-black/30 text-white transition-colors hover:bg-black/50 focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>

          {/*
           * 이미지 가로 snap-scroll 컨테이너.
           * - snap-x snap-mandatory: 각 이미지로 스냅
           * - overflow-x-auto: 가로 스크롤 허용
           * - overscroll-x-contain: 부모 세로 스크롤로 전파 방지
           * - h-full w-full: 전체화면 채움
           */}
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex h-full w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
            style={{ scrollbarWidth: "none" }} // 스크롤바 숨김 (Firefox)
          >
            {images.map((img, i) => (
              <div
                key={`${img.url}-${i}`}
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                className="relative flex h-full w-full shrink-0 snap-center snap-always items-center justify-center"
              >
                <Image
                  src={img.url}
                  alt={img.reportTitle ?? "サークル写真"}
                  fill
                  sizes="100vw"
                  className="object-contain"
                  priority={i === initialIndex}
                />
              </div>
            ))}
          </div>

          {/* 하단 링크 — 리포트 사진에만 표시 */}
          {currentImage && currentImage.reportId && !currentImage.isCover && (
            <div className="absolute right-0 bottom-[calc(env(safe-area-inset-bottom)+16px)] left-0 flex justify-center px-4">
              <Link
                href={`/circles/${circleId}/reports/${currentImage.reportId}`}
                onClick={handleClose}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-5 py-2.5 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/25 focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none"
              >
                投稿を見る
              </Link>
            </div>
          )}
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
