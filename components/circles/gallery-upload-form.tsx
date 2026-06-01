"use client";

/**
 * GalleryUploadForm — 운영자 갤러리 업로드 폼
 *
 * 동작 흐름:
 *  1. 사용자가 이미지 파일을 선택 (파일 선택 버튼 또는 드래그&드롭)
 *  2. ImageCropDialog 로 자유 비율 크롭 (갤러리는 비율 제한 없음)
 *  3. 크롭 완료 후 미리보기 표시
 *  4. 캡션(선택) + 촬영일(선택, 기본 오늘) 입력
 *  5. 「アップロード」 버튼 클릭:
 *     a. 클라이언트 Supabase로 Storage 업로드 (uploadGalleryImage)
 *     b. 성공 시 insertGalleryRecord Server Action 호출 → DB INSERT
 *     c. 성공 시 toast.success + router.push(`/circles/${circleId}`)
 *     d. 실패 시 toast.error
 *
 * 파일 크기 제한: 4MB (Storage 버킷 설정에 맞춤)
 * 이미지 크롭: react-easy-crop / 자유 비율 (aspect=undefined → ImageCropDialog 미사용,
 *              대신 EXIF strip + 직접 업로드)
 *
 * 설계 메모:
 *  - 갤러리 이미지는 커버(16:9)·게시물(1:1)과 달리 자유 비율로 허용한다 (T-012 요건).
 *  - Storage 업로드를 클라이언트에서 처리하고 URL 만 Server Action 으로 넘기는 이유:
 *    Server Action 에서 FormData 를 통한 File 전송은 4MB 제한에 충돌하고,
 *    Canvas/EXIF strip 은 브라우저 전용 API 이기 때문.
 */

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Camera, ImagePlus, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ImageCropDialog } from "@/components/image/image-crop-dialog";
import { createClient } from "@/lib/supabase/client";
import { uploadGalleryImage, validateUpload } from "@/lib/storage/strip-exif";

import { AUTH_INPUT_CLS } from "@/lib/auth/input-class";
import { cn } from "@/lib/utils";
import { insertGalleryRecord } from "@/app/circles/[id]/galleries/actions";

// ─────────────────────────────────────────
// 상수
// ─────────────────────────────────────────

/** 갤러리 크롭 비율 — 자유 비율(Free). react-easy-crop 의 aspect prop */
const GALLERY_ASPECT = 4 / 3; // 4:3을 기본으로 하되, 자유 비율 표시용 라벨 사용

/** 갤러리 크롭 출력 해상도 상한 */
const GALLERY_OUTPUT = { width: 2160, height: 2160 } as const;

// ─────────────────────────────────────────
// Props
// ─────────────────────────────────────────

interface GalleryUploadFormProps {
  /** 동아리 UUID */
  circleId: string;
}

// ─────────────────────────────────────────
// 컴포넌트
// ─────────────────────────────────────────

export function GalleryUploadForm({ circleId }: GalleryUploadFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── 이미지 관련 상태 ────────────────────────────────────────────────────────
  /** 원본 파일 — 크롭 다이얼로그에 전달 */
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  /** 크롭 다이얼로그에 넘길 objectURL (다이얼로그 열릴 때 생성, 닫힐 때 해제) */
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  /** 크롭 다이얼로그 표시 여부 */
  const [cropOpen, setCropOpen] = useState(false);
  /** 크롭 완료된 File — 실제 업로드에 사용 */
  const [croppedFile, setCroppedFile] = useState<File | null>(null);
  /** 미리보기 objectURL (크롭 완료 후 생성) */
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // ── 폼 입력 상태 ────────────────────────────────────────────────────────────
  /** 캡션 입력 (선택) */
  const [caption, setCaption] = useState("");
  /** 촬영일 (선택, 기본 오늘) */
  const [takenAt, setTakenAt] = useState<Date>(new Date());
  /** 캘린더 팝오버 열림 여부 */
  const [calendarOpen, setCalendarOpen] = useState(false);

  // ── 제출 상태 ───────────────────────────────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<"idle" | "uploading" | "saving">("idle");

  // ── 파일 선택 핸들러 ────────────────────────────────────────────────────────

  const handleFileSelect = useCallback((file: File | null | undefined) => {
    if (!file) return;

    // 파일 검증 (크기·MIME)
    const validation = validateUpload(file);
    if (!validation.ok) {
      toast.error(validation.error);
      return;
    }

    // 기존 objectURL 해제
    if (cropSrc) {
      URL.revokeObjectURL(cropSrc);
    }

    // 크롭 다이얼로그용 objectURL 생성
    const src = URL.createObjectURL(file);
    setOriginalFile(file);
    setCropSrc(src);
    setCropOpen(true);
    // 파일 input 초기화 (같은 파일 재선택 가능)
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    handleFileSelect(file);
  };

  // 드래그&드롭 핸들러
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    handleFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  // ── 크롭 다이얼로그 핸들러 ──────────────────────────────────────────────────

  const handleCropComplete = (file: File) => {
    // 기존 미리보기 URL 해제
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setCroppedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setCropOpen(false);

    // 크롭 소스 objectURL 해제
    if (cropSrc) {
      URL.revokeObjectURL(cropSrc);
      setCropSrc(null);
    }
  };

  const handleCropCancel = () => {
    setCropOpen(false);
    // cropSrc objectURL 해제
    if (cropSrc) {
      URL.revokeObjectURL(cropSrc);
      setCropSrc(null);
    }
    setOriginalFile(null);
  };

  // ── 이미지 제거 핸들러 ──────────────────────────────────────────────────────

  const handleRemoveImage = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setCroppedFile(null);
    setPreviewUrl(null);
    setOriginalFile(null);
  };

  // ── 제출 핸들러 ─────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!croppedFile) {
      toast.error("画像を選択してください。");
      return;
    }

    setIsSubmitting(true);

    try {
      // ── 단계 1: Storage 업로드 (클라이언트 Supabase) ──────────────────────
      setUploadProgress("uploading");
      const supabase = createClient();
      const uploadResult = await uploadGalleryImage(supabase, circleId, croppedFile);

      if ("error" in uploadResult) {
        toast.error(`アップロードに失敗しました: ${uploadResult.error}`);
        return;
      }

      // ── 단계 2: DB INSERT (Server Action) ────────────────────────────────
      setUploadProgress("saving");
      const result = await insertGalleryRecord(
        circleId,
        uploadResult.url,
        caption,
        takenAt ? takenAt.toISOString() : null
      );

      if (!result.ok) {
        toast.error(`保存に失敗しました: ${result.error}`);
        return;
      }

      // ── 완료 ─────────────────────────────────────────────────────────────
      toast.success("ギャラリーに追加しました！");
      router.push(`/circles/${circleId}`);
    } catch (err) {
      console.error("[GalleryUploadForm] 예외 발생:", err);
      toast.error("予期せぬエラーが発生しました。もう一度お試しください。");
    } finally {
      setIsSubmitting(false);
      setUploadProgress("idle");
    }
  };

  // ─────────────────────────────────────────
  // 렌더
  // ─────────────────────────────────────────

  return (
    <>
      {/* ── 크롭 다이얼로그 (이미지 선택 후 자동 표시) ── */}
      <ImageCropDialog
        open={cropOpen}
        aspect={GALLERY_ASPECT}
        ratioLabel="フリー"
        imageSrc={cropSrc}
        fileName={originalFile?.name ?? "gallery"}
        maxWidth={GALLERY_OUTPUT.width}
        maxHeight={GALLERY_OUTPUT.height}
        onComplete={handleCropComplete}
        onCancel={handleCropCancel}
      />

      <form onSubmit={handleSubmit} className="mx-auto max-w-lg space-y-6 px-4 pb-24">
        {/* ── 이미지 선택 영역 ── */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">写真 *</Label>

          {previewUrl ? (
            /* 선택된 이미지 미리보기 */
            <div className="relative">
              <div className="bg-muted relative aspect-[4/3] w-full overflow-hidden rounded-2xl">
                <Image
                  src={previewUrl}
                  alt="プレビュー"
                  fill
                  sizes="(min-width: 640px) 512px, 100vw"
                  className="object-cover"
                />
              </div>
              {/* 이미지 제거 버튼 */}
              <button
                type="button"
                onClick={handleRemoveImage}
                disabled={isSubmitting}
                aria-label="画像を削除"
                className="bg-background/80 hover:bg-background absolute top-2 right-2 rounded-full p-1.5 backdrop-blur-sm transition-colors disabled:opacity-40"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
              {/* 이미지 교체 버튼 */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSubmitting}
                aria-label="画像を変更"
                className="bg-background/80 hover:bg-background absolute bottom-2 right-2 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium backdrop-blur-sm transition-colors disabled:opacity-40"
              >
                <Camera className="size-3.5" aria-hidden="true" />
                変更
              </button>
            </div>
          ) : (
            /* 이미지 미선택 상태 — 드래그&드롭 영역 */
            <div
              role="button"
              tabIndex={0}
              aria-label="画像を選択"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              className={cn(
                "border-border hover:border-primary/50 hover:bg-muted/50 flex aspect-[4/3] w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed transition-colors",
                "focus-visible:ring-keio-navy/40 focus-visible:outline-none focus-visible:ring-2"
              )}
            >
              <div className="bg-muted flex size-14 items-center justify-center rounded-full">
                <ImagePlus className="text-muted-foreground size-7" strokeWidth={1.5} />
              </div>
              <div className="space-y-1 text-center">
                <p className="text-sm font-medium">写真を選択</p>
                <p className="text-muted-foreground text-xs">
                  タップして選択、またはドラッグ&amp;ドロップ
                </p>
                <p className="text-muted-foreground/60 text-xs">JPEG / PNG / WebP · 最大4MB</p>
              </div>
            </div>
          )}

          {/* 숨겨진 파일 input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleInputChange}
            aria-hidden="true"
          />
        </div>

        {/* ── 캡션 입력 ── */}
        <div className="space-y-2">
          <Label htmlFor="caption" className="text-sm font-medium">
            キャプション
            <span className="text-muted-foreground ml-1.5 text-xs font-normal">（任意）</span>
          </Label>
          <Input
            id="caption"
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="写真の説明を入力（任意）"
            maxLength={200}
            disabled={isSubmitting}
            className={cn(AUTH_INPUT_CLS)}
          />
          {/* 글자수 표시 */}
          {caption.length > 0 && (
            <p className="text-muted-foreground/60 text-right text-xs">{caption.length}/200</p>
          )}
        </div>

        {/* ── 촬영일 선택 ── */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            撮影日
            <span className="text-muted-foreground ml-1.5 text-xs font-normal">（任意）</span>
          </Label>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                disabled={isSubmitting}
                className={cn(
                  AUTH_INPUT_CLS,
                  "flex w-full items-center px-3 text-left",
                  "disabled:cursor-not-allowed disabled:opacity-50"
                )}
              >
                <span className="flex-1">
                  {takenAt ? (
                    format(takenAt, "yyyy年M月d日（E）", { locale: ja })
                  ) : (
                    <span className="text-muted-foreground">日付を選択</span>
                  )}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={takenAt}
                onSelect={(date) => {
                  if (date) setTakenAt(date);
                  setCalendarOpen(false);
                }}
                disabled={(date) =>
                  // 미래 날짜 선택 불가 (오늘 포함)
                  date > new Date()
                }
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* ── 업로드 버튼 ── */}
        <div className="pt-2">
          <Button
            type="submit"
            disabled={!croppedFile || isSubmitting}
            className="h-12 w-full rounded-xl text-base font-semibold"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                {uploadProgress === "uploading" ? "アップロード中..." : "保存中..."}
              </>
            ) : (
              <>
                <Upload className="mr-2 size-4" aria-hidden="true" />
                ギャラリーに追加
              </>
            )}
          </Button>

          {/* 취소 링크 */}
          <button
            type="button"
            onClick={() => router.back()}
            disabled={isSubmitting}
            className="text-muted-foreground hover:text-foreground mt-3 w-full text-center text-sm transition-colors disabled:opacity-40"
          >
            キャンセル
          </button>
        </div>
      </form>
    </>
  );
}
