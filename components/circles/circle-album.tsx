"use client";

/**
 * CircleAlbum — 앨범 탭 콘텐츠.
 *
 * 이미지 구성 (자동 집계, 추가 쿼리 없음):
 * - 커버 이미지 (circle.cover_image_url) — 맨 앞, isCover=true
 * - 활동 리포트(activity_reports) 의 images — 최신순 순서 유지
 *
 * 레이아웃:
 * - Facebook "Media" 방식 평면 정사각 그리드
 * - 모바일 3열 / md 4열 / lg 5열
 * - gap-[2px]: 셀 간격 최소화로 밀집된 갤러리 느낌
 *
 * 탭하면 ImageLightbox 가 열림 (전체화면, 좌우 스와이프, 카운터, 닫기).
 * 빈 상태: 이미지가 0장이면 안내 메시지 표시.
 */

import { useState } from "react";
import Image from "next/image";
import { ImageOff } from "lucide-react";

import { ImageLightbox, type AlbumImage } from "@/components/circles/image-lightbox";

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface CircleAlbumProps {
  /** 앨범에 표시할 이미지 배열 (커버 → 리포트 사진 순) */
  images: AlbumImage[];
  /** 서클 ID — 라이트박스의 「投稿を見る」 링크 URL 생성용 */
  circleId: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 컴포넌트
// ─────────────────────────────────────────────────────────────────────────────

export function CircleAlbum({ images, circleId }: CircleAlbumProps) {
  // 라이트박스 상태
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // 셀 클릭 → 해당 index 로 라이트박스 open
  function handleCellClick(index: number) {
    setLightboxIndex(index);
    setLightboxOpen(true);
  }

  // ── 빈 상태 ──────────────────────────────────────────────────────────────
  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <ImageOff
          className="text-muted-foreground/40 size-12"
          aria-hidden="true"
          strokeWidth={1.5}
        />
        <div className="space-y-1">
          <p className="text-muted-foreground text-sm font-medium">まだ写真がありません</p>
          <p className="text-muted-foreground/60 text-xs">活動を投稿すると写真が追加されます</p>
        </div>
      </div>
    );
  }

  // ── 그리드 ───────────────────────────────────────────────────────────────
  return (
    <>
      {/*
       * 정사각 그리드 — Facebook "Media" 방식 평면 배치.
       * 음수 마진(-mx-4) 금지: 탭 캐러셀 패널(w-1/3 트랙) 폭을 넘쳐 우측 열이 잘리고
       *   인접 패널이 비쳐 보이는 문제가 발생하므로, 패널 폭 안에 맞춘다(w-full).
       * gap-[2px]: 셀 간격 최소화.
       * grid-cols-3: 모바일 기본 3열. md:4열, lg:5열.
       */}
      <div
        className="grid grid-cols-3 gap-[2px] md:grid-cols-4 lg:grid-cols-5"
        role="list"
        aria-label="アルバム"
      >
        {images.map((img, index) => (
          <button
            key={`${img.url}-${index}`}
            type="button"
            role="listitem"
            onClick={() => handleCellClick(index)}
            aria-label={img.reportTitle ?? (img.isCover ? "カバー写真" : `写真 ${index + 1}`)}
            className="group bg-muted focus-visible:ring-keio-navy relative aspect-square w-full overflow-hidden focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
          >
            <Image
              src={img.url}
              alt={img.reportTitle ?? (img.isCover ? "カバー写真" : `写真 ${index + 1}`)}
              fill
              sizes="(min-width: 1024px) 20vw, (min-width: 768px) 25vw, 33vw"
              className="object-cover transition-transform duration-200 group-hover:scale-105 group-active:scale-100"
            />
          </button>
        ))}
      </div>

      {/* 라이트박스 — 탭한 이미지 index 에서 시작 */}
      <ImageLightbox
        images={images}
        circleId={circleId}
        open={lightboxOpen}
        initialIndex={lightboxIndex}
        onOpenChange={setLightboxOpen}
      />
    </>
  );
}
