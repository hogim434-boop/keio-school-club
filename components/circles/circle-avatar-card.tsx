import Image from "next/image";
import { Construction } from "lucide-react";

import { CircleCardLink } from "@/components/circles/circle-card-link";
import { circleHref } from "@/lib/circles/slug";
import type { CircleSummary } from "@/lib/types/domain";

interface CircleAvatarCardProps {
  circle: CircleSummary;
}

/**
 * 원형 아바타 카드 (RSC) — Instagram Story 톤.
 * HourlyCategoryStrip 의 가로 스크롤 안에서 사용.
 *
 * 디자인:
 * - 80×80 원형 썸네일 (`rounded-full` + `ring-1 ring-black/5`)
 * - 하단 서클명 2줄 자름
 * - hover 시 ring 강조
 *
 * favorite 토글은 작은 원형에 어울리지 않아 생략. 카드 탭 → 상세 페이지로 이동 후 토글.
 */
export function CircleAvatarCard({ circle }: CircleAvatarCardProps) {
  const { name, cover_image_url } = circle;

  return (
    <CircleCardLink
      href={circleHref(circle)}
      className="group focus-visible:ring-ring block w-20 shrink-0 rounded-2xl text-center focus-visible:ring-2 focus-visible:outline-none"
    >
      <div
        className="bg-muted group-hover:ring-foreground/20 relative mx-auto size-20 overflow-hidden rounded-full ring-1 ring-black/5 transition group-hover:ring-2"
        role={cover_image_url ? undefined : "img"}
        aria-label={cover_image_url ? undefined : name}
      >
        {cover_image_url ? (
          <Image src={cover_image_url} alt={name} fill sizes="80px" className="object-cover" />
        ) : (
          <div className="text-muted-foreground flex h-full w-full items-center justify-center">
            <Construction className="size-6" aria-hidden="true" />
          </div>
        )}
      </div>
      {/* 서클명 — 80px 폭에 맞춰 2 줄까지 자연스럽게 줄바꿈 */}
      <p className="mt-2 line-clamp-2 text-[11px] leading-tight font-medium">{name}</p>
    </CircleCardLink>
  );
}
