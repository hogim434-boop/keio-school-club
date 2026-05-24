"use client";

/**
 * StepBasic — 서클 등록 1단계: 기본 정보 입력
 *
 * 담당 필드: name, category, official_type, activity_frequency, member_band, description, cover
 *
 * 구조:
 *  - FormProvider(CircleRegistrationForm) 아래에서 useFormContext<RegistrationValues>() 로 접근
 *  - 제출 버튼 없음 — 단계 이동은 컨테이너 footer의 "次へ" 버튼이 담당
 *  - 커버 이미지: validateUpload() 검증 후 setValue("cover", file) 로 RHF 상태 보관
 *    → 제출 시 StepContact 가 getValues("cover") 로 꺼내 submitRegistration 에 전달
 *
 * 애니메이션: step-contact.tsx 와 동일한 FADE_UP stagger 패턴
 */

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useFormContext } from "react-hook-form";
import { LazyMotion, domAnimation, m, useReducedMotion } from "motion/react";
import { ImageIcon, Plus, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { AUTH_INPUT_CLS } from "@/lib/auth/input-class";
import { validateUpload } from "@/lib/storage/strip-exif";
import type { RegistrationValues } from "@/lib/circles/registration-schema";
import type { CircleImage } from "@/lib/types/domain";
import { CATEGORIES, CATEGORY_LABELS } from "@/lib/constants/category";
import { MEMBER_BANDS, MEMBER_BAND_LABELS, type MemberBand } from "@/lib/constants/member-band";
import { OFFICIAL_TYPES, OFFICIAL_TYPE_LABELS } from "@/lib/constants/official-type";
import {
  ACTIVITY_FREQUENCIES,
  ACTIVITY_FREQUENCY_LABELS,
} from "@/lib/constants/activity-frequency";
import { ACTIVITY_TIME_BANDS, ACTIVITY_TIME_BAND_LABELS } from "@/lib/constants/activity-time-band";
import { ACTIVITY_DAY_OPTIONS, IRREGULAR_DAY } from "@/lib/circles/filter-labels";
import { cn } from "@/lib/utils";

/** 최대 커버 이미지 장수 */
const MAX_COVER_IMAGES = 5;

// ── 스타일 토큰 ────────────────────────────────────────────────────────────────
// step-contact.tsx 와 동일한 상수명/값 사용
const EASE_EXPO_OUT = [0.22, 1, 0.36, 1] as const;

const FADE_UP_VARIANTS = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
} as const;

/** 각 필드 위에 표시되는 라벨 스타일 */
const FIELD_LABEL_CLS = "text-sm font-medium text-foreground";

/** 인라인 에러 메시지 스타일 */
const ERROR_MSG_CLS = "text-xs text-red-500";

/**
 * native <select> 에 적용할 스타일.
 * AUTH_INPUT_CLS 의 높이·모양·채움 스타일을 그대로 가져오면서
 * select 에 맞게 px-3 · cursor-pointer · focus: 계열을 추가합니다.
 * (shadcn Input 은 <input> 전용이라 <select> 에 직접 적용 불가)
 */
const SELECT_CLS =
  "h-12 w-full rounded-xl border-0 bg-neutral-100 shadow-none text-base " +
  "px-3 cursor-pointer transition-colors " +
  "text-foreground focus:outline-none focus:bg-white focus:ring-2 focus:ring-keio-navy/40";

/**
 * <textarea> 에 적용할 스타일.
 * AUTH_INPUT_CLS 에서 h-12 를 제거하고 min-h + resize-none + p-3 추가.
 */
const TEXTAREA_CLS =
  "w-full rounded-xl border-0 bg-neutral-100 shadow-none text-base resize-none " +
  "p-3 min-h-[140px] transition-colors placeholder:text-muted-foreground " +
  "focus-visible:outline-none focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-keio-navy/40";

// ── 컴포넌트 ──────────────────────────────────────────────────────────────────

/**
 * 서클 기본 정보 입력 스텝.
 *
 * 커버 이미지 저장 규약 (복수화 버전):
 *  - 사용자가 파일을 선택하면 validateUpload() 검증 후 setValue("cover", File[]) 로 보관 (누적 방식)
 *  - 최대 5장까지 추가 가능. 초과 시 인라인 에러 표시.
 *  - edit 모드: existingImages(기존 CircleImage[]) prop 으로 기존 커버 미리보기 표시.
 *    삭제 버튼(×)으로 keepImages 에서 제외 → 부모(CircleRegistrationForm)에 콜백으로 전달.
 *  - STEP_FIELDS.basic 에 cover 는 포함되지 않으므로 "次へ" trigger 대상 아님
 *  - 제출 시 StepContact 가 getValues("cover") as File[] 로 꺼내감
 */
/** StepBasic props */
interface StepBasicProps {
  /**
   * edit 모드 기존 커버 이미지 목록 — 복수 커버 미리보기 표시용.
   * 신규 등록(create) 모드에서는 빈 배열 또는 미전달.
   */
  existingImages?: CircleImage[];
  /**
   * 기존 이미지 keep 목록 변경 시 부모에 알리는 콜백.
   * edit 모드에서 ×버튼으로 삭제하면 호출되어 CircleRegistrationForm 이 keepImageUrls 를 갱신한다.
   */
  onKeepImagesChange?: (keepImages: CircleImage[]) => void;
  /**
   * 선택 항목(活動時間帯·活動曜日·会員数·サークル紹介) 노출 여부.
   * - true(기본·edit): 전체 노출 — 사후 보강 입력처.
   * - false(신규 등록): 숨김 — 등록 부담을 줄이고 마이페이지 완성도에서 채운다.
   */
  showOptionalFields?: boolean;
}

export function StepBasic({
  existingImages = [],
  onKeepImagesChange,
  showOptionalFields = true,
}: StepBasicProps = {}) {
  // ── FormContext 접근 ─────────────────────────────────────────────────────
  const {
    register,
    watch,
    setValue,
    getValues,
    clearErrors,
    formState: { errors },
  } = useFormContext<RegistrationValues>();

  // ── 현재 선택된 부원 수 범위 실시간 감시 ─────────────────────────────────
  // watch 로 렌더 트리거 보장 (register 대신 watch + setValue 패턴 — step-tags 와 동일)
  const selectedBand = watch("member_band");
  // 활동 시간대·요일 다중 선택 실시간 감시 (배열 칩 토글용)
  const selectedTimeBands = watch("activity_time_band") ?? [];
  const selectedWeekdays = watch("activity_weekdays") ?? [];

  /** 배열 필드 칩 토글 — 이미 있으면 제거, 없으면 추가 (다중 선택) */
  function toggleArrayValue<T>(arr: T[], val: T): T[] {
    return arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val];
  }

  /**
   * 활동 요일 칩 토글 — 「不定期」 는 요일과 배타적.
   * - 不定期 선택: 다른 요일을 모두 비우고 ["不定期"] 로 설정 (재클릭 시 해제)
   * - 특정 요일 선택: 不定期 를 먼저 제거한 뒤 해당 요일을 토글
   */
  function toggleWeekday(day: string) {
    const next =
      day === IRREGULAR_DAY
        ? selectedWeekdays.includes(IRREGULAR_DAY)
          ? []
          : [IRREGULAR_DAY]
        : toggleArrayValue(
            selectedWeekdays.filter((d) => d !== IRREGULAR_DAY),
            day
          );
    setValue("activity_weekdays", next, { shouldValidate: true });
  }

  // ── 접근성: 감소된 모션 사용자 대응 ─────────────────────────────────────
  const reducedMotion = useReducedMotion();
  const initial = reducedMotion ? "visible" : "hidden";

  // ── 完成度 칩에서 ?focus=key 로 진입 시 해당 항목으로 스크롤 + 잠깐 강조 ──
  // (마이페이지/상세의 ProfileCompletion 칩이 /circles/{id}/edit?step=basic&focus=member_band 형태로 보냄)
  const searchParams = useSearchParams();
  const focusKey = searchParams.get("focus");
  const [highlightKey, setHighlightKey] = useState<string | null>(null);

  useEffect(() => {
    if (!focusKey) return;
    const el = document.getElementById(`field-${focusKey}`);
    if (!el) return;
    // 진입 fade-up 애니메이션(최대 delay≈0.33s + duration 0.42s)이 끝난 뒤 스크롤
    const scrollTimer = setTimeout(() => {
      el.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center" });
      setHighlightKey(focusKey);
    }, 450);
    // 약 0.9초 강조 후 해제 (왼쪽 컬러 바가 부드럽게 페이드인/아웃)
    const clearTimer = setTimeout(() => setHighlightKey(null), 1350);
    return () => {
      clearTimeout(scrollTimer);
      clearTimeout(clearTimer);
    };
  }, [focusKey, reducedMotion]);

  /** stagger delay 헬퍼 — step-contact 와 동일 패턴 */
  const makeFadeTransition = (delay: number) =>
    reducedMotion ? { duration: 0 } : { duration: 0.42, ease: EASE_EXPO_OUT, delay };

  // ── 커버 이미지 state (복수화) ─────────────────────────────────────────
  /**
   * 새로 선택한 파일의 objectURL 목록 — 추가 순서 유지.
   * 언마운트 시 또는 파일 삭제 시 해당 URL을 revoke 해 메모리 누수 방지.
   */
  const [newPreviewUrls, setNewPreviewUrls] = useState<{ file: File; url: string }[]>([]);
  /**
   * edit 모드에서 유지할 기존 이미지 목록 (×버튼으로 제외 가능).
   * 초기값은 existingImages prop.
   */
  const [keepImages, setKeepImages] = useState<CircleImage[]>(existingImages);
  /** 파일 검증 실패 또는 상한 초과 시 인라인 에러 메시지 */
  const [coverError, setCoverError] = useState<string | null>(null);
  /** 숨겨진 file input 참조 — 커스텀 버튼에서 클릭 트리거 */
  const fileInputRef = useRef<HTMLInputElement>(null);

  // objectURL 메모리 정리 — 언마운트 시 전체 revoke
  useEffect(() => {
    return () => {
      newPreviewUrls.forEach(({ url }) => URL.revokeObjectURL(url));
    };
    // 마운트/언마운트 한 번만 실행 (의존성 배열 비움)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 현재 총 이미지 수 (유지 기존 + 신규)
  const totalImageCount = keepImages.length + newPreviewUrls.length;

  // ── 커버 이미지 추가 핸들러 ─────────────────────────────────────────────
  /**
   * 파일 input onChange 에서 호출됩니다 (multiple 가능).
   * 1. 상한(5장) 초과 체크 → 초과 시 에러 표시 + 차단
   * 2. 각 파일 validateUpload() 검증
   * 3. 통과 파일만 objectURL 생성 후 누적, RHF cover 배열 갱신
   */
  function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    // input 값을 즉시 초기화해 같은 파일 재선택을 허용
    e.target.value = "";
    if (selected.length === 0) return;

    setCoverError(null);
    clearErrors("cover");

    // 추가 가능한 슬롯 수 계산
    const remaining = MAX_COVER_IMAGES - totalImageCount;
    if (remaining <= 0) {
      setCoverError(`カバー画像は最大${MAX_COVER_IMAGES}枚まで追加できます`);
      return;
    }

    // 검증 통과 파일만 추가 (슬롯 한도 내)
    const toAdd = selected.slice(0, remaining);
    const valid: { file: File; url: string }[] = [];

    for (const file of toAdd) {
      const result = validateUpload(file);
      if (!result.ok) {
        // 에러 메시지를 일본어로 변환
        if (file.size > 4 * 1024 * 1024) {
          setCoverError("ファイルサイズは4MB以下にしてください");
        } else {
          setCoverError("JPEG・PNG・WebP 形式の画像を選択してください");
        }
        // 검증 실패 시 그 이후 파일도 중단
        break;
      }
      valid.push({ file, url: URL.createObjectURL(file) });
    }

    if (valid.length === 0) return;

    // 누적 state 갱신
    setNewPreviewUrls((prev) => [...prev, ...valid]);

    // RHF cover 필드에 File[] 저장 (shouldValidate 불필요 — trigger 대상 외)
    const currentFiles = (getValues("cover") as File[] | undefined) ?? [];
    setValue("cover", [...currentFiles, ...valid.map((v) => v.file)]);
  }

  // ── 기존 이미지 삭제 핸들러 (edit 모드) ─────────────────────────────────
  function handleRemoveExistingImage(imageId: string) {
    const updated = keepImages.filter((img) => img.id !== imageId);
    setKeepImages(updated);
    onKeepImagesChange?.(updated);
  }

  // ── 신규 이미지 삭제 핸들러 ─────────────────────────────────────────────
  function handleRemoveNewImage(index: number) {
    setNewPreviewUrls((prev) => {
      const removed = prev[index];
      if (removed) URL.revokeObjectURL(removed.url);
      return prev.filter((_, i) => i !== index);
    });
    // RHF cover 배열에서도 해당 파일 제거
    const currentFiles = (getValues("cover") as File[] | undefined) ?? [];
    const updated = currentFiles.filter((_, i) => i !== index);
    setValue("cover", updated.length > 0 ? updated : undefined);
  }

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
            基本情報を入力してください
          </h1>
          <p className="text-muted-foreground text-sm">
            サークルのプロフィールになる情報を登録します
          </p>
        </m.div>

        {/* ── 단체명 필드 ─────────────────────────────────────────────────── */}
        <m.div
          className="flex flex-col gap-1.5"
          variants={FADE_UP_VARIANTS}
          initial={initial}
          animate="visible"
          transition={makeFadeTransition(0.12)}
        >
          <label htmlFor="name" className={FIELD_LABEL_CLS}>
            サークル名
            {/* 필수 표시 */}
            <span className="ml-1 text-red-500" aria-hidden="true">
              *
            </span>
          </label>
          <Input
            id="name"
            type="text"
            maxLength={50}
            placeholder="例：慶應テニスサークル"
            autoComplete="organization"
            className={cn(
              AUTH_INPUT_CLS,
              // 에러 시 붉은 ring
              errors.name && "ring-2 ring-red-400 focus-visible:ring-red-400"
            )}
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "error-name" : undefined}
            aria-required="true"
            {...register("name")}
          />
          {errors.name && (
            <p id="error-name" role="alert" className={ERROR_MSG_CLS}>
              {errors.name.message}
            </p>
          )}
        </m.div>

        {/* ── 카테고리 · 단체분류 · 활동빈도 그룹 ────────────────────────── */}
        <m.div
          className="flex flex-col gap-5"
          variants={FADE_UP_VARIANTS}
          initial={initial}
          animate="visible"
          transition={makeFadeTransition(0.19)}
        >
          {/* 카테고리 select */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="category" className={FIELD_LABEL_CLS}>
              カテゴリ
              <span className="ml-1 text-red-500" aria-hidden="true">
                *
              </span>
            </label>
            <select
              id="category"
              aria-invalid={!!errors.category}
              aria-describedby={errors.category ? "error-category" : undefined}
              aria-required="true"
              className={cn(
                SELECT_CLS,
                // 미선택(값 없음) 시 muted-foreground 색상
                "invalid:text-muted-foreground",
                errors.category && "ring-2 ring-red-400 focus:ring-red-400"
              )}
              {...register("category")}
              defaultValue=""
            >
              {/* 미선택 placeholder 옵션 */}
              <option value="" disabled className="text-muted-foreground">
                カテゴリを選択
              </option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_LABELS[cat]}
                </option>
              ))}
            </select>
            {errors.category && (
              <p id="error-category" role="alert" className={ERROR_MSG_CLS}>
                {errors.category.message}
              </p>
            )}
          </div>

          {/* 단체 분류 select */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="official_type" className={FIELD_LABEL_CLS}>
              団体区分
              <span className="ml-1 text-red-500" aria-hidden="true">
                *
              </span>
            </label>
            <select
              id="official_type"
              aria-invalid={!!errors.official_type}
              aria-describedby={errors.official_type ? "error-official-type" : undefined}
              aria-required="true"
              className={cn(
                SELECT_CLS,
                errors.official_type && "ring-2 ring-red-400 focus:ring-red-400"
              )}
              {...register("official_type")}
              defaultValue=""
            >
              <option value="" disabled>
                団体区分を選択
              </option>
              {OFFICIAL_TYPES.map((type) => (
                <option key={type} value={type}>
                  {OFFICIAL_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
            {errors.official_type && (
              <p id="error-official-type" role="alert" className={ERROR_MSG_CLS}>
                {errors.official_type.message}
              </p>
            )}
          </div>

          {/* 활동 빈도 select */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="activity_frequency" className={FIELD_LABEL_CLS}>
              活動頻度
              <span className="ml-1 text-red-500" aria-hidden="true">
                *
              </span>
            </label>
            <select
              id="activity_frequency"
              aria-invalid={!!errors.activity_frequency}
              aria-describedby={errors.activity_frequency ? "error-activity-frequency" : undefined}
              aria-required="true"
              className={cn(
                SELECT_CLS,
                errors.activity_frequency && "ring-2 ring-red-400 focus:ring-red-400"
              )}
              {...register("activity_frequency")}
              defaultValue=""
            >
              <option value="" disabled>
                活動頻度を選択
              </option>
              {ACTIVITY_FREQUENCIES.map((freq) => (
                <option key={freq} value={freq}>
                  {ACTIVITY_FREQUENCY_LABELS[freq]}
                </option>
              ))}
            </select>
            {errors.activity_frequency && (
              <p id="error-activity-frequency" role="alert" className={ERROR_MSG_CLS}>
                {errors.activity_frequency.message}
              </p>
            )}
          </div>
        </m.div>

        {/* 선택 항목(활동시간대·요일·회원수·소개)은 신규 등록에선 숨기고 마이페이지 보강에서 채운다 */}
        {showOptionalFields && (
          <>
            {/* ── 活動時間帯 · 活動曜日 (선택, 다중) ───────────────────────────── */}
            <m.div
              className="flex flex-col gap-5"
              variants={FADE_UP_VARIANTS}
              initial={initial}
              animate="visible"
              transition={makeFadeTransition(0.23)}
            >
              {/* 활동 시간대 칩 (任意·다중) */}
              <div
                id="field-time_band"
                className={cn(
                  "before:bg-keio-navy relative flex scroll-mt-20 flex-col gap-1.5 before:absolute before:inset-y-0 before:-left-2 before:w-[3px] before:rounded-full before:opacity-0 before:transition-opacity before:duration-500 before:content-['']",
                  highlightKey === "time_band" && "before:opacity-100"
                )}
              >
                <p className={FIELD_LABEL_CLS}>
                  活動時間帯
                  <span className="text-muted-foreground ml-1.5 text-xs font-normal">
                    （任意・複数可）
                  </span>
                </p>
                <ul className="flex flex-wrap gap-2" aria-label="活動時間帯">
                  {ACTIVITY_TIME_BANDS.map((band) => {
                    const isSelected = selectedTimeBands.includes(band);
                    return (
                      <li key={band}>
                        <button
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() =>
                            setValue(
                              "activity_time_band",
                              toggleArrayValue(selectedTimeBands, band),
                              {
                                shouldValidate: true,
                              }
                            )
                          }
                          className={cn(
                            "flex h-12 shrink-0 items-center justify-center rounded-md border-2",
                            "px-4 text-sm whitespace-nowrap transition-colors",
                            isSelected
                              ? "border-keio-navy bg-keio-navy text-keio-navy-foreground font-semibold"
                              : "border-border text-muted-foreground hover:border-muted-foreground"
                          )}
                        >
                          {ACTIVITY_TIME_BAND_LABELS[band]}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* 활동 요일 칩 (任意·다중) */}
              <div
                id="field-days"
                className={cn(
                  "before:bg-keio-navy relative flex scroll-mt-20 flex-col gap-1.5 before:absolute before:inset-y-0 before:-left-2 before:w-[3px] before:rounded-full before:opacity-0 before:transition-opacity before:duration-500 before:content-['']",
                  highlightKey === "days" && "before:opacity-100"
                )}
              >
                <p className={FIELD_LABEL_CLS}>
                  活動曜日
                  <span className="text-muted-foreground ml-1.5 text-xs font-normal">
                    （任意・複数可）
                  </span>
                </p>
                <ul className="flex flex-wrap gap-2" aria-label="活動曜日">
                  {ACTIVITY_DAY_OPTIONS.map((day) => {
                    const isSelected = selectedWeekdays.includes(day);
                    // 不定期 칩은 글자가 길어 가로 패딩, 요일 1자 칩은 정사각
                    const isIrregular = day === IRREGULAR_DAY;
                    return (
                      <li key={day}>
                        <button
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => toggleWeekday(day)}
                          className={cn(
                            "flex h-12 shrink-0 items-center justify-center rounded-md border-2",
                            "text-sm transition-colors",
                            isIrregular ? "px-4 whitespace-nowrap" : "w-12",
                            isSelected
                              ? "border-keio-navy bg-keio-navy text-keio-navy-foreground font-semibold"
                              : "border-border text-muted-foreground hover:border-muted-foreground"
                          )}
                        >
                          {day}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </m.div>

            {/* ── 회원수 + 개요 그룹 ──────────────────────────────────────────── */}
            <m.div
              className="flex flex-col gap-5"
              variants={FADE_UP_VARIANTS}
              initial={initial}
              animate="visible"
              transition={makeFadeTransition(0.26)}
            >
              {/* 부원 수 범위 칩 단일 선택 (optional) */}
              {/*
            step-tags.tsx 의 칩 토글 패턴을 기반으로,
            단일 선택(라디오 성격) 으로 변형.
            - 이미 선택된 칩 재클릭 → 해제 (nullable 필드라 OK)
            - 미선택 칩 클릭 → 해당 값으로 설정
          */}
              <div
                id="field-member_band"
                className={cn(
                  "before:bg-keio-navy relative flex scroll-mt-20 flex-col gap-1.5 before:absolute before:inset-y-0 before:-left-2 before:w-[3px] before:rounded-full before:opacity-0 before:transition-opacity before:duration-500 before:content-['']",
                  highlightKey === "member_band" && "before:opacity-100"
                )}
              >
                <p className={FIELD_LABEL_CLS}>
                  会員数
                  <span className="text-muted-foreground ml-1.5 text-xs font-normal">（任意）</span>
                </p>
                {/* 범위 칩 목록 — flex-wrap 으로 자동 줄바꿈 */}
                <ul className="flex flex-wrap gap-2" role="radiogroup" aria-label="会員数範囲">
                  {MEMBER_BANDS.map((band) => {
                    const isSelected = selectedBand === band;
                    return (
                      <li key={band}>
                        <button
                          type="button"
                          onClick={() => {
                            // 이미 선택된 칩 재클릭 시 선택 해제 (任意 필드라 null 허용)
                            if (isSelected) {
                              setValue("member_band", undefined, { shouldValidate: true });
                            } else {
                              setValue("member_band", band as MemberBand, { shouldValidate: true });
                            }
                          }}
                          role="radio"
                          aria-checked={isSelected}
                          aria-label={
                            isSelected
                              ? `${MEMBER_BAND_LABELS[band]}（選択済み、クリックで解除）`
                              : MEMBER_BAND_LABELS[band]
                          }
                          className={cn(
                            // 기본 스타일: step-tags.tsx 의 칩과 동일 (border-2, h-12, rounded-md)
                            "flex h-12 shrink-0 items-center justify-center rounded-md border-2",
                            "px-4 text-sm whitespace-nowrap transition-colors",
                            // 선택 상태: keio-navy 채움 (step-tags 와 동일 토큰)
                            isSelected
                              ? "border-keio-navy bg-keio-navy text-keio-navy-foreground font-semibold"
                              : "border-border text-muted-foreground hover:border-muted-foreground"
                          )}
                        >
                          {MEMBER_BAND_LABELS[band]}
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {/* 에러 메시지 (スキーマ 검증 실패 시) */}
                {errors.member_band && (
                  <p id="error-member-band" role="alert" className={ERROR_MSG_CLS}>
                    {errors.member_band.message}
                  </p>
                )}
              </div>

              {/* 서클 소개 textarea (optional) */}
              <div
                id="field-description"
                className={cn(
                  "before:bg-keio-navy relative flex scroll-mt-20 flex-col gap-1.5 before:absolute before:inset-y-0 before:-left-2 before:w-[3px] before:rounded-full before:opacity-0 before:transition-opacity before:duration-500 before:content-['']",
                  highlightKey === "description" && "before:opacity-100"
                )}
              >
                <label htmlFor="description" className={FIELD_LABEL_CLS}>
                  サークル紹介
                  <span className="text-muted-foreground ml-1.5 text-xs font-normal">
                    （任意・2000文字以内）
                  </span>
                </label>
                <textarea
                  id="description"
                  rows={8}
                  maxLength={2000}
                  placeholder={
                    "🎾「こんな人におすすめ！」など、つかみの一言\n" +
                    "📍 活動日程・場所\n" +
                    "👉 活動内容や特徴\n" +
                    "✅ こんな人を歓迎します\n" +
                    "‼️ 注意事項（勧誘・出会い目的お断り など）"
                  }
                  aria-invalid={!!errors.description}
                  aria-describedby={
                    errors.description ? "error-description hint-description" : "hint-description"
                  }
                  className={cn(
                    TEXTAREA_CLS,
                    errors.description && "ring-2 ring-red-400 focus-visible:ring-red-400"
                  )}
                  {...register("description")}
                />
                <p id="hint-description" className="text-muted-foreground text-xs">
                  改行・絵文字・箇条書きはそのまま表示されます。見出しごとに区切ると読みやすくなります。
                </p>
                {errors.description && (
                  <p id="error-description" role="alert" className={ERROR_MSG_CLS}>
                    {errors.description.message}
                  </p>
                )}
              </div>
            </m.div>
          </>
        )}

        {/* ── 커버 이미지 (복수, 최대 5장) ──────────────────────────────── */}
        <m.div
          id="field-cover"
          className={cn(
            "before:bg-keio-navy relative flex scroll-mt-20 flex-col gap-2 before:absolute before:inset-y-0 before:-left-2 before:w-[3px] before:rounded-full before:opacity-0 before:transition-opacity before:duration-500 before:content-['']",
            highlightKey === "cover" && "before:opacity-100"
          )}
          variants={FADE_UP_VARIANTS}
          initial={initial}
          animate="visible"
          transition={makeFadeTransition(0.33)}
        >
          <p className={FIELD_LABEL_CLS}>
            カバー画像
            {/* 필수 표시 */}
            <span className="ml-1 text-red-500" aria-hidden="true">
              *
            </span>
            <span className="text-muted-foreground ml-1.5 text-xs font-normal">
              （最大{MAX_COVER_IMAGES}枚・JPEG/PNG/WebP・4MB以内）
            </span>
          </p>

          {/* 숨겨진 file input — multiple 허용, 커스텀 버튼으로 트리거 */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            aria-label="カバー画像を追加"
            className="sr-only"
            onChange={handleCoverChange}
          />

          {/* 썸네일 그리드 — 기존 이미지 + 신규 이미지 혼합 표시 */}
          {totalImageCount > 0 && (
            <ul className="grid grid-cols-3 gap-2" aria-label="カバー画像プレビュー">
              {/* 기존 이미지 (edit 모드) */}
              {keepImages.map((img) => (
                <li key={img.id} className="relative aspect-square overflow-hidden rounded-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.image_url}
                    alt="カバー画像"
                    className="h-full w-full object-cover"
                  />
                  {/* 첫 장 대표 배지 */}
                  {img.sort_order === 0 && keepImages[0]?.id === img.id && (
                    <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                      代表
                    </span>
                  )}
                  {/* 삭제 버튼 */}
                  <button
                    type="button"
                    onClick={() => handleRemoveExistingImage(img.id)}
                    aria-label="この画像を削除"
                    className={cn(
                      "absolute top-1 right-1 flex size-6 items-center justify-center rounded-full",
                      "bg-black/60 text-white transition-colors hover:bg-black/80"
                    )}
                  >
                    <X className="size-3.5" aria-hidden="true" />
                  </button>
                </li>
              ))}

              {/* 신규 선택 이미지 */}
              {newPreviewUrls.map((item, idx) => {
                // 대표 여부: 기존 이미지가 없고 첫 번째 신규 이미지인 경우
                const isFirst = keepImages.length === 0 && idx === 0;
                return (
                  <li key={item.url} className="relative aspect-square overflow-hidden rounded-xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.url}
                      alt="カバー画像プレビュー"
                      className="h-full w-full object-cover"
                    />
                    {/* 첫 장 대표 배지 */}
                    {isFirst && (
                      <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                        代表
                      </span>
                    )}
                    {/* 삭제 버튼 */}
                    <button
                      type="button"
                      onClick={() => handleRemoveNewImage(idx)}
                      aria-label="この画像を削除"
                      className={cn(
                        "absolute top-1 right-1 flex size-6 items-center justify-center rounded-full",
                        "bg-black/60 text-white transition-colors hover:bg-black/80"
                      )}
                    >
                      <X className="size-3.5" aria-hidden="true" />
                    </button>
                  </li>
                );
              })}

              {/* 추가 타일 — 썸네일과 동일 크기(aspect-square)로 그리드 마지막 칸(오른쪽)에 배치.
                  상한 미도달 시에만 노출. 이미지 0장일 때는 아래 큰 버튼이 대신 표시되므로 여기선 1장 이상에서만. */}
              {totalImageCount > 0 && totalImageCount < MAX_COVER_IMAGES && (
                <li>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-xl",
                      "border-border text-muted-foreground border-2 border-dashed bg-neutral-50",
                      "hover:border-muted-foreground transition-colors hover:bg-neutral-100 active:bg-neutral-200"
                    )}
                    aria-label="カバー画像を追加する"
                  >
                    <Plus className="size-5 opacity-60" aria-hidden="true" />
                    <span className="text-[11px]">
                      {totalImageCount}/{MAX_COVER_IMAGES}
                    </span>
                  </button>
                </li>
              )}
            </ul>
          )}

          {/* 이미지 0장: 첫 선택용 큰 버튼 (1장 이상은 위 그리드의 추가 타일이 대신함) */}
          {totalImageCount === 0 && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "flex h-40 w-full flex-col items-center justify-center gap-2 rounded-xl",
                "border-border text-muted-foreground border-2 border-dashed bg-neutral-50",
                "hover:border-muted-foreground transition-colors hover:bg-neutral-100 active:bg-neutral-200"
              )}
              aria-label="カバー画像を追加する"
            >
              <ImageIcon className="size-8 opacity-40" aria-hidden="true" />
              <span className="text-sm">カバー画像を選択</span>
            </button>
          )}

          {/* 상한 도달 안내 — 추가 타일이 사라지므로 안내 문구로 보완 */}
          {totalImageCount >= MAX_COVER_IMAGES && (
            <p className="text-muted-foreground text-center text-xs">
              カバー画像は最大{MAX_COVER_IMAGES}枚です
            </p>
          )}

          {/* 커버 검증 에러 메시지 */}
          {coverError && (
            <p role="alert" className={ERROR_MSG_CLS}>
              {coverError}
            </p>
          )}
          {!coverError && errors.cover && (
            <p id="error-cover" role="alert" className={ERROR_MSG_CLS}>
              {String(errors.cover.message)}
            </p>
          )}
        </m.div>

        {/* 하단 여백: AuthScreen footer 가 콘텐츠를 가리지 않도록 */}
        <div className="pb-4" aria-hidden="true" />
      </div>
    </LazyMotion>
  );
}
