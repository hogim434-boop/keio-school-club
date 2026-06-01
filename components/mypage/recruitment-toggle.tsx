"use client";

/**
 * RecruitmentToggle — 모집 상태 빠른 토글 (운영 카드 전용)
 *
 * recruitment_status 는 2개 값(둘 다 "모집 중" 상태):
 * - newcomer_only(新歓シーズン): 4월 신입생 환영 시즌 집중 모집
 * - year_round(通年募集): 시기 무관 상시 모집
 *
 * 운영자가 마이페이지에서 별도 편집 화면 없이 즉시 정책을 전환할 수 있게 한다.
 *
 * 동작:
 * - 세그먼트 2버튼 중 하나 탭 → 낙관적으로 즉시 강조 전환(setStatus)
 * - useTransition 으로 Server Action 호출 → 실패 시 이전 값으로 롤백
 *
 * 접근성/모션:
 * - role="group" + aria-pressed 로 현재 선택 전달
 * - whileTap scale 피드백, useReducedMotion() 시 비활성
 */

import { useState, useTransition } from "react";
import { useReducedMotion } from "motion/react";
import * as m from "motion/react-m";

import { updateRecruitmentStatus } from "@/app/(tabs)/mypage/actions";
import {
  RECRUITMENT_STATUSES,
  RECRUITMENT_STATUS_LABELS,
  type RecruitmentStatus,
} from "@/lib/constants/recruitment-status";
import { cn } from "@/lib/utils";

interface RecruitmentToggleProps {
  /** 대상 동아리 UUID */
  circleId: string;
  /** 현재 모집 상태 */
  current: RecruitmentStatus;
}

export function RecruitmentToggle({ circleId, current }: RecruitmentToggleProps) {
  /* 낙관적 표시용 로컬 상태 — Server Action 결과에 따라 확정/롤백 */
  const [status, setStatus] = useState<RecruitmentStatus>(current);
  /* Server Action 진행 여부 */
  const [isPending, startTransition] = useTransition();
  /* OS "동작 줄이기" 감지 */
  const shouldReduceMotion = useReducedMotion();

  /** 세그먼트 선택 — 동일 값이거나 진행 중이면 무시, 아니면 낙관적 전환 후 액션 호출 */
  function handleSelect(next: RecruitmentStatus) {
    if (next === status || isPending) return;
    const prev = status;
    setStatus(next); // 낙관적 즉시 반영
    startTransition(async () => {
      const res = await updateRecruitmentStatus(circleId, next);
      if (!res.ok) setStatus(prev); // 실패 시 롤백
    });
  }

  return (
    <div className="space-y-1.5">
      {/* 라벨 */}
      <p className="text-muted-foreground text-xs font-medium">募集状況</p>

      {/* 세그먼트 컨트롤 — 2버튼 균등 */}
      <div
        role="group"
        aria-label="募集状況の切り替え"
        className="bg-muted/60 grid grid-cols-3 gap-1 rounded-lg p-1"
      >
        {RECRUITMENT_STATUSES.map((s) => {
          const active = s === status;
          return (
            <m.button
              key={s}
              type="button"
              onClick={() => handleSelect(s)}
              disabled={isPending}
              aria-pressed={active}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
              transition={{ duration: 0.12 }}
              className={cn(
                "rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                // 선택됨: keio-navy 강조 / 미선택: 흐린 텍스트
                active
                  ? "bg-keio-navy text-keio-navy-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
                // 진행 중 살짝 흐리게
                isPending && "opacity-60"
              )}
            >
              {RECRUITMENT_STATUS_LABELS[s]}
            </m.button>
          );
        })}
      </div>
    </div>
  );
}
