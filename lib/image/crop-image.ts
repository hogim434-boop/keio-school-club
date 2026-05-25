/**
 * lib/image/crop-image.ts
 *
 * react-easy-crop 에서 받은 크롭 영역(croppedAreaPixels)을 Canvas 로 그려
 * "목표 해상도의 JPEG File" 로 만들어 주는 유틸리티.
 *
 * 동작 원리는 lib/storage/strip-exif.ts 의 stripImageExif 와 동일한 패턴:
 *   new Image() 로드 → canvas.drawImage → canvas.toBlob("image/jpeg", 0.9) → File
 * JPEG 로 다시 그리기 때문에 EXIF(촬영 위치 등 메타데이터)도 자연히 제거된다.
 *
 * 주의: 브라우저 전용 (Canvas API). Server Component / Node.js 에서 호출 금지.
 */

// ─────────────────────────────────────────
// 출력 해상도 "상한"(MAX)
//  - 잘라낸 영역은 원본 해상도를 최대한 유지한다. 단, 너무 커서 4MB 업로드 한도를
//    넘지 않도록 이 상한까지만 허용하고, 상한을 넘을 때만 줄인다(절대 억지로 키우지 않음).
//  - cover  = 16:9 (커버 캐러셀 aspect-[16/9] 에 맞춤)
//  - square = 1:1  (게시물/앨범 정사각 그리드에 맞춤)
// ─────────────────────────────────────────
export const CROP_OUTPUT = {
  cover: { width: 1920, height: 1080 },
  square: { width: 1440, height: 1440 },
} as const;

/** react-easy-crop 의 onCropComplete 두 번째 인자(잘라낼 원본 픽셀 영역) 형태 */
export type CroppedAreaPixels = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/** 내부 유틸: objectURL(또는 dataURL)로부터 HTMLImageElement 로드 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("이미지 로드에 실패했습니다."));
    el.src = src;
  });
}

/**
 * 크롭 영역을 잘라 JPEG File 을 만든다.
 *
 * 핵심: 잘라낸 영역의 "원본 해상도"를 그대로 출력한다(원본에서 컷).
 *       단 maxWidth/maxHeight 상한을 넘을 때만 비율을 유지한 채 줄이고,
 *       상한보다 작으면 절대 억지로 키우지 않는다(업스케일 금지 → 화질 보존).
 *
 * @param imageSrc          크롭할 원본 이미지의 objectURL (호출측이 생성/해제 책임)
 * @param croppedAreaPixels react-easy-crop 이 알려준, 원본에서 잘라낼 픽셀 영역
 * @param options.maxWidth   결과 가로 상한 px (CROP_OUTPUT 에서 전달)
 * @param options.maxHeight  결과 세로 상한 px
 * @param options.fileName   결과 파일명 base (확장자는 .jpg 로 강제)
 * @returns image/jpeg File
 */
export async function getCroppedFile(
  imageSrc: string,
  croppedAreaPixels: CroppedAreaPixels,
  options: { maxWidth: number; maxHeight: number; fileName: string }
): Promise<File> {
  const { maxWidth, maxHeight, fileName } = options;

  // 1) 원본 이미지 로드
  const img = await loadImage(imageSrc);

  // 2) 출력 크기 결정 — 잘라낸 영역의 원본 픽셀 크기를 기준으로,
  //    상한(max)을 넘을 때만 비율 유지하며 축소. (scale 은 1 이하로만 → 업스케일 방지)
  const srcW = croppedAreaPixels.width;
  const srcH = croppedAreaPixels.height;
  const scale = Math.min(1, maxWidth / srcW, maxHeight / srcH);
  const outW = Math.max(1, Math.round(srcW * scale));
  const outH = Math.max(1, Math.round(srcH * scale));

  // 3) 출력 크기 캔버스 준비
  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D 컨텍스트를 가져올 수 없습니다.");
  }
  // 다운스케일 시 화질 향상
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // 4) 원본의 크롭 영역(src)을 출력 크기(dest)로 한 번에 그리기 = 크롭 + (필요 시)리사이즈
  ctx.drawImage(
    img,
    // 원본에서 잘라낼 영역 (좌상단 x,y + 크기 w,h)
    croppedAreaPixels.x,
    croppedAreaPixels.y,
    srcW,
    srcH,
    // 캔버스에 그릴 위치/크기
    0,
    0,
    outW,
    outH
  );

  // 5) JPEG(품질 0.92)로 변환 — 업로드 시 한 번 더 재인코딩되므로 품질을 약간 높게 둔다
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error("이미지 변환에 실패했습니다."));
      },
      "image/jpeg",
      0.92
    );
  });

  // 6) 파일명 확장자를 .jpg 로 통일해 File 생성
  const baseName = fileName.replace(/\.[^/.]+$/, "");
  return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
}
