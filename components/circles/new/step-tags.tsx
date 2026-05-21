"use client";

/**
 * StepTags — 서클 등록 2단계: 태그 선택
 *
 * 담당 필드: tags (string[], 최대 5개)
 *
 * 구조:
 *  - FormProvider(CircleRegistrationForm) 아래에서 useFormContext<RegistrationValues>() 로 접근
 *  - 제출 버튼 없음 — 단계 이동은 컨테이너 footer의 "次へ" 버튼이 담당
 *  - 선택 0개도 다음 단계 진행 가능 (tags 는 optional — schema max(5) 만 있음)
 *
 * 태그 데이터:
 *  - filter-labels.ts 의 TAG_SEEDS 정적 상수 7종을 사용 (DB 조회 없음)
 *  - filter-panel.tsx 도 동일한 TAG_SEEDS 를 사용 중 → 동일 소스에서 참조
 *  - kind 그룹핑은 DB 마이그레이션 후 tags 테이블 fetch 시점에 도입 예정
 *
 * 애니메이션: step-contact.tsx 와 동일한 FADE_UP stagger 패턴
 */

import { useFormContext } from "react-hook-form";
import { LazyMotion, domAnimation, m, useReducedMotion } from "motion/react";

import type { RegistrationValues } from "@/lib/circles/registration-schema";
import { TAG_SEEDS } from "@/lib/circles/filter-labels";
import { cn } from "@/lib/utils";

// ── 상수 ──────────────────────────────────────────────────────────────────────
/** 한 번에 선택 가능한 최대 태그 수 */
const MAX_TAGS = 5;

// ── 스타일 토큰 ────────────────────────────────────────────────────────────────
// step-contact.tsx 와 동일한 상수명/값 사용
const EASE_EXPO_OUT = [0.22, 1, 0.36, 1] as const;

const FADE_UP_VARIANTS = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
} as const;

/** 인라인 에러 메시지 스타일 */
const ERROR_MSG_CLS = "text-xs text-red-500";

// ── 컴포넌트 ──────────────────────────────────────────────────────────────────

/**
 * 태그 선택 스텝.
 *
 * 칩 토글 동작:
 *  - 선택되지 않은 태그 클릭 → 추가 (최대 5개 미만일 때만)
 *  - 선택된 태그 클릭 → 해제
 *  - 5개 도달 시 미선택 칩: disabled + opacity-40 + cursor-not-allowed
 *
 * setValue 규약:
 *  - setValue("tags", nextSlugs, { shouldValidate: true })
 *  - shouldValidate: true 로 max(5) zod 검증을 즉시 반영
 */
export function StepTags() {
  // ── FormContext 접근 ─────────────────────────────────────────────────────
  const {
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<RegistrationValues>();

  // ── 선택된 태그 slug 배열 실시간 감시 ───────────────────────────────────
  // watch 로 렌더 트리거 보장 (register 대신 watch + setValue 패턴)
  const selectedTags: string[] = watch("tags") ?? [];

  // ── 접근성: 감소된 모션 사용자 대응 ─────────────────────────────────────
  const reducedMotion = useReducedMotion();
  const initial = reducedMotion ? "visible" : "hidden";

  /** stagger delay 헬퍼 — step-contact 와 동일 패턴 */
  const makeFadeTransition = (delay: number) =>
    reducedMotion ? { duration: 0 } : { duration: 0.42, ease: EASE_EXPO_OUT, delay };

  // ── 태그 토글 핸들러 ─────────────────────────────────────────────────────
  /**
   * 태그 칩 클릭 시 호출됩니다.
   * - 이미 선택된 태그: 배열에서 제거
   * - 미선택 태그 + 5개 미만: 배열에 추가
   * - 미선택 태그 + 5개 도달: 무시 (버튼 자체가 disabled 이지만 방어 코드)
   */
  function toggleTag(slug: string) {
    if (selectedTags.includes(slug)) {
      // 선택 해제
      setValue(
        "tags",
        selectedTags.filter((s) => s !== slug),
        { shouldValidate: true }
      );
    } else if (selectedTags.length < MAX_TAGS) {
      // 선택 추가
      setValue("tags", [...selectedTags, slug], { shouldValidate: true });
    }
    // 이미 5개인 경우: 아무 동작 없음 (버튼이 disabled 이므로 여기 도달 X)
  }

  /** 현재 최대 태그 수에 도달했는지 여부 */
  const isMaxReached = selectedTags.length >= MAX_TAGS;

  return (
    <LazyMotion features={domAnimation}>
      <div className="flex flex-col gap-8 pt-12">
        {/* ── 타이틀 블록 ─────────────────────────────────────────────────── */}
        <m.div
          className="flex flex-col gap-2"
          variants={FADE_UP_VARIANTS}
          initial={initial}
          animate="visible"
          transition={makeFadeTransition(0.05)}
        >
          <h1 className="text-[1.75rem] leading-snug font-bold tracking-tight">
            サークルの特徴を選んでください
          </h1>
          <p className="text-muted-foreground text-sm">
            当てはまるタグを最大{MAX_TAGS}個まで選択できます
          </p>
        </m.div>

        {/* ── 선택 카운터 + 안내 ──────────────────────────────────────────── */}
        <m.div
          className="flex items-center justify-between"
          variants={FADE_UP_VARIANTS}
          initial={initial}
          animate="visible"
          transition={makeFadeTransition(0.12)}
        >
          {/* 현재 선택 수 / 최대 수 */}
          <span className="text-foreground text-sm font-medium">
            <span
              className={cn(
                "tabular-nums transition-colors",
                // 최대 도달 시 강조 색상
                isMaxReached ? "text-keio-navy font-semibold" : "text-muted-foreground"
              )}
            >
              {selectedTags.length}
            </span>
            <span className="text-muted-foreground">/{MAX_TAGS}個選択中</span>
          </span>

          {/* 최대 도달 시 안내 텍스트 */}
          {isMaxReached && (
            <span role="status" aria-live="polite" className="text-keio-navy text-xs font-medium">
              タグは{MAX_TAGS}個まで選択できます
            </span>
          )}
        </m.div>

        {/* ── 태그 칩 그리드 ──────────────────────────────────────────────── */}
        <m.div
          variants={FADE_UP_VARIANTS}
          initial={initial}
          animate="visible"
          transition={makeFadeTransition(0.19)}
        >
          {/*
            태그 칩 목록: flex-wrap 으로 화면 너비에 맞게 자동 줄바꿈.
            filter-panel.tsx 의 SegmentedOption 스타일을 참조해 동일한 토스 스타일 적용.
            단, disabled 상태가 필요하므로 SegmentedOption 컴포넌트 대신 직접 <button> 구현.
          */}
          <ul className="flex flex-wrap gap-2" role="group" aria-label="タグ選択">
            {TAG_SEEDS.map((tag) => {
              const isSelected = selectedTags.includes(tag.slug);
              // 미선택 + 최대 도달 시 비활성화
              const isDisabled = !isSelected && isMaxReached;

              return (
                <li key={tag.slug}>
                  <button
                    type="button"
                    onClick={() => toggleTag(tag.slug)}
                    disabled={isDisabled}
                    aria-pressed={isSelected}
                    aria-label={
                      isDisabled
                        ? `${tag.label_ja}（これ以上選択できません）`
                        : isSelected
                          ? `${tag.label_ja}（選択済み、クリックで解除）`
                          : tag.label_ja
                    }
                    className={cn(
                      // 기본 스타일: SegmentedOption 과 동일 (filter-panel 톤 일치)
                      "flex h-12 shrink-0 items-center justify-center rounded-md border-2",
                      "px-4 text-sm whitespace-nowrap transition-colors",
                      // 선택 상태: 慶應 네이비 채움 (등록 폼 전용 — filter 와 차별화)
                      isSelected
                        ? "border-keio-navy bg-keio-navy text-keio-navy-foreground font-semibold"
                        : isDisabled
                          ? // 비활성 (최대 도달로 선택 불가)
                            "border-border text-muted-foreground cursor-not-allowed opacity-40"
                          : // 비선택 일반
                            "border-border text-muted-foreground hover:border-muted-foreground"
                    )}
                  >
                    {tag.label_ja}
                  </button>
                </li>
              );
            })}
          </ul>
        </m.div>

        {/* ── 태그 에러 메시지 (max 5 초과 — UI 제한으로 이론상 미발생) ──── */}
        {errors.tags && (
          <p role="alert" className={ERROR_MSG_CLS}>
            {/* errors.tags 는 FieldError 또는 { root?: FieldError } 형태일 수 있음 */}
            {typeof errors.tags.message === "string"
              ? errors.tags.message
              : "タグの選択に問題があります"}
          </p>
        )}

        {/* 선택 없음 안내 — 0개도 유효하므로 에러 아닌 힌트로 표시 */}
        {selectedTags.length === 0 && (
          <p className="text-muted-foreground text-xs">
            タグはスキップできます。選択しなくても次へ進めます。
          </p>
        )}

        {/* 하단 여백: AuthScreen footer 가 콘텐츠를 가리지 않도록 */}
        <div className="pb-4" aria-hidden="true" />
      </div>
    </LazyMotion>
  );
}
