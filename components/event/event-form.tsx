"use client";

/**
 * components/event/event-form.tsx
 *
 * イベント登録・編集フォーム — 운영자(staff/owner) 전용 Client Component.
 *
 * ── 공통 특징 ──────────────────────────────────────────────────────────
 * - react-hook-form + zod (eventSchema) 기반 검증
 * - rsvp_mode 라디오 전환 시 capacity / rsvp_deadline / requires_approval 동적 표시
 * - shadcn/ui: Form, Input, Textarea, RadioGroup, Checkbox, Label, Button 사용
 * - 커버 이미지: 16:9 크롭 다이얼로그 (기존 CropDialog 재사용)
 * - JST 일시 입력 → Server Action 으로 전달 (UTC 변환은 Server Action 에서 수행)
 *
 * ── 등록 / 수정 공통화 ─────────────────────────────────────────────────
 * mode="create" → createEvent Server Action 호출 (기본값)
 * mode="edit"   → updateEvent Server Action 호출
 *   - initialValues: 기존 이벤트 값으로 폼을 채워서 렌더링
 *   - rsvp_mode: 수정 모드에서 disabled (등록 후 변경 불가)
 *   - eventId / circleId: 수정 대상 이벤트 UUID + 서클 UUID
 *
 * ── 폼 제출 흐름 ───────────────────────────────────────────────────────
 * 1. RHF handleSubmit → zod 검증 통과
 * 2. cover 이미지가 있으면 Storage 업로드 → URL 획득 후 values.cover_image_url 에 세팅
 * 3-a. mode="create": createEvent(formData) Server Action 호출
 * 3-b. mode="edit":   updateEvent(formData) Server Action 호출
 * 4. 성공 → /events/[id] redirect (Server Action 내부에서 처리)
 * 5. 실패 → submitError 상태 표시
 *
 * ── rsvp_mode 동적 필드 규칙 ────────────────────────────────────────────
 * light: capacity / rsvp_deadline / requires_approval 숨김 (값은 리셋)
 * strict: capacity / rsvp_deadline / requires_approval 표시 + 검증 활성
 */

import { useState, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageCropDialog } from "@/components/image/image-crop-dialog";
import { AUTH_INPUT_CLS } from "@/lib/auth/input-class";
import { eventSchema, type EventFormValues } from "@/lib/events/event-schema";
import type { z } from "zod";
import { createEvent, updateEvent } from "@/app/circles/[id]/events/actions";
import { cn } from "@/lib/utils";

// ── 스타일 상수 ────────────────────────────────────────────────────────
/** 폼 라벨 공통 스타일 */
const LABEL_CLS = "text-sm font-medium text-foreground";
/** 인라인 에러 메시지 스타일 */
const ERROR_CLS = "text-xs text-red-500 mt-1";
/** 섹션 구분 헤딩 스타일 */
const SECTION_HEADING_CLS = "text-base font-semibold text-foreground";
/** 옵션 배지 (任意) 스타일 */
const OPTIONAL_CLS = "ml-1.5 text-xs font-normal text-muted-foreground";

// ── Props ──────────────────────────────────────────────────────────────
interface EventFormProps {
  /** 이벤트를 등록할 서클 UUID */
  circleId: string;
  /**
   * 폼 동작 모드.
   * "create" (기본값): createEvent Server Action 호출 — 신규 등록.
   * "edit":            updateEvent Server Action 호출 — 기존 이벤트 수정.
   */
  mode?: "create" | "edit";
  /**
   * 수정 모드(mode="edit")일 때 필수.
   * 기존 이벤트 UUID — updateEvent 에 전달한다.
   */
  eventId?: string;
  /**
   * 수정 모드(mode="edit")일 때 기존 이벤트 데이터로 폼을 미리 채운다.
   * 등록 모드(mode="create")에서는 무시.
   */
  initialValues?: Partial<EventFormValues>;
}

/**
 * イベント登録・編集フォーム.
 *
 * mode="create": createEvent Server Action 에 circleId 를 함께 전달.
 * mode="edit":   updateEvent Server Action 에 eventId + circleId 를 함께 전달.
 * 성공 시 redirect 는 Server Action 내부에서 수행.
 */
export function EventForm({ circleId, mode = "create", eventId, initialValues }: EventFormProps) {
  // ── 커버 이미지 상태 ─────────────────────────────────────────────────
  /** 크롭 다이얼로그에 넘길 원본 ObjectURL (선택 즉시 생성, 크롭 완료/취소 시 해제) */
  const [pendingCoverSrc, setPendingCoverSrc] = useState<string | null>(null);
  /** 크롭 다이얼로그에 넘길 원본 파일명 (확장자 생성에 사용) */
  const [pendingCoverName, setPendingCoverName] = useState<string>("cover");
  /** 크롭 완료 후 실제 업로드할 File (새로 선택한 경우에만 존재) */
  const [croppedCoverFile, setCroppedCoverFile] = useState<File | null>(null);
  /**
   * 커버 이미지 미리보기 URL.
   * - 새 파일 선택 → croppedFile ObjectURL
   * - 수정 모드 초기 로드 → initialValues.cover_image_url (기존 Storage URL)
   * - 삭제 시 → null
   */
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(
    initialValues?.cover_image_url ?? null
  );

  // ── 제출 에러 상태 ────────────────────────────────────────────────────
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ── RHF 초기화 ────────────────────────────────────────────────────────
  // 수정 모드(mode="edit")일 때 initialValues 로 기존 데이터를 채운다.
  // 등록 모드(mode="create")일 때는 빈 값으로 초기화.
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  // zod v4 + @hookform/resolvers v5 Input/Output 타입 분리 패턴 (registration-schema.ts 참조)
  // useForm<Input, Context, Output> 3개 제네릭으로 선언해야 Resolver 타입 불일치 방지
  } = useForm<z.input<typeof eventSchema>, unknown, z.output<typeof eventSchema>>({
    resolver: zodResolver(eventSchema),
    mode: "onChange",
    defaultValues: {
      // 기본값: 빈 상태 (등록 모드)
      title: "",
      starts_at: "",
      visibility: "public",
      rsvp_mode: "light",
      capacity: null,
      rsvp_deadline: "",
      requires_approval: false,
      ends_at: "",
      location: "",
      description: "",
      category: "",
      cover_image_url: "",
      is_all_day: false,
      // 수정 모드: initialValues 로 덮어쓰기 (spread 로 병합)
      ...initialValues,
    },
  });

  // rsvp_mode 실시간 감시 — strict 전환 시 추가 필드 표시
  const rsvpMode = watch("rsvp_mode");
  const isStrictMode = rsvpMode === "strict";

  // ── 커버 이미지 핸들러 ────────────────────────────────────────────────
  /** 파일 선택 시 ObjectURL 생성 후 ImageCropDialog 에 전달 */
  const handleCoverChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // 이전 pending ObjectURL 이 있으면 해제
    if (pendingCoverSrc) URL.revokeObjectURL(pendingCoverSrc);
    setPendingCoverSrc(URL.createObjectURL(file));
    setPendingCoverName(file.name.replace(/\.[^.]+$/, "") || "cover");
    // 같은 파일 재선택 가능하도록 입력값 초기화
    e.target.value = "";
  }, [pendingCoverSrc]);

  /** ImageCropDialog 完了 콜백 — 크롭된 File 과 미리보기 URL 저장 */
  const handleCropComplete = useCallback(
    (croppedFile: File) => {
      // pending ObjectURL 해제
      if (pendingCoverSrc) URL.revokeObjectURL(pendingCoverSrc);
      // 이전 미리보기 해제
      if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl);
      const url = URL.createObjectURL(croppedFile);
      setCroppedCoverFile(croppedFile);
      setCoverPreviewUrl(url);
      setPendingCoverSrc(null);
    },
    [pendingCoverSrc, coverPreviewUrl]
  );

  /** ImageCropDialog 취소 콜백 */
  const handleCropCancel = useCallback(() => {
    if (pendingCoverSrc) URL.revokeObjectURL(pendingCoverSrc);
    setPendingCoverSrc(null);
  }, [pendingCoverSrc]);

  /** 커버 이미지 제거 */
  const handleCoverRemove = useCallback(() => {
    if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl);
    setCroppedCoverFile(null);
    setCoverPreviewUrl(null);
    setValue("cover_image_url", "");
  }, [coverPreviewUrl, setValue]);

  // ── 폼 제출 핸들러 ────────────────────────────────────────────────────
  const onSubmit = async (values: EventFormValues) => {
    setSubmitError(null);

    try {
      // Server Action 에 File 은 직접 전달 불가하므로 FormData 에 담아 전달.
      // 서버 측에서 coverFile 을 Storage 에 업로드 후 URL 을 DB 에 저장.
      const formData = new FormData();
      // 폼 값을 JSON 문자열로 담음 (Server Action 에서 JSON.parse 로 복원)
      formData.append("values", JSON.stringify(values));
      formData.append("circleId", circleId);
      if (croppedCoverFile) {
        // 새 파일이 선택된 경우만 첨부 — 없으면 기존 URL 이 values.cover_image_url 에 보존됨
        formData.append("coverFile", croppedCoverFile);
      }

      let result: { error: string } | void;

      if (mode === "edit" && eventId) {
        // 수정 모드: updateEvent Server Action 호출 (eventId 추가 전달)
        formData.append("eventId", eventId);
        result = await updateEvent(formData);
      } else {
        // 등록 모드: createEvent Server Action 호출
        result = await createEvent(formData);
      }

      if (result?.error) {
        setSubmitError(result.error);
      }
      // 성공 시 Server Action 내부에서 redirect("/events/[id]") 가 호출됨
    } catch (err) {
      // redirect() 는 내부적으로 Error 를 throw 하므로 잡지 않음.
      // 그 외 진짜 에러만 표시.
      const isRedirectError =
        err instanceof Error && err.message.includes("NEXT_REDIRECT");
      if (!isRedirectError) {
        setSubmitError("エラーが発生しました。もう一度お試しください。");
        console.error("[EventForm] submit error:", err);
      }
    }
  };

  return (
    <>
      {/* 커버 이미지 16:9 크롭 다이얼로그 — pendingCoverSrc 가 있을 때만 열림 */}
      <ImageCropDialog
        open={!!pendingCoverSrc}
        aspect={16 / 9}
        ratioLabel="16:9"
        imageSrc={pendingCoverSrc}
        fileName={pendingCoverName}
        maxWidth={1920}
        maxHeight={1080}
        onComplete={handleCropComplete}
        onCancel={handleCropCancel}
      />

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex flex-col gap-8 pb-24"
      >
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {/* 섹션 1: 기본 정보 */}
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section className="flex flex-col gap-5">
          <h2 className={SECTION_HEADING_CLS}>基本情報</h2>

          {/* 이벤트 제목 */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="title" className={LABEL_CLS}>
              タイトル
            </label>
            <Input
              id="title"
              type="text"
              placeholder="例：春の新歓イベント2026"
              autoComplete="off"
              className={cn(
                AUTH_INPUT_CLS,
                errors.title && "ring-2 ring-red-400 focus-visible:ring-red-400"
              )}
              aria-invalid={!!errors.title}
              aria-describedby={errors.title ? "error-title" : undefined}
              {...register("title")}
            />
            {errors.title && (
              <p id="error-title" role="alert" className={ERROR_CLS}>
                {errors.title.message}
              </p>
            )}
          </div>

          {/* 커버 이미지 (16:9) */}
          <div className="flex flex-col gap-1.5">
            <span className={LABEL_CLS}>
              カバー画像
              <span className={OPTIONAL_CLS}>（任意）</span>
            </span>
            {coverPreviewUrl ? (
              /* 크롭 완료 후 미리보기 */
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={coverPreviewUrl}
                  alt="カバープレビュー"
                  className="w-full rounded-xl object-cover"
                  style={{ aspectRatio: "16 / 9" }}
                />
                <button
                  type="button"
                  onClick={handleCoverRemove}
                  className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                  aria-label="カバー画像を削除"
                >
                  ×
                </button>
              </div>
            ) : (
              /* 이미지 선택 버튼 */
              <label
                htmlFor="cover-input"
                className="flex h-32 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50 text-sm text-muted-foreground transition-colors hover:border-neutral-400 hover:bg-neutral-100"
              >
                <span className="flex flex-col items-center gap-1">
                  <span className="text-2xl" aria-hidden>📷</span>
                  <span>16:9 カバー画像を選択</span>
                </span>
                <input
                  id="cover-input"
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleCoverChange}
                  aria-label="カバー画像を選択"
                />
              </label>
            )}
          </div>

          {/* 카테고리 */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="category" className={LABEL_CLS}>
              カテゴリ
              <span className={OPTIONAL_CLS}>（任意）</span>
            </label>
            <Input
              id="category"
              type="text"
              placeholder="例：新歓、合宿、練習試合"
              className={cn(
                AUTH_INPUT_CLS,
                errors.category && "ring-2 ring-red-400 focus-visible:ring-red-400"
              )}
              aria-invalid={!!errors.category}
              aria-describedby={errors.category ? "error-category" : undefined}
              {...register("category")}
            />
            {errors.category && (
              <p id="error-category" role="alert" className={ERROR_CLS}>
                {errors.category.message}
              </p>
            )}
          </div>
        </section>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {/* 섹션 2: 일시 */}
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section className="flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <h2 className={SECTION_HEADING_CLS}>日時</h2>
            {/* 終日 체크박스 */}
            <Controller
              control={control}
              name="is_all_day"
              render={({ field }) => (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="is_all_day"
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(checked === true)}
                    aria-label="終日"
                  />
                  <Label htmlFor="is_all_day" className="cursor-pointer text-sm">
                    終日
                  </Label>
                </div>
              )}
            />
          </div>

          {/* 시작 일시 */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="starts_at" className={LABEL_CLS}>
              開始日時
            </label>
            <input
              id="starts_at"
              type="datetime-local"
              className={cn(
                AUTH_INPUT_CLS,
                "w-full px-3",
                errors.starts_at && "ring-2 ring-red-400 focus-visible:ring-red-400"
              )}
              aria-invalid={!!errors.starts_at}
              aria-describedby={errors.starts_at ? "error-starts-at" : undefined}
              {...register("starts_at")}
            />
            {errors.starts_at && (
              <p id="error-starts-at" role="alert" className={ERROR_CLS}>
                {errors.starts_at.message}
              </p>
            )}
          </div>

          {/* 종료 일시 */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ends_at" className={LABEL_CLS}>
              終了日時
              <span className={OPTIONAL_CLS}>（任意）</span>
            </label>
            <input
              id="ends_at"
              type="datetime-local"
              className={cn(
                AUTH_INPUT_CLS,
                "w-full px-3",
                errors.ends_at && "ring-2 ring-red-400 focus-visible:ring-red-400"
              )}
              aria-invalid={!!errors.ends_at}
              aria-describedby={errors.ends_at ? "error-ends-at" : undefined}
              {...register("ends_at")}
            />
            {errors.ends_at && (
              <p id="error-ends-at" role="alert" className={ERROR_CLS}>
                {errors.ends_at.message}
              </p>
            )}
          </div>
        </section>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {/* 섹션 3: 장소 · 설명 */}
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section className="flex flex-col gap-5">
          <h2 className={SECTION_HEADING_CLS}>場所・説明</h2>

          {/* 장소 */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="location" className={LABEL_CLS}>
              場所
              <span className={OPTIONAL_CLS}>（任意）</span>
            </label>
            <Input
              id="location"
              type="text"
              placeholder="例：慶應義塾大学 日吉キャンパス"
              className={cn(
                AUTH_INPUT_CLS,
                errors.location && "ring-2 ring-red-400 focus-visible:ring-red-400"
              )}
              aria-invalid={!!errors.location}
              aria-describedby={errors.location ? "error-location" : undefined}
              {...register("location")}
            />
            {errors.location && (
              <p id="error-location" role="alert" className={ERROR_CLS}>
                {errors.location.message}
              </p>
            )}
          </div>

          {/* 설명 */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="description" className={LABEL_CLS}>
              説明
              <span className={OPTIONAL_CLS}>（任意）</span>
            </label>
            <Textarea
              id="description"
              rows={5}
              maxLength={3000}
              placeholder="イベントの詳細を入力してください"
              className={cn(
                "w-full rounded-xl border-0 bg-neutral-100 p-3 text-base shadow-none transition-colors",
                "placeholder:text-muted-foreground min-h-[120px] resize-none",
                "focus-visible:ring-keio-navy/40 focus-visible:bg-white focus-visible:ring-2 focus-visible:outline-none",
                errors.description && "ring-2 ring-red-400 focus-visible:ring-red-400"
              )}
              aria-invalid={!!errors.description}
              aria-describedby={errors.description ? "error-description" : undefined}
              {...register("description")}
            />
            {errors.description && (
              <p id="error-description" role="alert" className={ERROR_CLS}>
                {errors.description.message}
              </p>
            )}
          </div>
        </section>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {/* 섹션 4: 공개 범위 */}
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section className="flex flex-col gap-5">
          <h2 className={SECTION_HEADING_CLS}>公開範囲</h2>

          <Controller
            control={control}
            name="visibility"
            render={({ field }) => (
              <RadioGroup
                value={field.value}
                onValueChange={field.onChange}
                className="flex flex-col gap-3"
                aria-label="公開範囲"
              >
                {/* 전체 공개 */}
                <label
                  htmlFor="visibility-public"
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors",
                    field.value === "public"
                      ? "border-keio-navy bg-keio-navy/5"
                      : "border-border hover:bg-muted/40"
                  )}
                >
                  <RadioGroupItem value="public" id="visibility-public" className="mt-0.5" />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">全体公開</span>
                    <span className="text-xs text-muted-foreground">
                      誰でも閲覧できます
                    </span>
                  </div>
                </label>

                {/* 멤버 한정 (Phase 2 - 현재는 미사용이지만 UI 준비) */}
                <label
                  htmlFor="visibility-members"
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors",
                    field.value === "members"
                      ? "border-keio-navy bg-keio-navy/5"
                      : "border-border hover:bg-muted/40"
                  )}
                >
                  <RadioGroupItem value="members" id="visibility-members" className="mt-0.5" />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">メンバー限定</span>
                    <span className="text-xs text-muted-foreground">
                      サークル・部活動のメンバーのみ閲覧できます（Phase 2）
                    </span>
                  </div>
                </label>
              </RadioGroup>
            )}
          />
          {errors.visibility && (
            <p role="alert" className={ERROR_CLS}>
              {errors.visibility.message}
            </p>
          )}
        </section>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {/* 섹션 5: 参加方式 (rsvp_mode) — 등록 후 변경 불가 */}
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section className="flex flex-col gap-5">
          <div className="flex flex-col gap-0.5">
            <h2 className={SECTION_HEADING_CLS}>参加方式</h2>
            {/* 등록 후 변경 불가 경고 — 수정 모드에서는 「変更不可」로 강조 */}
            <p className="text-xs text-amber-600 dark:text-amber-400">
              {mode === "edit"
                ? "⚠️ 参加方式は登録後に変更できません"
                : "⚠️ 登録後に変更はできません"}
            </p>
          </div>

          <Controller
            control={control}
            name="rsvp_mode"
            render={({ field }) => (
              <RadioGroup
                value={field.value}
                onValueChange={field.onChange}
                className="flex flex-col gap-3"
                aria-label="参加方式"
                // 수정 모드에서는 rsvp_mode 변경 불가 — pointer-events-none + opacity
                aria-disabled={mode === "edit" || undefined}
              >
                {/* ライト (light) — 気軽に参加意思表示 */}
                <label
                  htmlFor="rsvp-light"
                  className={cn(
                    "flex items-start gap-3 rounded-xl border p-4 transition-colors",
                    // 수정 모드: 클릭 비활성 + 흐리게 처리
                    mode === "edit" ? "cursor-not-allowed opacity-60" : "cursor-pointer",
                    field.value === "light"
                      ? "border-keio-navy bg-keio-navy/5"
                      : "border-border hover:bg-muted/40"
                  )}
                >
                  <RadioGroupItem
                    value="light"
                    id="rsvp-light"
                    className="mt-0.5"
                    disabled={mode === "edit"}
                  />
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">ライト</span>
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        気軽に参加表明
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      「行く」「気になる」の2択で気軽に参加意思を表明できます。定員・締切なし。
                    </span>
                  </div>
                </label>

                {/* しっかり (strict) — 定員・締切・承認制 */}
                <label
                  htmlFor="rsvp-strict"
                  className={cn(
                    "flex items-start gap-3 rounded-xl border p-4 transition-colors",
                    // 수정 모드: 클릭 비활성 + 흐리게 처리
                    mode === "edit" ? "cursor-not-allowed opacity-60" : "cursor-pointer",
                    field.value === "strict"
                      ? "border-keio-navy bg-keio-navy/5"
                      : "border-border hover:bg-muted/40"
                  )}
                >
                  <RadioGroupItem
                    value="strict"
                    id="rsvp-strict"
                    className="mt-0.5"
                    disabled={mode === "edit"}
                  />
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">しっかり</span>
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        定員・締切・承認制
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      定員・申込締切を設定できます。承認制にすることも可能です。
                    </span>
                  </div>
                </label>
              </RadioGroup>
            )}
          />
          {errors.rsvp_mode && (
            <p role="alert" className={ERROR_CLS}>
              {errors.rsvp_mode.message}
            </p>
          )}

          {/* ── strict 모드 전용 추가 필드 (동적 표시) ─────────────────── */}
          {isStrictMode && (
            <div className="flex flex-col gap-4 rounded-xl border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-800/50 dark:bg-blue-900/10">
              <p className="text-xs font-medium text-blue-700 dark:text-blue-400">
                しっかりモードの詳細設定
              </p>

              {/* 정원 (capacity) */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="capacity" className={LABEL_CLS}>
                  定員
                  <span className={OPTIONAL_CLS}>（任意・空欄で無制限）</span>
                </label>
                <Input
                  id="capacity"
                  type="number"
                  min={1}
                  step={1}
                  placeholder="例：30"
                  className={cn(
                    AUTH_INPUT_CLS,
                    errors.capacity && "ring-2 ring-red-400 focus-visible:ring-red-400"
                  )}
                  aria-invalid={!!errors.capacity}
                  aria-describedby={errors.capacity ? "error-capacity" : undefined}
                  {...register("capacity")}
                />
                {errors.capacity && (
                  <p id="error-capacity" role="alert" className={ERROR_CLS}>
                    {errors.capacity.message}
                  </p>
                )}
              </div>

              {/* 신청 마감 (rsvp_deadline) */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="rsvp_deadline" className={LABEL_CLS}>
                  申込締切日時
                  <span className={OPTIONAL_CLS}>（任意・開始日時より前）</span>
                </label>
                <input
                  id="rsvp_deadline"
                  type="datetime-local"
                  className={cn(
                    AUTH_INPUT_CLS,
                    "w-full px-3",
                    errors.rsvp_deadline && "ring-2 ring-red-400 focus-visible:ring-red-400"
                  )}
                  aria-invalid={!!errors.rsvp_deadline}
                  aria-describedby={errors.rsvp_deadline ? "error-rsvp-deadline" : undefined}
                  {...register("rsvp_deadline")}
                />
                {errors.rsvp_deadline && (
                  <p id="error-rsvp-deadline" role="alert" className={ERROR_CLS}>
                    {errors.rsvp_deadline.message}
                  </p>
                )}
              </div>

              {/* 승인제 (requires_approval) */}
              <div className="flex flex-col gap-1.5">
                <Controller
                  control={control}
                  name="requires_approval"
                  render={({ field }) => (
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="requires_approval"
                        checked={field.value}
                        onCheckedChange={(checked) => field.onChange(checked === true)}
                        className="mt-0.5 shrink-0"
                        aria-describedby="hint-requires-approval"
                      />
                      <div className="flex flex-col gap-0.5">
                        <Label
                          htmlFor="requires_approval"
                          className="cursor-pointer text-sm font-medium"
                        >
                          承認制にする
                        </Label>
                        <p id="hint-requires-approval" className="text-xs text-muted-foreground">
                          申込者をスタッフが1件ずつ承認します
                        </p>
                      </div>
                    </div>
                  )}
                />
              </div>
            </div>
          )}
        </section>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {/* 제출 에러 표시 */}
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {submitError && (
          <p
            role="alert"
            className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400"
          >
            {submitError}
          </p>
        )}

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {/* 제출 버튼 */}
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="h-12 w-full rounded-xl bg-keio-navy text-keio-navy-foreground text-base font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              {mode === "edit" ? "保存中…" : "作成中…"}
            </span>
          ) : (
            mode === "edit" ? "変更を保存する" : "イベントを作成する"
          )}
        </Button>
      </form>
    </>
  );
}
