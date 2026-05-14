"use client";

import { useState } from "react";
import Image from "next/image";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { CircleImage } from "@/lib/types/domain";

interface CircleGalleryProps {
  images: CircleImage[];
  circleName: string;
}

// 서클 갤러리 컴포넌트 (Client) — T-012
// 모바일(md 미만): 가로 swipe 캐러셀 (overflow-x-auto + snap-x mandatory)
// 데스크탑(md+): 3열 그리드 + 클릭 시 shadcn Dialog 전체화면 (좌우 도트 인디케이터 대신 단순 src 표시)
// 이미지 0개면 null — 더미 30건 모두 4장이므로 현재는 항상 렌더됨
export function CircleGallery({ images, circleName }: CircleGalleryProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (images.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">ギャラリー</h2>

      {/* 모바일: 가로 swipe */}
      <div className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 md:hidden">
        {images.map((img, i) => (
          <div
            key={img.id}
            className="bg-muted relative aspect-[16/9] w-[85%] flex-shrink-0 snap-start overflow-hidden rounded-md"
          >
            <Image
              src={img.image_url}
              alt={`${circleName} の写真 ${i + 1}`}
              fill
              sizes="90vw"
              className="object-cover"
            />
          </div>
        ))}
      </div>

      {/* 데스크탑: 3열 그리드 + Dialog */}
      <div className="hidden gap-2 md:grid md:grid-cols-3">
        {images.map((img, i) => (
          <button
            key={img.id}
            type="button"
            onClick={() => setOpenIndex(i)}
            aria-label={`${circleName} の写真 ${i + 1} を拡大表示`}
            className="bg-muted focus-visible:ring-ring relative aspect-[16/9] overflow-hidden rounded-md transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            <Image
              src={img.image_url}
              alt={`${circleName} の写真 ${i + 1}`}
              fill
              sizes="33vw"
              className="object-cover"
            />
          </button>
        ))}
      </div>

      {/* 전체화면 Dialog (데스크탑에서만 실제로 트리거됨) */}
      <Dialog
        open={openIndex !== null}
        onOpenChange={(o) => {
          if (!o) setOpenIndex(null);
        }}
      >
        <DialogContent className="max-w-4xl p-2">
          <DialogHeader>
            <DialogTitle className="sr-only">{circleName} のギャラリー</DialogTitle>
          </DialogHeader>
          {openIndex !== null && (
            <div className="bg-muted relative aspect-[3/2] w-full overflow-hidden rounded-md">
              <Image
                src={images[openIndex].image_url}
                alt={`${circleName} の写真 ${openIndex + 1}`}
                fill
                sizes="80vw"
                className="object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
