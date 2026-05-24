"use client";

/**
 * CoverCarousel — 서클 상세 페이지의 커버 이미지 가로 스크롤 캐러셀.
 *
 * 동작:
 *  - 1장: 단일 next/image (현 CoverImage 와 동일 비율·fill·priority)
 *  - 2장 이상: 풀-블리드 snap-x snap-mandatory 가로 캐러셀 + 하단 dots 인디케이터
 *
 * 구현 방침:
 *  - useReducedMotion: 없음(스냅 스크롤은 브라우저 네이티브 — 모션 라이브러리 불필요)
 *  - 라이트 전용 (dark: 클래스 금지)
 *  - DetailPageHeader overlay(뒤로가기/홈/공유)는 absolute 로 커버 위에 유지됨
 *  - scrollLeft / clientWidth 로 currentIndex 추적 (image-lightbox.tsx 패턴)
 *  - dots: 활성 w-4 / 비활성 w-1.5 (promo-tile-carousel.tsx 패턴)
 */

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import { Construction } from "lucide-react";

import { DetailPageHeader } from "@/components/circles/detail-page-header";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// 타입
// ─────────────────────────────────────────────────────────────────────────────

interface CoverImage {
  id: string;
  image_url: string;
}

interface CoverCarouselProps {
  /** 커버 이미지 목록 — sort_order 오름차순, 첫 장이 대표 */
  images: CoverImage[];
  /** 서클 이름 — alt 텍스트 + DetailPageHeader 에 전달 */
  circleName: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 컴포넌트
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 서클 상세 페이지 커버 이미지 캐러셀.
 *
 * 1장: 단일 이미지 렌더 (캐러셀 UI 없음).
 * 2장 이상: 가로 스냅 스크롤 + 하단 dots 인디케이터.
 *
 * DetailPageHeader(뒤로가기/홈/공유 overlay)는 항상 커버 위에 렌더된다.
 */
export function CoverCarousel({ images, circleName }: CoverCarouselProps) {
  // 스크롤 컨테이너 ref — scrollLeft / clientWidth 로 currentIndex 계산
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  /**
   * scroll 이벤트 핸들러 — image-lightbox.tsx:110-119 패턴.
   * 각 셀이 컨테이너 폭(w-full) 과 동일하므로 round(scrollLeft / 폭) 로 index 결정.
   */
  const handleScroll = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;
    const width = container.clientWidth;
    if (width === 0) return;
    const index = Math.round(container.scrollLeft / width);
    const clamped = Math.max(0, Math.min(index, images.length - 1));
    setCurrentIndex(clamped);
  }, [images.length]);

  // ── 이미지 없음: 아이콘 플레이스홀더 ──────────────────────────────────────
  if (images.length === 0) {
    return (
      <div className="bg-muted relative aspect-[16/9] w-full md:aspect-[21/9]">
        <div className="text-muted-foreground flex h-full w-full items-center justify-center">
          <Construction className="h-12 w-12" />
        </div>
        <DetailPageHeader circleName={circleName} />
      </div>
    );
  }

  // ── 1장: 단일 이미지 (캐러셀 불필요) ─────────────────────────────────────
  if (images.length === 1) {
    return (
      <div className="bg-muted relative aspect-[16/9] w-full md:aspect-[21/9]">
        <Image
          src={images[0].image_url}
          alt={circleName}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        {/* DetailPageHeader overlay — 뒤로가기·홈·공유 */}
        <DetailPageHeader circleName={circleName} />
      </div>
    );
  }

  // ── 2장 이상: 풀-블리드 스냅 캐러셀 ──────────────────────────────────────
  return (
    <div className="relative">
      {/*
       * 스크롤 컨테이너:
       * - flex snap-x snap-mandatory: 셀 단위 스냅
       * - overflow-x-auto: 가로 스크롤 허용
       * - overscroll-behavior-x:contain: 상위 스크롤 연쇄 방지
       * - [scroll-padding-inline:0px]: 스냅 앵커 오프셋 0 (풀블리드이므로 padding 불필요)
       * - scrollbar-hide: 스크롤바 숨김 (webkit + 표준)
       * - activity-reports-preview.tsx 의 풀-블리드 패턴 참조
       */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className={cn(
          "flex snap-x snap-mandatory overflow-x-auto",
          "[overscroll-behavior-x:contain] [scroll-padding-inline:0px]",
          // 스크롤바 숨김
          "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        )}
        aria-roledescription="carousel"
        aria-label={`${circleName}のカバー画像`}
      >
        {images.map((img, idx) => (
          <div
            key={img.id}
            className="aspect-[16/9] w-full shrink-0 snap-start md:aspect-[21/9]"
            role="group"
            aria-roledescription="slide"
            aria-label={`${images.length}枚のうち ${idx + 1}枚目`}
          >
            <div className="bg-muted relative h-full w-full">
              <Image
                src={img.image_url}
                alt={`${circleName} カバー画像 ${idx + 1}`}
                fill
                priority={idx === 0} // 첫 장만 priority(LCP 개선)
                sizes="100vw"
                className="object-cover"
              />
            </div>
          </div>
        ))}
      </div>

      {/*
       * DetailPageHeader overlay — absolute 로 캐러셀 위에 유지.
       * 캐러셀 컨테이너(relative) 의 position:absolute 자식이므로
       * 스크롤에 영향받지 않고 항상 상단에 고정된다.
       */}
      <DetailPageHeader circleName={circleName} />

      {/*
       * 우측 하단 매수 카운터 — 「현재/전체」(예: 1 / 3).
       * 어두운 반투명 pill + 흰 글씨, tabular-nums 로 폭 흔들림 방지.
       */}
      <div
        aria-live="polite"
        className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white tabular-nums"
      >
        {currentIndex + 1} / {images.length}
      </div>
    </div>
  );
}
