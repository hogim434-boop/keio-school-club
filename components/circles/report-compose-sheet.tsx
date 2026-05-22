"use client";

/**
 * ReportComposeSheet — 활동 리포트 작성 바텀 시트 컴포넌트.
 *
 * 동작 흐름:
 *  1. 「＋ 投稿する」 버튼(SheetTrigger) 클릭 → 바텀 시트 슬라이드업
 *  2. RHF + Zod 폼 입력 (제목·본문·활동종류·장소 + 이미지 0~8장)
 *  3. 「投稿する」 → submitActivityReport(circleId, values, imageFiles)
 *  4. 성공: toast.success + 폼 리셋 + 시트 닫힘 + router.refresh()
 *     실패: toast.error
 *
 * 설계 주의사항:
 *  - 이미지(File[])는 브라우저 전용 객체 → RHF/Zod 밖 별도 state 로 관리
 *    (submit-registration.ts 의 cover 처리와 동일 패턴)
 *  - submitActivityReport 는 브라우저 클라이언트 전용 함수
 *    (uploadReportImage 가 Canvas API 사용 — Server Action 아님)
 *  - SheetContent: max-h-[90vh] + overflow-y-auto 로 긴 폼도 스크롤 가능
 *  - mx-auto max-w-2xl: 데스크탑에서 시트 폭 제한
 *
 * 애니메이션:
 *  - 폼 필드: FADE_UP + stagger (step-basic.tsx · step-contact.tsx 패턴 그대로)
 *  - 버튼: whileTap scale-down
 *  - useReducedMotion 시 즉시 표시 + whileTap 비활성 (접근성)
 */

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { LazyMotion, domAnimation, m, useReducedMotion } from "motion/react";
import { ImageIcon, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { AUTH_INPUT_CLS } from "@/lib/auth/input-class";
import {
  ACTIVITY_REPORT_TYPES,
  ACTIVITY_REPORT_TYPE_LABELS,
} from "@/lib/constants/activity-report-type";
import { validateUpload } from "@/lib/storage/strip-exif";
import { reportSchema, type ReportValues } from "@/lib/circles/report-schema";
import { submitActivityReport } from "@/lib/circles/submit-activity-report";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────
// 스타일 상수 (step-basic.tsx 와 동일 토큰)
// ─────────────────────────────────────────

/** FADE_UP 애니메이션 variants — step-basic / step-contact 와 동일 */
const EASE_EXPO_OUT = [0.22, 1, 0.36, 1] as const;

const FADE_UP_VARIANTS = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
} as const;

/** 폼 필드 라벨 스타일 */
const FIELD_LABEL_CLS = "text-sm font-medium text-foreground";

/** 인라인 에러 메시지 스타일 */
const ERROR_MSG_CLS = "text-xs text-red-500";

/**
 * <textarea> 스타일 — step-basic.tsx 의 TEXTAREA_CLS 와 동일 계열
 */
const TEXTAREA_CLS =
  "w-full rounded-xl border-0 bg-neutral-100 shadow-none text-base resize-none " +
  "p-3 min-h-[120px] transition-colors placeholder:text-muted-foreground " +
  "focus-visible:outline-none focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-keio-navy/40";

/** 이미지 최대 장수 */
const MAX_IMAGES = 8;

// ─────────────────────────────────────────
// Props
// ─────────────────────────────────────────

interface ReportComposeSheetProps {
  /** 리포트를 등록할 서클 UUID */
  circleId: string;
}

// ─────────────────────────────────────────
// 컴포넌트
// ─────────────────────────────────────────

/**
 * 활동 리포트 작성 바텀 시트.
 *
 * SheetTrigger 안에 「＋ 投稿する」 버튼을 포함하므로,
 * 외부에서 별도의 open state 관리 없이 독립적으로 사용 가능.
 */
export function ReportComposeSheet({ circleId }: ReportComposeSheetProps) {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();

  // 시트 open state — 제출 성공 후 프로그래매틱하게 닫기 위해 controlled 로 관리
  const [open, setOpen] = useState(false);

  // 제출 중 로딩 상태
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── 이미지 파일 state (RHF/Zod 밖) ────────────────────────
  // File[] + 미리보기 objectURL[] 을 병렬로 관리.
  // 언마운트 / 삭제 시 URL.revokeObjectURL 로 메모리 해제.
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);

  /** 숨겨진 file input 참조 — 커스텀 버튼에서 클릭 트리거 */
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── RHF 초기화 ──────────────────────────────────────────
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ReportValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      title: "",
      body: "",
      activity_type: undefined,
      location: "",
    },
  });

  /** 현재 선택된 활동종류 실시간 감시 (세그먼트 버튼 하이라이트용) */
  const selectedType = watch("activity_type");

  // ── 애니메이션 헬퍼 ──────────────────────────────────────
  const initial = prefersReducedMotion ? "visible" : "hidden";

  const makeFadeTransition = (delay: number) =>
    prefersReducedMotion ? { duration: 0 } : { duration: 0.38, ease: EASE_EXPO_OUT, delay };

  // ── 이미지 선택 핸들러 ────────────────────────────────────

  /**
   * 이미지 파일 input onChange — 여러 파일을 한 번에 추가.
   *
   * 처리 순서:
   *  1. 현재 파일 수 + 추가할 파일 수가 MAX_IMAGES 초과 시 에러 표시 (추가 중단)
   *  2. 각 파일을 validateUpload 로 검증 — 실패한 파일은 건너뜀
   *  3. 검증 통과한 파일만 state 에 추가 + objectURL 미리보기 생성
   */
  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    setImageError(null);

    // 최대 장수 초과 검사
    if (imageFiles.length + files.length > MAX_IMAGES) {
      setImageError(`画像は最大${MAX_IMAGES}枚まで追加できます`);
      e.target.value = "";
      return;
    }

    const validFiles: File[] = [];
    const validUrls: string[] = [];
    let hasError = false;

    for (const file of files) {
      const result = validateUpload(file);
      if (!result.ok) {
        // validateUpload 의 한국어 메시지를 일본어로 변환
        if (file.size > 4 * 1024 * 1024) {
          setImageError("ファイルサイズは4MB以下にしてください");
        } else {
          setImageError("JPEG・PNG・WebP 形式の画像を選択してください");
        }
        hasError = true;
        continue; // 이 파일은 건너뜀
      }
      validFiles.push(file);
      validUrls.push(URL.createObjectURL(file));
    }

    if (!hasError) {
      setImageError(null);
    }

    if (validFiles.length > 0) {
      setImageFiles((prev) => [...prev, ...validFiles]);
      setImagePreviews((prev) => [...prev, ...validUrls]);
    }

    // input 값 초기화 (같은 파일 재선택 허용)
    e.target.value = "";
  }

  /**
   * 이미지 개별 삭제 핸들러.
   *
   * @param index - 삭제할 이미지 인덱스
   */
  function handleImageRemove(index: number) {
    // objectURL 메모리 해제
    const urlToRevoke = imagePreviews[index];
    if (urlToRevoke) URL.revokeObjectURL(urlToRevoke);

    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
    // 에러 초기화 (삭제 후 유효한 상태일 수 있으므로)
    setImageError(null);
  }

  // ── 폼 리셋 헬퍼 ─────────────────────────────────────────

  /**
   * 폼 + 이미지 state 전체 초기화.
   * 제출 성공 후 또는 시트 닫힐 때 호출.
   */
  function resetAll() {
    reset();
    // 모든 objectURL 메모리 해제
    imagePreviews.forEach((url) => URL.revokeObjectURL(url));
    setImageFiles([]);
    setImagePreviews([]);
    setImageError(null);
  }

  // ── 시트 open 변경 핸들러 ────────────────────────────────

  /**
   * 시트 닫힐 때 폼 초기화.
   * 제출 중에는 닫기를 막지 않지만, 닫히면 상태를 정리한다.
   */
  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      resetAll();
    }
  }

  // ── 제출 핸들러 ─────────────────────────────────────────

  /**
   * RHF handleSubmit 콜백 — Zod 검증 통과 후 호출.
   */
  async function onSubmit(values: ReportValues) {
    setIsSubmitting(true);

    try {
      const result = await submitActivityReport(circleId, values, imageFiles);

      if ("error" in result) {
        // 실패: 에러 toast 표시
        toast.error(result.error);
      } else {
        // 성공: 성공 toast + 시트 닫기 + 목록 갱신
        toast.success("投稿しました");
        setOpen(false);
        resetAll();
        // router.refresh() 로 board 탭의 ActivityReportsList 를 서버 데이터 기준으로 갱신
        router.refresh();
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      {/* 「＋ 投稿する」 트리거 버튼 */}
      <SheetTrigger asChild>
        <m.div whileTap={prefersReducedMotion ? {} : { scale: 0.96 }} className="inline-flex">
          <Button
            variant="default"
            size="sm"
            className="bg-keio-navy hover:bg-keio-navy/90 gap-1.5"
            aria-label="活動レポートを投稿する"
          >
            <Plus className="size-4" aria-hidden="true" />
            投稿する
          </Button>
        </m.div>
      </SheetTrigger>

      {/*
       * SheetContent:
       *  - side="bottom": 바텀 시트 슬라이드업
       *  - mx-auto max-w-2xl: 데스크탑에서 폭 제한
       *  - max-h-[90vh] overflow-y-auto: 긴 폼도 스크롤 가능
       *  - rounded-t-2xl: 상단 모서리 둥글게 (바텀 시트 스타일)
       */}
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[90vh] max-w-2xl overflow-y-auto rounded-t-2xl px-0"
        showCloseButton={false}
      >
        <LazyMotion features={domAnimation}>
          {/* 헤더 */}
          <SheetHeader className="px-4 pb-2">
            <SheetTitle className="text-lg">活動レポートを投稿</SheetTitle>
          </SheetHeader>

          {/* 폼 본문 */}
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="flex flex-col gap-5 px-4 pb-2">
              {/* ── 제목 필드 ──────────────────────────────── */}
              <m.div
                className="flex flex-col gap-1.5"
                variants={FADE_UP_VARIANTS}
                initial={initial}
                animate="visible"
                transition={makeFadeTransition(0.05)}
              >
                <label htmlFor="report-title" className={FIELD_LABEL_CLS}>
                  タイトル
                  <span className="ml-1 text-red-500" aria-hidden="true">
                    *
                  </span>
                </label>
                <Input
                  id="report-title"
                  type="text"
                  maxLength={100}
                  placeholder="例：春の合宿に行ってきました！"
                  autoComplete="off"
                  className={cn(
                    AUTH_INPUT_CLS,
                    errors.title && "ring-2 ring-red-400 focus-visible:ring-red-400"
                  )}
                  aria-invalid={!!errors.title}
                  aria-describedby={errors.title ? "error-report-title" : undefined}
                  aria-required="true"
                  {...register("title")}
                />
                {errors.title && (
                  <p id="error-report-title" role="alert" className={ERROR_MSG_CLS}>
                    {errors.title.message}
                  </p>
                )}
              </m.div>

              {/* ── 본문 필드 ──────────────────────────────── */}
              <m.div
                className="flex flex-col gap-1.5"
                variants={FADE_UP_VARIANTS}
                initial={initial}
                animate="visible"
                transition={makeFadeTransition(0.1)}
              >
                <label htmlFor="report-body" className={FIELD_LABEL_CLS}>
                  本文
                  <span className="ml-1 text-red-500" aria-hidden="true">
                    *
                  </span>
                </label>
                <textarea
                  id="report-body"
                  maxLength={5000}
                  placeholder="活動の内容・感想・次回の予定などを自由に書いてください"
                  aria-invalid={!!errors.body}
                  aria-describedby={errors.body ? "error-report-body" : undefined}
                  aria-required="true"
                  className={cn(
                    TEXTAREA_CLS,
                    errors.body && "ring-2 ring-red-400 focus-visible:ring-red-400"
                  )}
                  {...register("body")}
                />
                {errors.body && (
                  <p id="error-report-body" role="alert" className={ERROR_MSG_CLS}>
                    {errors.body.message}
                  </p>
                )}
              </m.div>

              {/* ── 활동종류 세그먼트 (선택) ───────────────── */}
              <m.div
                className="flex flex-col gap-1.5"
                variants={FADE_UP_VARIANTS}
                initial={initial}
                animate="visible"
                transition={makeFadeTransition(0.15)}
              >
                <p className={FIELD_LABEL_CLS}>
                  活動種類
                  <span className="text-muted-foreground ml-1.5 text-xs font-normal">（任意）</span>
                </p>
                {/*
                 * 세그먼트 칩 토글 — 선택 → 해제 가능 (任意 필드).
                 * step-basic.tsx 의 member_band 칩 단일 선택 패턴과 동일.
                 */}
                <ul className="flex flex-wrap gap-2" role="radiogroup" aria-label="活動種類を選択">
                  {ACTIVITY_REPORT_TYPES.map((type) => {
                    const isSelected = selectedType === type;
                    return (
                      <li key={type}>
                        <button
                          type="button"
                          onClick={() => {
                            // 이미 선택된 칩 재클릭 시 선택 해제
                            if (isSelected) {
                              setValue("activity_type", undefined, { shouldValidate: true });
                            } else {
                              setValue("activity_type", type, { shouldValidate: true });
                            }
                          }}
                          role="radio"
                          aria-checked={isSelected}
                          aria-label={
                            isSelected
                              ? `${ACTIVITY_REPORT_TYPE_LABELS[type]}（選択済み、クリックで解除）`
                              : ACTIVITY_REPORT_TYPE_LABELS[type]
                          }
                          className={cn(
                            "flex h-10 shrink-0 items-center justify-center rounded-md border-2",
                            "px-3.5 text-sm whitespace-nowrap transition-colors",
                            isSelected
                              ? "border-keio-navy bg-keio-navy text-keio-navy-foreground font-semibold"
                              : "border-border text-muted-foreground hover:border-muted-foreground"
                          )}
                        >
                          {ACTIVITY_REPORT_TYPE_LABELS[type]}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </m.div>

              {/* ── 장소 필드 (선택) ──────────────────────── */}
              <m.div
                className="flex flex-col gap-1.5"
                variants={FADE_UP_VARIANTS}
                initial={initial}
                animate="visible"
                transition={makeFadeTransition(0.2)}
              >
                <label htmlFor="report-location" className={FIELD_LABEL_CLS}>
                  場所
                  <span className="text-muted-foreground ml-1.5 text-xs font-normal">（任意）</span>
                </label>
                <Input
                  id="report-location"
                  type="text"
                  maxLength={100}
                  placeholder="例：日吉キャンパス 第1体育館"
                  autoComplete="off"
                  className={cn(
                    AUTH_INPUT_CLS,
                    errors.location && "ring-2 ring-red-400 focus-visible:ring-red-400"
                  )}
                  aria-invalid={!!errors.location}
                  aria-describedby={errors.location ? "error-report-location" : undefined}
                  {...register("location")}
                />
                {errors.location && (
                  <p id="error-report-location" role="alert" className={ERROR_MSG_CLS}>
                    {errors.location.message}
                  </p>
                )}
              </m.div>

              {/* ── 이미지 (선택, 최대 8장) ───────────────── */}
              <m.div
                className="flex flex-col gap-2"
                variants={FADE_UP_VARIANTS}
                initial={initial}
                animate="visible"
                transition={makeFadeTransition(0.25)}
              >
                <p className={FIELD_LABEL_CLS}>
                  画像
                  <span className="text-muted-foreground ml-1.5 text-xs font-normal">
                    （任意・最大{MAX_IMAGES}枚・JPEG/PNG/WebP・4MB以内）
                  </span>
                </p>

                {/* 숨겨진 file input — multiple 허용 */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  aria-label="活動画像を選択"
                  className="sr-only"
                  onChange={handleImageChange}
                />

                {/* 이미지 미리보기 그리드 */}
                {imagePreviews.length > 0 && (
                  <ul
                    className="grid grid-cols-3 gap-2 sm:grid-cols-4"
                    aria-label="選択した画像のプレビュー"
                  >
                    {imagePreviews.map((url, index) => (
                      <li key={url} className="relative aspect-square">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={`画像 ${index + 1}`}
                          className="h-full w-full rounded-lg object-cover"
                        />
                        {/* 삭제 버튼 */}
                        <button
                          type="button"
                          onClick={() => handleImageRemove(index)}
                          aria-label={`画像 ${index + 1} を削除`}
                          className={cn(
                            "absolute top-1 right-1 flex size-5 items-center justify-center",
                            "rounded-full bg-black/60 text-white transition-opacity hover:bg-black/80"
                          )}
                        >
                          <X className="size-3" aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {/* 이미지 추가 버튼 — MAX_IMAGES 미만일 때만 표시 */}
                {imageFiles.length < MAX_IMAGES && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "flex h-20 w-full flex-col items-center justify-center gap-1.5 rounded-xl",
                      "border-border text-muted-foreground border-2 border-dashed bg-neutral-50",
                      "hover:border-muted-foreground transition-colors hover:bg-neutral-100",
                      "active:bg-neutral-200"
                    )}
                    aria-label="画像を追加する"
                  >
                    <ImageIcon className="size-6 opacity-40" aria-hidden="true" />
                    <span className="text-xs">
                      画像を追加
                      {imageFiles.length > 0 ? `（${imageFiles.length}/${MAX_IMAGES}）` : ""}
                    </span>
                  </button>
                )}

                {/* 이미지 검증 에러 메시지 */}
                {imageError && (
                  <p role="alert" className={ERROR_MSG_CLS}>
                    {imageError}
                  </p>
                )}
              </m.div>
            </div>

            {/* ── フッター: キャンセル + 投稿する ─────────── */}
            <SheetFooter className="flex-row gap-2 px-4 pt-4">
              <SheetClose asChild>
                <Button type="button" variant="outline" className="flex-1" disabled={isSubmitting}>
                  キャンセル
                </Button>
              </SheetClose>

              <m.div
                className="flex-1"
                whileTap={prefersReducedMotion || isSubmitting ? {} : { scale: 0.97 }}
              >
                <Button
                  type="submit"
                  className="bg-keio-navy hover:bg-keio-navy/90 w-full"
                  disabled={isSubmitting}
                  aria-label={isSubmitting ? "投稿中..." : "投稿する"}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-1.5 size-4 animate-spin" aria-hidden="true" />
                      投稿中...
                    </>
                  ) : (
                    "投稿する"
                  )}
                </Button>
              </m.div>
            </SheetFooter>
          </form>
        </LazyMotion>
      </SheetContent>
    </Sheet>
  );
}
