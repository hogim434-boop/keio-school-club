"use client";

/**
 * ProfileCompletion — 마이페이지 운영 카드(승인 상태)의 프로필 完成度 게이지.
 *
 * - % 막대 + "プロフィール完成度 N%" 표시
 * - 미완성 항목을 칩으로 나열, 각 칩 클릭 → 편집폼(/circles/[id]/edit)으로 이동해 채우게 유도
 *   (태그는 편집폼 태그 단계로 딥링크, 나머지는 기본 단계)
 * - 100% 면 「プロフィール完成！」 한 줄로 축약
 *
 * 등록은 최소만 받고(2026-05 A안) 여기서 점진 보강하도록 만든 컴포넌트.
 */

import Link from "next/link";
import { Plus } from "lucide-react";

import { computeProfileCompletion } from "@/lib/circles/profile-completion";
import type { MyCircle } from "@/lib/supabase/queries/circles";

export function ProfileCompletion({ circle }: { circle: MyCircle }) {
  const { percent, missing } = computeProfileCompletion(circle);

  // 편집폼 딥링크 — 태그는 태그 단계, 나머지는 기본 단계
  const editHref = (key: string) =>
    `/circles/${circle.id}/edit${key === "tags" ? "?step=tags" : ""}`;

  // 100% — 보강 완료. 간단한 완성 표시.
  if (percent === 100) {
    return <p className="text-muted-foreground text-xs font-medium">✓ プロフィール完成</p>;
  }

  return (
    <div className="space-y-2">
      {/* 헤더: 라벨 + 퍼센트 */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">プロフィール完成度</span>
        <span className="text-foreground font-semibold tabular-nums">{percent}%</span>
      </div>

      {/* 진행 막대 */}
      <div
        className="bg-muted h-1.5 w-full overflow-hidden rounded-full"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="プロフィール完成度"
      >
        <div
          className="bg-keio-navy h-full rounded-full transition-[width] duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* 미완성 항목 칩 — 클릭 시 편집폼으로 이동해 채우기 */}
      {missing.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {missing.map((item) => (
            <Link
              key={item.key}
              href={editHref(item.key)}
              className="border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-xs transition-colors"
            >
              <Plus className="size-3" aria-hidden="true" />
              {item.label_ja}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
