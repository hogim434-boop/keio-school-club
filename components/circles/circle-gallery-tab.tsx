"use client";

/**
 * CircleGalleryTab — アルバム 탭 갤러리 그리드.
 *
 * 역할:
 * - listGalleries() 로 취득한 circle_galleries 행을 표시.
 * - 학기 필터(GallerySemesterFilter)로 기간 좁히기.
 * - 기존 CircleAlbum / ImageLightbox 재사용.
 *
 * 구조:
 * ┌──────────────────────────────────┐
 * │  GallerySemesterFilter           │  ← 학기 칩 바 (학기 2개 이상일 때만 표시)
 * ├──────────────────────────────────┤
 * │  3열 정사각 그리드               │  ← ImageLightbox 연결
 * │  (빈 상태 시 안내 메시지)        │
 * └──────────────────────────────────┘
 *
 * 데이터 흐름:
 * - Server Component(page.tsx)에서 listGalleries() 결과를 prop으로 받아옴.
 *   → 클라이언트에서 추가 fetch 없음. 학기 필터는 클라이언트 측 useMemo 로 처리.
 *
 * 빈 상태:
 * - circle_galleries 가 0건: 「まだギャラリーがありません」
 * - 필터 결과 0건: 「この学期の写真はありません」
 */

import { useMemo, useState } from "react";
import Image from "next/image";
import { ImageOff } from "lucide-react";

import { GallerySemesterFilter } from "@/components/circles/gallery-semester-filter";
import { ImageLightbox } from "@/components/circles/image-lightbox";
import type { AlbumImage } from "@/components/circles/image-lightbox";
import type { GalleryImage, SemesterFilter } from "@/lib/supabase/queries/circle-galleries";
import {
  currentSemesterFilter,
  extractSemesters,
  isInSemester,
} from "@/lib/supabase/queries/circle-galleries";

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface CircleGalleryTabProps {
  /** 서클 UUID — ImageLightbox 의 「投稿を見る」 링크 생성용 */
  circleId: string;
  /** listGalleries() 결과 — Server Component에서 전달 */
  galleries: GalleryImage[];
}

// ─────────────────────────────────────────────────────────────────────────────
// 컴포넌트
// ─────────────────────────────────────────────────────────────────────────────

export function CircleGalleryTab({ circleId, galleries }: CircleGalleryTabProps) {
  // ── 학기 필터 상태 ──────────────────────────────────────────────────────────
  // 초기값: 현재 학기. 이미지가 현재 학기에 없으면 "all" 로 폴백.
  const semesters = useMemo(() => extractSemesters(galleries), [galleries]);

  const [selectedFilter, setSelectedFilter] = useState<SemesterFilter>(() => {
    const current = currentSemesterFilter();
    // 현재 학기 이미지가 있으면 현재 학기를, 없으면 "all" 선택
    return semesters.includes(current) ? current : "all";
  });

  // ── 필터 적용 ───────────────────────────────────────────────────────────────
  const filteredGalleries = useMemo(() => {
    if (selectedFilter === "all") return galleries;
    return galleries.filter((img) =>
      isInSemester(img.taken_at ?? img.created_at, selectedFilter)
    );
  }, [galleries, selectedFilter]);

  // ── ImageLightbox 용 AlbumImage 변환 ────────────────────────────────────────
  // circle_galleries는 reportId가 없으므로 「投稿を見る」 링크 미표시
  const albumImages: AlbumImage[] = useMemo(
    () =>
      filteredGalleries.map((img) => ({
        url: img.image_url,
        // caption이 있으면 alt 텍스트로 활용
        reportTitle: img.caption || undefined,
      })),
    [filteredGalleries]
  );

  // ── 라이트박스 상태 ─────────────────────────────────────────────────────────
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  function handleCellClick(index: number) {
    setLightboxIndex(index);
    setLightboxOpen(true);
  }

  // ── 전체 비어 있을 때 ───────────────────────────────────────────────────────
  if (galleries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <ImageOff
          className="text-muted-foreground/40 size-12"
          aria-hidden="true"
          strokeWidth={1.5}
        />
        <div className="space-y-1">
          <p className="text-muted-foreground text-sm font-medium">
            まだギャラリーがありません
          </p>
          <p className="text-muted-foreground/60 text-xs">
            活動写真を追加するとここに表示されます
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 학기 필터 — 학기가 1종류 이상일 때만 표시 */}
      {semesters.length > 0 && (
        <GallerySemesterFilter
          semesters={semesters}
          selectedFilter={selectedFilter}
          onFilterChange={setSelectedFilter}
        />
      )}

      {/* 필터 결과 비어 있을 때 */}
      {filteredGalleries.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <ImageOff
            className="text-muted-foreground/40 size-10"
            aria-hidden="true"
            strokeWidth={1.5}
          />
          <p className="text-muted-foreground text-sm">この学期の写真はありません</p>
        </div>
      ) : (
        <>
          {/*
           * 정사각 그리드 — CircleAlbum 과 동일한 레이아웃.
           * 모바일 3열 / md 4열 / lg 5열, gap-[2px] 밀집 배치.
           */}
          <div
            className="grid grid-cols-3 gap-[2px] md:grid-cols-4 lg:grid-cols-5"
            role="list"
            aria-label="ギャラリー"
          >
            {filteredGalleries.map((img, index) => (
              <button
                key={img.id}
                type="button"
                role="listitem"
                onClick={() => handleCellClick(index)}
                aria-label={img.caption || `写真 ${index + 1}`}
                className="group bg-muted focus-visible:ring-keio-navy relative aspect-square w-full overflow-hidden focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
              >
                <Image
                  src={img.image_url}
                  alt={img.caption || `ギャラリー写真 ${index + 1}`}
                  fill
                  sizes="(min-width: 1024px) 20vw, (min-width: 768px) 25vw, 33vw"
                  className="object-cover transition-transform duration-200 group-hover:scale-105 group-active:scale-100"
                />
              </button>
            ))}
          </div>

          {/* 이미지 수 표시 */}
          <p className="text-muted-foreground/60 text-center text-xs">
            {filteredGalleries.length}枚の写真
          </p>
        </>
      )}

      {/* 라이트박스 */}
      <ImageLightbox
        images={albumImages}
        circleId={circleId}
        open={lightboxOpen}
        initialIndex={lightboxIndex}
        onOpenChange={setLightboxOpen}
      />
    </div>
  );
}
