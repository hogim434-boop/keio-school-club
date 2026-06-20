"use client";

/**
 * ReportComposeSheet — 활동 리포트 작성·수정 바텀 시트 컴포넌트 (작성/수정 공용).
 *
 * mode 구분:
 *  - "create" (기본): 「＋ 投稿する」 SheetTrigger 버튼 내장. 자체 open state 관리.
 *  - "edit": 외부(⋯ 메뉴)에서 open/onOpenChange 를 controlled 로 전달. SheetTrigger 숨김.
 *
 * 동작 흐름:
 *  create:
 *    1. 「＋ 投稿する」 버튼(SheetTrigger) 클릭 → 바텀 시트 슬라이드업
 *    2. RHF + Zod 폼 입력 (제목·본문·활동종류·장소·날짜 + 이미지 0~8장)
 *    3. 「投稿する」 → submitActivityReport(circleId, values, File[])
 *    4. 성공: toast.success("投稿しました") + 폼 리셋 + 시트 닫힘 + router.refresh()
 *       실패: toast.error
 *  edit:
 *    1. 외부 ⋯ 메뉴에서 open=true → 바텀 시트 슬라이드업
 *    2. report 값으로 RHF reset + 이미지 existing 항목으로 초기 로드
 *    3. 「更新する」 → updateActivityReport(reportId, circleId, values, images)
 *    4. 성공: toast.success("更新しました") + 시트 닫힘 + onOpenChange(false) + router.refresh()
 *       실패: toast.error
 *
 * 이미지 통합 모델 (ReportImageItem):
 *  - existing { kind:"existing"; url: string } — DB 에 이미 있는 이미지 URL
 *  - new      { kind:"new"; file: File }       — 사용자가 새로 선택한 이미지
 *  작성(create) 시: 전부 new. 수정(edit) 시: existing + new 혼합.
 *  미리보기 셀은 existing=url, new=objectURL 표시.
 *
 * 설계 주의사항:
 *  - submitActivityReport 와 updateActivityReport 는 브라우저 클라이언트 전용 함수
 *    (uploadReportImage 가 Canvas API 사용 — Server Action 아님)
 *  - SheetContent: max-h-[90vh] + overflow-y-auto 로 긴 폼도 스크롤 가능
 *  - mx-auto max-w-2xl: 데스크탑에서 시트 폭 제한
 *
 * 애니메이션:
 *  - 폼 필드: FADE_UP + stagger (step-basic.tsx · step-contact.tsx 패턴 그대로)
 *  - 버튼: whileTap scale-down
 *  - useReducedMotion 시 즉시 표시 + whileTap 비활성 (접근성)
 */

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { LazyMotion, domAnimation, m, useReducedMotion } from "motion/react";
import { ArrowLeft, CalendarIcon, ImagePlus, Loader2, Plus, X } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import { CROP_OUTPUT } from "@/lib/image/crop-image";
import { ImageCropDialog } from "@/components/image/image-crop-dialog";
import { reportSchema, type ReportValues } from "@/lib/circles/report-schema";
import {
  submitActivityReport,
  updateActivityReport,
  type ReportImageItem,
} from "@/lib/circles/submit-activity-report";
import type { ActivityReport } from "@/lib/types/domain";
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
// 이미지 미리보기 아이템 (내부 state 용)
// ─────────────────────────────────────────

/**
 * 이미지 state 내부 표현.
 * - preview: 셀에 표시할 URL (existing=원본 url, new=objectURL)
 * - item: 제출 시 updateActivityReport 에 넘길 ReportImageItem
 */
interface PreviewItem {
  preview: string;
  item: ReportImageItem;
}

// ─────────────────────────────────────────
// Props
// ─────────────────────────────────────────

interface ReportComposeSheetProps {
  /** 리포트를 등록할 서클 UUID */
  circleId: string;
  /**
   * 모드 — "create"(기본) 또는 "edit".
   * create: 자체 open state + SheetTrigger 버튼 내장.
   * edit: 외부 controlled open/onOpenChange + SheetTrigger 숨김.
   */
  mode?: "create" | "edit";
  /** edit 모드 시 수정할 리포트 데이터 */
  report?: ActivityReport;
  /** edit 모드 시 외부에서 제어하는 열림 여부 */
  open?: boolean;
  /** edit 모드 시 외부 open state 변경 콜백 */
  onOpenChange?: (open: boolean) => void;
  /**
   * SheetTrigger 버튼 표시 여부 (기본 true).
   * edit 모드에서 외부 ⋯ 메뉴가 open 을 제어할 때 false 로 설정.
   */
  showTrigger?: boolean;
  /**
   * 트리거 버튼 모양 (기본 "box").
   * - "box":  풀폭 점선 작성 박스 (게시판 탭 등).
   * - "tile": 가로 캐러셀 셀(정사각 점선 타일) — 미리보기 캐러셀 첫 칸에 배치.
   */
  triggerVariant?: "box" | "tile";
}

// ─────────────────────────────────────────
// 컴포넌트
// ─────────────────────────────────────────

/**
 * 활동 리포트 작성·수정 바텀 시트.
 *
 * create 모드: SheetTrigger 안에 「＋ 投稿する」 버튼을 포함하므로
 * 외부에서 별도의 open state 관리 없이 독립적으로 사용 가능.
 *
 * edit 모드: 외부(⋯ 메뉴)에서 open/onOpenChange 를 controlled 로 전달.
 * showTrigger={false} 로 SheetTrigger 버튼을 숨긴다.
 */
export function ReportComposeSheet({
  circleId,
  mode = "create",
  report,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
  showTrigger = true,
  triggerVariant = "box",
}: ReportComposeSheetProps) {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();

  const isEdit = mode === "edit";

  // 시트 open state — create 모드에서는 내부 state, edit 모드에서는 external 로 위임
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isEdit ? (externalOpen ?? false) : internalOpen;

  // 제출 중 로딩 상태
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── 이미지 state (RHF/Zod 밖) ────────────────────────────
  // PreviewItem[] 통합 배열:
  //  - create 시: 전부 { kind:"new", file: File }
  //  - edit 시: existing { kind:"existing", url } + new { kind:"new", file } 혼합
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);

  // ── 크롭 큐 state ──────────────────────────────────────────
  // input 은 multiple 인데 크롭은 한 장씩이므로, 선택한 파일들을 큐로 보관해
  // 다이얼로그를 한 장씩 순서대로 띄운다. (게시물 이미지는 1:1 정사각 크롭)
  const [cropQueue, setCropQueue] = useState<File[]>([]);
  const [cropTarget, setCropTarget] = useState<{ file: File; src: string } | null>(null);
  const [cropTotal, setCropTotal] = useState(0);

  // ── 활동 날짜 state ─────────────────────────────────────
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [dateOpen, setDateOpen] = useState(false);

  /** 숨겨진 file input 참조 */
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
      event_date: "",
    },
  });

  /** 현재 선택된 활동종류 실시간 감시 (세그먼트 버튼 하이라이트용) */
  const selectedType = watch("activity_type");

  /*
   * 필수 항목 채움 여부 — 제출 버튼 활성/색 전환에 사용.
   * 필수: 제목 / 본문 / 활동종류 / 활동일 (場所·이미지는 선택).
   * 채워지면 버튼이 keio-navy 로 차오르고, 비어 있으면 회색(비활성)으로 표시.
   * (세부 검증(글자수 등)은 제출 시 zod 가 담당 — 여기선 "입력 여부"만 본다)
   */
  const watchedTitle = watch("title");
  const watchedBody = watch("body");
  const watchedEventDate = watch("event_date");
  const isRequiredFilled =
    !!watchedTitle?.trim() && !!watchedBody?.trim() && !!selectedType && !!watchedEventDate;

  // ── edit 모드: 시트가 열릴 때 report 값으로 폼 초기화 ────
  // open 이 true 로 바뀌고 report 가 있을 때만 실행.
  // 의존성 배열에 report.id 를 포함해 다른 report 로 열릴 때도 갱신.
  useEffect(() => {
    if (!isEdit || !open || !report) return;

    // RHF 필드 초기화
    const dateStr = report.created_at.split("T")[0]; // "YYYY-MM-DD"
    reset({
      title: report.title,
      body: report.body,
      activity_type: report.activity_type,
      location: report.location ?? "",
      event_date: dateStr,
    });

    // 날짜 선택기 초기화
    const [year, month, day] = dateStr.split("-").map(Number);
    setSelectedDate(new Date(year, month - 1, day));

    // 이미지 existing 항목으로 초기화
    const existingItems: PreviewItem[] = (report.images ?? [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((img) => ({
        preview: img.image_url,
        item: { kind: "existing" as const, url: img.image_url },
      }));

    // image_url 만 있고 images[] 가 비어 있는 경우 fallback
    if (existingItems.length === 0 && report.image_url) {
      existingItems.push({
        preview: report.image_url,
        item: { kind: "existing" as const, url: report.image_url },
      });
    }

    setPreviewItems(existingItems);
    setImageError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, open, report?.id]);

  // ── 애니메이션 헬퍼 ──────────────────────────────────────
  const initial = prefersReducedMotion ? "visible" : "hidden";

  const makeFadeTransition = (delay: number) =>
    prefersReducedMotion ? { duration: 0 } : { duration: 0.38, ease: EASE_EXPO_OUT, delay };

  // ── 이미지 선택 핸들러 ────────────────────────────────────

  /**
   * 이미지 파일 input onChange — 여러 파일을 한 번에 추가.
   *
   * 처리 순서:
   *  1. 현재 아이템 수 + 추가할 파일 수가 MAX_IMAGES 초과 시 에러 표시 (추가 중단)
   *  2. 각 파일을 validateUpload 로 검증 — 실패한 파일은 건너뜀
   *  3. 검증 통과한 파일만 PreviewItem 으로 변환해 state 에 추가
   */
  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;

    setImageError(null);

    // 추가 가능한 슬롯 = 최대 - (현재 미리보기 + 대기 큐 + 현재 크롭 중 1장)
    const pending = cropQueue.length + (cropTarget ? 1 : 0);
    const remaining = MAX_IMAGES - previewItems.length - pending;
    if (remaining <= 0) {
      setImageError(`画像は最大${MAX_IMAGES}枚まで追加できます`);
      return;
    }

    // 검증 통과 파일만 모음 (슬롯 한도 내). 미리보기 생성은 크롭 확정 시점으로 미룸.
    const toAdd = files.slice(0, remaining);
    const validFiles: File[] = [];

    for (const file of toAdd) {
      const result = validateUpload(file);
      if (!result.ok) {
        if (file.size > 4 * 1024 * 1024) {
          setImageError("ファイルサイズは4MB以下にしてください");
        } else {
          setImageError("JPEG・PNG・WebP 形式の画像を選択してください");
        }
        // 검증 실패 시 그 이후 파일도 중단
        break;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    // 첫 장부터 크롭 다이얼로그 시작 (나머지는 큐 대기). 진행 표시용 총량 기록.
    setCropTotal(validFiles.length);
    startNextCrop(validFiles);
  }

  // ── 크롭 큐 진행 헬퍼 ──────────────────────────────────────
  /** 큐에서 다음 한 장을 꺼내 다이얼로그에 띄운다 (큐가 비면 다이얼로그 닫힘) */
  function startNextCrop(queue: File[]) {
    if (queue.length === 0) {
      setCropTarget(null);
      setCropQueue([]);
      return;
    }
    const [next, ...rest] = queue;
    setCropQueue(rest);
    setCropTarget({ file: next, src: URL.createObjectURL(next) });
  }

  /** 크롭 완료된 File 을 미리보기(previewItems)에 new 아이템으로 추가 */
  function appendCroppedReport(croppedFile: File) {
    setPreviewItems((prev) => [
      ...prev,
      { preview: URL.createObjectURL(croppedFile), item: { kind: "new", file: croppedFile } },
    ]);
    setImageError(null);
  }

  /** 「確定」 — 크롭 결과 적재 후 다음 장으로 */
  function handleCropComplete(croppedFile: File) {
    if (cropTarget) URL.revokeObjectURL(cropTarget.src);
    appendCroppedReport(croppedFile);
    startNextCrop(cropQueue);
  }

  /** 「キャンセル」 — 이 장 건너뛰고 다음 장으로 */
  function handleCropCancel() {
    if (cropTarget) URL.revokeObjectURL(cropTarget.src);
    startNextCrop(cropQueue);
  }

  /**
   * 이미지 개별 삭제 핸들러.
   * new 아이템의 경우 objectURL 메모리 해제도 수행.
   *
   * @param index - 삭제할 이미지 인덱스
   */
  function handleImageRemove(index: number) {
    setPreviewItems((prev) => {
      const item = prev[index];
      // new 아이템의 objectURL 은 메모리 해제
      if (item?.item.kind === "new") {
        URL.revokeObjectURL(item.preview);
      }
      return prev.filter((_, i) => i !== index);
    });
    setImageError(null);
  }

  // ── 폼 리셋 헬퍼 ─────────────────────────────────────────

  /**
   * 폼 + 이미지 state 전체 초기화.
   * 제출 성공 후 또는 시트 닫힐 때 호출.
   */
  function resetAll() {
    reset({
      title: "",
      body: "",
      activity_type: undefined,
      location: "",
      event_date: "",
    });
    // new 아이템의 objectURL 메모리 해제
    previewItems.forEach((item) => {
      if (item.item.kind === "new") {
        URL.revokeObjectURL(item.preview);
      }
    });
    setPreviewItems([]);
    setImageError(null);
    setSelectedDate(undefined);
    setDateOpen(false);
    // 진행 중이던 크롭 타깃/큐 정리 (objectURL 해제 포함)
    if (cropTarget) URL.revokeObjectURL(cropTarget.src);
    setCropTarget(null);
    setCropQueue([]);
  }

  // ── 시트 open 변경 핸들러 ────────────────────────────────

  /**
   * 시트 열림/닫힘 상태 변경 처리.
   * create 모드: 내부 state 업데이트.
   * edit 모드: 외부 onOpenChange 콜백 호출.
   * 닫힐 때 create 모드에서는 폼 초기화(edit 모드는 useEffect 가 다음 열림 시 재초기화).
   */
  function handleOpenChange(nextOpen: boolean) {
    if (isEdit) {
      externalOnOpenChange?.(nextOpen);
      if (!nextOpen) resetAll();
    } else {
      setInternalOpen(nextOpen);
      if (!nextOpen) resetAll();
    }
  }

  // ── 제출 핸들러 ─────────────────────────────────────────

  /**
   * RHF handleSubmit 콜백 — Zod 검증 통과 후 호출.
   * mode 에 따라 submitActivityReport / updateActivityReport 분기.
   */
  async function onSubmit(values: ReportValues) {
    setIsSubmitting(true);

    try {
      if (isEdit && report) {
        // ── 수정 모드 ──────────────────────────────────────
        const result = await updateActivityReport(report.id, circleId, values, [
          ...previewItems.map((p) => p.item),
        ]);

        if ("error" in result) {
          toast.error(result.error);
        } else {
          toast.success("更新しました");
          handleOpenChange(false);
          router.refresh();
        }
      } else {
        // ── 작성 모드 ──────────────────────────────────────
        // create 시에는 new 아이템 File 만 추출해 기존 submitActivityReport 에 전달
        const imageFiles = previewItems
          .filter(
            (p): p is PreviewItem & { item: { kind: "new"; file: File } } => p.item.kind === "new"
          )
          .map((p) => p.item.file);

        const result = await submitActivityReport(circleId, values, imageFiles);

        if ("error" in result) {
          toast.error(result.error);
        } else {
          toast.success("投稿しました");
          handleOpenChange(false);
          router.refresh();
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      {/* 트리거 버튼 — showTrigger=false(edit 모드)에서 숨김 */}
      {showTrigger &&
        (triggerVariant === "tile" ? (
          /* tile: 가로 캐러셀 셀 — 미리보기 카드(w-36/md:w-44 + 정사각 썸네일)와 정렬. */
          <SheetTrigger asChild>
            <m.button
              type="button"
              whileTap={prefersReducedMotion ? undefined : { scale: 0.97 }}
              aria-label="活動を投稿する"
              className={cn(
                "w-36 shrink-0 snap-start md:w-44",
                "flex aspect-square flex-col items-center justify-center gap-1.5 rounded-lg",
                "border-keio-navy/30 text-keio-navy border-2 border-dashed",
                "hover:border-keio-navy/50 hover:bg-keio-navy/5 transition-colors"
              )}
            >
              <Plus className="size-6" aria-hidden="true" />
              <span className="text-xs font-medium">投稿</span>
            </m.button>
          </SheetTrigger>
        ) : (
          /* box(기본): 풀폭 점선 작성 박스 — 게시판 탭 등. */
          <SheetTrigger asChild>
            <m.button
              type="button"
              whileTap={prefersReducedMotion ? undefined : { scale: 0.99 }}
              aria-label="活動を投稿する"
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-xl py-3.5",
                "border-keio-navy/30 text-keio-navy border-2 border-dashed text-sm font-medium",
                "hover:border-keio-navy/50 hover:bg-keio-navy/5 transition-colors"
              )}
            >
              <Plus className="size-4" aria-hidden="true" />
              活動を投稿
            </m.button>
          </SheetTrigger>
        ))}

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
          {/* 헤더 — 좌측 돌아가기(←) 버튼 + 타이틀(mode 에 따라 변경) */}
          <SheetHeader className="px-4 pb-2">
            <div className="flex items-center gap-2">
              {/* 돌아가기 — SheetClose 로 시트 닫기. 제출 중에는 비활성 */}
              <SheetClose asChild>
                <button
                  type="button"
                  disabled={isSubmitting}
                  aria-label="戻る"
                  className={cn(
                    "-ml-2 inline-flex size-9 shrink-0 items-center justify-center rounded-full",
                    "text-foreground hover:bg-muted transition-colors",
                    "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
                    "disabled:pointer-events-none disabled:opacity-50"
                  )}
                >
                  <ArrowLeft className="size-5" aria-hidden="true" />
                </button>
              </SheetClose>
              <SheetTitle className="text-lg">{isEdit ? "活動を編集" : "活動を投稿"}</SheetTitle>
            </div>
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

              {/* ── 활동종류 세그먼트 (필수) ────────────────── */}
              <m.div
                className="flex flex-col gap-1.5"
                variants={FADE_UP_VARIANTS}
                initial={initial}
                animate="visible"
                transition={makeFadeTransition(0.15)}
              >
                <p className={FIELD_LABEL_CLS}>
                  活動種類
                  <span className="ml-1 text-red-500" aria-hidden="true">
                    *
                  </span>
                </p>
                {/*
                 * 세그먼트 칩 토글 — 선택 → 해제 없이 선택만 (다른 칩 클릭으로 전환).
                 * step-basic.tsx 의 member_band 칩 단일 선택 패턴과 동일.
                 */}
                <ul className="flex flex-wrap gap-2" role="radiogroup" aria-label="活動種類を選択">
                  {ACTIVITY_REPORT_TYPES.map((type) => {
                    const isSelected = selectedType === type;
                    return (
                      <li key={type}>
                        <button
                          type="button"
                          onClick={() => setValue("activity_type", type, { shouldValidate: true })}
                          role="radio"
                          aria-checked={isSelected}
                          aria-label={ACTIVITY_REPORT_TYPE_LABELS[type]}
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
                {errors.activity_type && (
                  <p role="alert" className={ERROR_MSG_CLS}>
                    {errors.activity_type.message}
                  </p>
                )}
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

              {/* ── 활동 날짜 (필수) ────────────────────────── */}
              <m.div
                className="flex flex-col gap-1.5"
                variants={FADE_UP_VARIANTS}
                initial={initial}
                animate="visible"
                transition={makeFadeTransition(0.22)}
              >
                <span className={FIELD_LABEL_CLS}>
                  活動日
                  <span className="ml-1 text-red-500" aria-hidden="true">
                    *
                  </span>
                </span>
                {/* RHF 등록용 hidden input — 실제 값은 Calendar onSelect 의 setValue 로 갱신 */}
                <input type="hidden" {...register("event_date")} />
                {/* shadcn Date Picker — Popover 트리거 버튼 + Calendar */}
                <Popover open={dateOpen} onOpenChange={setDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "h-12 justify-start gap-2 rounded-xl bg-neutral-100 px-3 text-base font-normal",
                        "border-0 shadow-none hover:bg-neutral-100",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="size-4 opacity-60" aria-hidden="true" />
                      {selectedDate
                        ? format(selectedDate, "yyyy年M月d日(E)", { locale: ja })
                        : "日付を選択"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        setSelectedDate(date);
                        // RHF event_date 동기화 — Date → "YYYY-MM-DD" 문자열
                        setValue("event_date", date ? format(date, "yyyy-MM-dd") : "");
                        setDateOpen(false);
                      }}
                      // 미래 날짜 방지 — 오늘까지만
                      disabled={{ after: new Date() }}
                      autoFocus
                      locale={ja}
                    />
                  </PopoverContent>
                </Popover>
                {errors.event_date && (
                  <p role="alert" className={ERROR_MSG_CLS}>
                    {errors.event_date.message}
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

                {/*
                 * 이미지 그리드 — 업로드된 이미지 셀들 + 마지막에 ＋타일(인라인).
                 * existing: 원본 URL 표시 / new: objectURL 표시.
                 */}
                <ul
                  className="grid grid-cols-3 gap-2 sm:grid-cols-4"
                  aria-label="活動画像（プレビューと追加）"
                >
                  {/* 이미지 셀 — existing / new 통합 표시 */}
                  {previewItems.map((item, index) => (
                    <li key={item.preview} className="relative aspect-square">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.preview}
                        alt={`画像 ${index + 1}`}
                        className="border-border h-full w-full rounded-xl border object-cover"
                      />
                      {/* 삭제 버튼 — 우상단 원형 X */}
                      <button
                        type="button"
                        onClick={() => handleImageRemove(index)}
                        aria-label={`画像 ${index + 1} を削除`}
                        className={cn(
                          "absolute top-1.5 right-1.5 flex size-6 items-center justify-center",
                          "rounded-full bg-black/55 text-white transition-opacity hover:bg-black/75"
                        )}
                      >
                        <X className="size-3.5" aria-hidden="true" />
                      </button>
                    </li>
                  ))}

                  {/* ＋타일 — MAX_IMAGES 미만일 때 그리드 마지막 셀에 인라인 표시 */}
                  {previewItems.length < MAX_IMAGES && (
                    <li className="aspect-square">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className={cn(
                          "flex h-full w-full flex-col items-center justify-center gap-1 rounded-xl",
                          "border-keio-navy/30 text-keio-navy/70 border-2 border-dashed",
                          "hover:border-keio-navy/50 hover:bg-keio-navy/5 transition-colors",
                          "active:bg-keio-navy/10"
                        )}
                        aria-label="画像を追加する"
                      >
                        <ImagePlus className="size-6" aria-hidden="true" />
                        {/* 첫 추가 전에는 안내 텍스트, 이후엔 카운트 */}
                        <span className="text-[11px] font-medium">
                          {previewItems.length === 0
                            ? "画像を追加"
                            : `${previewItems.length}/${MAX_IMAGES}`}
                        </span>
                      </button>
                    </li>
                  )}
                </ul>

                {/* 이미지 검증 에러 메시지 */}
                {imageError && (
                  <p role="alert" className={ERROR_MSG_CLS}>
                    {imageError}
                  </p>
                )}
              </m.div>
            </div>

            {/*
             * ── フッター: 投稿する/更新する (취소는 헤더의 ← 돌아가기로 대체) ───
             * 서클 상세의 「参加する」처럼 시트 하단에 sticky 고정 — 폼이 길어 스크롤해도
             * 제출 버튼이 항상 보이도록. bg-background + border-t 로 본문이 비치지 않게 하고
             * safe-area-inset-bottom 으로 홈 인디케이터 영역 회피.
             */}
            <SheetFooter className="bg-background sticky bottom-0 z-10 border-t px-4 pt-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
              <m.div
                className="w-full"
                whileTap={
                  prefersReducedMotion || isSubmitting || !isRequiredFilled ? {} : { scale: 0.97 }
                }
              >
                <Button
                  type="submit"
                  className={cn(
                    "w-full transition-colors",
                    // 필수 항목이 모두 채워지면 keio-navy 로 차오르고, 아니면 회색(비활성 톤)
                    isRequiredFilled
                      ? "bg-keio-navy hover:bg-keio-navy/90"
                      : "bg-muted text-muted-foreground hover:bg-muted"
                  )}
                  disabled={isSubmitting || !isRequiredFilled}
                  aria-label={
                    isSubmitting
                      ? isEdit
                        ? "更新中..."
                        : "投稿中..."
                      : isEdit
                        ? "更新する"
                        : "投稿する"
                  }
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-1.5 size-4 animate-spin" aria-hidden="true" />
                      {isEdit ? "更新中..." : "投稿中..."}
                    </>
                  ) : isEdit ? (
                    "更新する"
                  ) : (
                    "投稿する"
                  )}
                </Button>
              </m.div>
            </SheetFooter>
          </form>
        </LazyMotion>
      </SheetContent>

      {/* 게시물 이미지 크롭 다이얼로그 — 1:1 정사각. 한 장씩 순차 처리.
          radix Dialog 는 portal 로 body 에 붙으므로 이 Sheet 위에 정상적으로 겹쳐 표시됨 */}
      <ImageCropDialog
        open={cropTarget !== null}
        aspect={1}
        ratioLabel="1:1"
        imageSrc={cropTarget?.src ?? null}
        fileName={cropTarget?.file.name ?? "report"}
        maxWidth={CROP_OUTPUT.square.width}
        maxHeight={CROP_OUTPUT.square.height}
        onComplete={handleCropComplete}
        onCancel={handleCropCancel}
        currentIndex={cropTotal - cropQueue.length - 1}
        totalCount={cropTotal}
      />
    </Sheet>
  );
}
