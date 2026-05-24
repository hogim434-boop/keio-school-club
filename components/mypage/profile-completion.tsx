"use client";

/**
 * ProfileCompletion — 마이페이지·상세(소유자) 카드의 프로필 完成度 게이지.
 *
 * 2026-05 유도 강화(A+B+C) + 비주얼 개선:
 *  - (A) 다음 추천 항목 아래에 "채우면 좋은 이유(benefit_ja)" 한 줄 노출.
 *  - (B) % 옆에 진행 단계 배지(設定中 / 入力中 / もうすぐ完成 / 完成) 표시.
 *  - (C) 미완성 중 우선순위 1위를 컬러 아이콘 미니 카드로 콕 집어 행동 유도.
 *  - 100% 최초 도달 시 콘페티 1회(localStorage 로 중복 방지, reduced-motion 시 생략).
 *  - 시작점은 基本情報 1칸 포함이라 신규 동아리도 0% 가 아닌 ~14% 부터(막막함 완화).
 *
 * 추천 카드 클릭 → 편집폼(/circles/[id]/edit)의 해당 항목으로 딥링크 이동(focus 스크롤).
 */

import { useEffect } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileText,
  ImageIcon,
  Sparkles,
  Tag,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useReducedMotion } from "motion/react";

import {
  computeProfileCompletion,
  type CompletionInput,
  type CompletionKey,
  type CompletionStage,
} from "@/lib/circles/profile-completion";
import { cn } from "@/lib/utils";

/** 完成度 계산 + 편집 링크에 필요한 최소 필드 (MyCircle·CircleDetail 모두 호환) */
type CompletionCircle = { id: string } & CompletionInput;

/** 항목별 컬러 아이콘 — 단조로운 텍스트를 알록달록하게 */
const ITEM_VISUAL: Record<CompletionKey, { icon: LucideIcon; cls: string }> = {
  basic: { icon: Sparkles, cls: "bg-muted text-muted-foreground" }, // 항상 done — 실제 노출 안 됨
  description: {
    icon: FileText,
    cls: "bg-sky-100 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400",
  },
  cover: {
    icon: ImageIcon,
    cls: "bg-violet-100 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400",
  },
  tags: {
    icon: Tag,
    cls: "bg-pink-100 text-pink-600 dark:bg-pink-950/40 dark:text-pink-400",
  },
  time_band: {
    icon: Clock,
    cls: "bg-cyan-100 text-cyan-600 dark:bg-cyan-950/40 dark:text-cyan-400",
  },
  days: {
    icon: CalendarDays,
    cls: "bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
  },
  member_band: {
    icon: Users,
    cls: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
  },
};

/** 단계 레이블 톤 → Tailwind 색 클래스 */
const STAGE_TONE_CLS: Record<CompletionStage["tone"], string> = {
  muted: "bg-muted text-muted-foreground",
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  navy: "bg-keio-navy/10 text-keio-navy dark:bg-keio-navy/20",
  complete: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
};

export function ProfileCompletion({ circle }: { circle: CompletionCircle }) {
  const { percent, nextRecommended, stage } = computeProfileCompletion(circle);
  const reducedMotion = useReducedMotion();

  // 편집폼 딥링크 — 태그는 태그 단계로, 나머지(basic 단계 항목)는 해당 섹션으로 자동 스크롤되도록 focus 부여
  const editHref = (key: string) =>
    key === "tags"
      ? `/circles/${circle.id}/edit?step=tags`
      : `/circles/${circle.id}/edit?step=basic&focus=${key}`;

  // 100% 최초 도달 시 1회만 콘페티 — localStorage 로 중복 방지, reduced-motion 시 생략(WCAG)
  useEffect(() => {
    if (percent !== 100 || reducedMotion) return;
    if (typeof window === "undefined") return;
    const flagKey = `kcircle_profile_celebrated_${circle.id}`;
    if (localStorage.getItem(flagKey)) return; // 이미 축하함
    localStorage.setItem(flagKey, "1");
    // 동적 import — 초기 번들에 confetti 미포함(완성 순간에만 로드)
    void import("canvas-confetti").then(({ default: confetti }) => {
      confetti({
        particleCount: 90,
        spread: 75,
        startVelocity: 38,
        origin: { y: 0.7 },
        // 慶應 네이비 + 골드 포인트 + 화이트 + 라이트블루
        colors: ["#2b3f5e", "#f5b301", "#ffffff", "#5b8def"],
      });
    });
  }, [percent, reducedMotion, circle.id]);

  // 100% — 보강 완료. 완성 카드(화사하게 강조).
  if (percent === 100) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 dark:border-emerald-900/50 dark:bg-emerald-950/30">
        <CheckCircle2
          className="size-5 shrink-0 text-emerald-500 dark:text-emerald-400"
          aria-hidden="true"
        />
        <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
          プロフィール完成！
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {/* 헤더: 라벨 + 단계 배지(B) + 퍼센트 */}
      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="text-muted-foreground shrink-0">プロフィール完成度</span>
          {/* (B) 진행 단계 레이블 배지 */}
          <span
            className={cn(
              "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
              STAGE_TONE_CLS[stage.tone]
            )}
          >
            {stage.label_ja}
          </span>
        </div>
        <span className="text-foreground shrink-0 text-sm font-bold tabular-nums">{percent}%</span>
      </div>

      {/* 진행 막대 — 네이비→블루 그라데이션으로 생기 부여 */}
      <div
        className="bg-muted h-2 w-full overflow-hidden rounded-full"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="プロフィール完成度"
      >
        <div
          className="from-keio-navy h-full rounded-full bg-gradient-to-r to-blue-500 transition-[width] duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* (C) 다음 추천 행동 — 컬러 아이콘 미니 카드 + (A) 혜택 카피 */}
      {nextRecommended &&
        (() => {
          const visual = ITEM_VISUAL[nextRecommended.key];
          const Icon = visual.icon;
          return (
            <div className="space-y-1 pt-0.5">
              <p className="text-muted-foreground text-[11px] font-medium">次のおすすめ</p>
              <Link
                href={editHref(nextRecommended.key)}
                className="group border-border bg-card hover:border-keio-navy/30 hover:bg-muted/40 flex items-center gap-3 rounded-xl border p-2.5 transition-colors"
              >
                {/* 항목 컬러 아이콘 */}
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-lg",
                    visual.cls
                  )}
                >
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="text-foreground flex items-center gap-1 text-sm font-semibold">
                    {nextRecommended.label_ja}を追加
                    <ArrowRight
                      className="text-keio-navy size-3.5 transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </span>
                  {nextRecommended.benefit_ja && (
                    <span className="text-muted-foreground mt-0.5 block text-[11px] leading-snug">
                      {nextRecommended.benefit_ja}
                    </span>
                  )}
                </span>
              </Link>
            </div>
          );
        })()}
    </div>
  );
}
