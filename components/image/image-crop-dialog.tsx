"use client";

/**
 * ImageCropDialog — 업로드 전 이미지 크롭(자르기) 다이얼로그
 *
 * react-easy-crop 으로 표시 비율에 맞게 이미지를 자른다.
 * 확대/축소는 슬라이더 없이 "손가락 핀치(모바일) · 마우스 휠/트랙패드(데스크톱)"로 한다.
 * 한 번에 "한 장"만 처리한다. 여러 장 순차 진행(큐)은 호출측이 책임진다.
 *
 * 레이아웃(정돈된 모달, 인스타·iOS 사진앱 패턴 참고):
 *   상단 바  → 좌: ✕(취소) / 중앙: 비율 배지(+진행) / 우: 完了(확정)
 *   크롭 영역 → objectFit="cover" 로 프레임을 꽉 채움(검은 레터박스 제거),
 *               바깥 영역은 react-easy-crop 기본 딤 마스크로 어둡게
 *
 * 주의: 브라우저 전용(Canvas). objectURL 생성/해제는 호출측이 관리한다.
 */

import { useEffect, useState } from "react";
import Cropper, { type Area, type Point } from "react-easy-crop";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { getCroppedFile } from "@/lib/image/crop-image";
import { cn } from "@/lib/utils";

interface ImageCropDialogProps {
  /** 다이얼로그 표시 여부 */
  open: boolean;
  /** 크롭 비율 — 커버 16/9, 게시물 1 */
  aspect: number;
  /** 비율 배지 라벨 (예: "16:9", "1:1") */
  ratioLabel: string;
  /** 크롭할 원본 이미지 objectURL (null 이면 표시 안 함) */
  imageSrc: string | null;
  /** 결과 파일명 base (확장자는 .jpg 로 강제됨) */
  fileName: string;
  /** 결과 해상도 상한 (CROP_OUTPUT 에서 전달) — 원본이 작으면 줄이지 않음 */
  maxWidth: number;
  maxHeight: number;
  /** 「完了」 — 잘라낸 File 전달 */
  onComplete: (croppedFile: File) => void;
  /** 「✕」/닫기 — 이 장 건너뛰기 */
  onCancel: () => void;
  /** 진행 표시용 (예: 2 / 5 枚目). 선택 */
  currentIndex?: number;
  totalCount?: number;
}

export function ImageCropDialog({
  open,
  aspect,
  ratioLabel,
  imageSrc,
  fileName,
  maxWidth,
  maxHeight,
  onComplete,
  onCancel,
  currentIndex,
  totalCount,
}: ImageCropDialogProps) {
  // ── 크롭 상태 ──
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  // 줌은 핀치/휠 제스처가 onZoomChange 로 갱신한다 (슬라이더 없음)
  const [zoom, setZoom] = useState(1);
  // react-easy-crop 이 알려주는 "원본에서 잘라낼 픽셀 영역"
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  // 完了 → getCroppedFile 처리 중 (버튼 비활성)
  const [isProcessing, setIsProcessing] = useState(false);

  // 새 이미지를 받을 때마다 크롭 위치/줌 초기화
  useEffect(() => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  }, [imageSrc]);

  // 진행 표시 텍스트 (totalCount 가 2 이상일 때만 노출)
  const progressLabel =
    totalCount && totalCount > 1 && currentIndex != null
      ? `${currentIndex + 1} / ${totalCount}`
      : null;

  // 「完了」 핸들러 — 크롭 영역을 잘라 File 생성 후 onComplete
  const handleConfirm = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setIsProcessing(true);
    try {
      const file = await getCroppedFile(imageSrc, croppedAreaPixels, {
        maxWidth,
        maxHeight,
        fileName,
      });
      onComplete(file);
    } catch (e) {
      console.error("[ImageCropDialog] getCroppedFile", e);
      toast.error("画像の処理に失敗しました");
      onCancel(); // 실패 시 이 장은 건너뜀
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // 닫힘(ESC/오버레이) = 취소로 간주 (단, 처리 중에는 무시)
        if (!next && !isProcessing) onCancel();
      }}
    >
      <DialogContent
        showCloseButton={false}
        aria-describedby={undefined}
        className="gap-0 overflow-hidden p-0 sm:max-w-md"
      >
        {/* 접근성용 제목 (화면엔 숨김 — 상단 바가 시각적 역할) */}
        <DialogTitle className="sr-only">画像を調整</DialogTitle>

        {/* ── 상단 바: ✕(취소) / 비율 배지(+진행) / 完了(확정) ── */}
        <div className="flex items-center justify-between px-3 py-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            aria-label="キャンセル"
            className="text-muted-foreground hover:text-foreground -ml-1 rounded-full p-1.5 transition-colors disabled:opacity-40"
          >
            <X className="size-5" aria-hidden="true" />
          </button>

          {/* 비율 배지 + 진행 표시 */}
          <div className="flex items-center gap-2">
            <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs font-medium tabular-nums">
              {ratioLabel}
            </span>
            {progressLabel && (
              <span className="text-muted-foreground text-xs tabular-nums">
                {progressLabel} 枚目
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={isProcessing || !croppedAreaPixels}
            className={cn(
              "text-primary -mr-1 flex items-center gap-1 rounded-full px-2 py-1.5 text-sm font-semibold transition-opacity",
              "hover:opacity-80 disabled:opacity-40"
            )}
          >
            {isProcessing && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            完了
          </button>
        </div>

        {/* ── 크롭 영역 ── react-easy-crop 은 부모가 position:relative + 고정 높이여야 함.
            objectFit="cover" 로 이미지가 프레임을 꽉 채워 검은 레터박스를 없앤다. */}
        <div className="relative h-[58vh] max-h-[440px] w-full bg-black">
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              minZoom={1}
              maxZoom={3}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, areaPixels) => setCroppedAreaPixels(areaPixels)}
              objectFit="cover"
            />
          )}
        </div>

        {/* ── 하단 조작 안내 한 줄 (슬라이더 대신) ── */}
        <p className="text-muted-foreground px-4 py-3 text-center text-xs">
          ピンチ・スクロールで拡大、ドラッグで位置を調整
        </p>
      </DialogContent>
    </Dialog>
  );
}
