/**
 * lib/storage/strip-exif.ts
 *
 * 역할:
 *  - 클라이언트(브라우저)에서 이미지 업로드 전 EXIF 메타데이터를 제거
 *  - Canvas API 를 이용해 drawImage → toBlob('image/jpeg') 로 변환 (EXIF 제거됨)
 *  - Supabase Storage circles-public 버킷에 업로드하는 헬퍼 3종 제공
 *
 * 사용 제약:
 *  - stripImageExif / upload* 헬퍼는 브라우저 환경 전용 (Client Component 에서만 호출)
 *  - validateUpload 는 브라우저·서버 모두 사용 가능
 *
 * path 구조:
 *  cover   → circles/{circleId}/cover.jpg              (upsert)
 *  gallery → circles/{circleId}/gallery/{uuid}.jpg
 *  report  → circles/{circleId}/reports/{reportId}/{uuid}.jpg
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/types/database";

// ─────────────────────────────────────────
// 상수
// ─────────────────────────────────────────

/** Supabase Storage 버킷 이름 */
export const BUCKET = "circles-public";

/** 최대 파일 크기: 4MB */
export const MAX_BYTES = 4 * 1024 * 1024;

/** 허용 MIME 타입 */
export const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"] as const;

export type AllowedMime = (typeof ALLOWED_MIME)[number];

// ─────────────────────────────────────────
// 파일 검증
// ─────────────────────────────────────────

/**
 * 업로드 파일의 존재·크기·MIME 타입을 검사합니다.
 *
 * @param file - 검사할 File 객체 (null/undefined 허용 — 오류 반환)
 * @returns { ok: true } 또는 { ok: false; error: 한국어 오류 메시지 }
 *
 * @example
 * const result = validateUpload(file);
 * if (!result.ok) {
 *   alert(result.error);
 *   return;
 * }
 */
export function validateUpload(
  file: File | null | undefined
): { ok: true } | { ok: false; error: string } {
  // 파일 없음 검사
  if (file == null) {
    return { ok: false, error: "파일이 없습니다. 이미지를 선택해주세요." };
  }

  // MIME 타입 검사
  if (!(ALLOWED_MIME as readonly string[]).includes(file.type)) {
    return {
      ok: false,
      error: `허용되지 않은 파일 형식입니다. JPEG, PNG, WebP 만 업로드할 수 있습니다. (입력: ${file.type})`,
    };
  }

  // 파일 크기 검사
  if (file.size > MAX_BYTES) {
    const sizeMB = (file.size / 1024 / 1024).toFixed(1);
    return {
      ok: false,
      error: `파일 크기가 ${sizeMB}MB로 4MB 초과입니다. 더 작은 이미지를 사용해주세요.`,
    };
  }

  return { ok: true };
}

// ─────────────────────────────────────────
// EXIF 제거 (Canvas 방식)
// ─────────────────────────────────────────

/**
 * Canvas API 로 이미지를 다시 그려 EXIF 메타데이터를 제거합니다.
 *
 * 동작 원리:
 *  new Image() → URL.createObjectURL → canvas.drawImage → canvas.toBlob('image/jpeg', 0.9)
 *  → 새 File 반환 (확장자 .jpg 로 통일)
 *
 * 주의: 브라우저 환경에서만 동작합니다. Server Component / Node.js 에서 호출 금지.
 *
 * @param file - 원본 이미지 File
 * @returns EXIF 가 제거된 새 File (image/jpeg)
 */
export async function stripImageExif(file: File): Promise<File> {
  const objectUrl = URL.createObjectURL(file);

  try {
    // 이미지 로드
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("이미지 로드에 실패했습니다."));
      el.src = objectUrl;
    });

    // Canvas 에 그리기
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas 2D 컨텍스트를 가져올 수 없습니다.");
    }
    ctx.drawImage(img, 0, 0);

    // Blob 으로 변환 (JPEG, 품질 0.9 — EXIF 없음)
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (b) resolve(b);
          else reject(new Error("이미지 변환에 실패했습니다."));
        },
        "image/jpeg",
        0.9
      );
    });

    // 파일명 확장자를 .jpg 로 교체
    const baseName = file.name.replace(/\.[^/.]+$/, "");
    return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
  } finally {
    // 메모리 해제
    URL.revokeObjectURL(objectUrl);
  }
}

// ─────────────────────────────────────────
// 업로드 헬퍼 내부 타입
// ─────────────────────────────────────────

type SB = SupabaseClient<Database>;
type UploadResult = { url: string } | { error: string };

/** 공통 업로드 로직: 검증 → EXIF strip → Storage 업로드 → 공개 URL 반환 */
async function uploadToStorage(
  supabase: SB,
  path: string,
  file: File,
  upsert: boolean
): Promise<UploadResult> {
  // 1. 파일 검증
  const validation = validateUpload(file);
  if (!validation.ok) {
    return { error: validation.error };
  }

  // 2. EXIF 제거
  let stripped: File;
  try {
    stripped = await stripImageExif(file);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "EXIF 제거 중 오류가 발생했습니다." };
  }

  // 3. Supabase Storage 업로드
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, stripped, {
    upsert,
    contentType: "image/jpeg",
  });

  if (uploadError) {
    return { error: uploadError.message };
  }

  // 4. 공개 URL 반환
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl };
}

// ─────────────────────────────────────────
// 업로드 헬퍼 3종
// ─────────────────────────────────────────

/**
 * 동아리 커버 이미지를 업로드합니다.
 *
 * path: circles/{circleId}/cover.jpg (upsert — 덮어쓰기)
 *
 * @param supabase - Client Component 용 Supabase 클라이언트
 * @param circleId - 동아리 UUID
 * @param file - 업로드할 이미지 파일
 */
export async function uploadCoverImage(
  supabase: SB,
  circleId: string,
  file: File
): Promise<UploadResult> {
  const path = `circles/${circleId}/cover.jpg`;
  return uploadToStorage(supabase, path, file, true);
}

/**
 * 동아리 커버 컬렉션 이미지(복수)를 업로드합니다.
 *
 * path: circles/{circleId}/cover/{uuid}.jpg (upsert=false — 파일마다 새 경로)
 * 기존 uploadCoverImage(cover.jpg upsert)와 병존 — 레거시 호환 유지.
 *
 * @param supabase - Client Component 용 Supabase 클라이언트
 * @param circleId - 동아리 UUID
 * @param file - 업로드할 이미지 파일
 */
export async function uploadCoverCollectionImage(
  supabase: SB,
  circleId: string,
  file: File
): Promise<UploadResult> {
  const path = `circles/${circleId}/cover/${crypto.randomUUID()}.jpg`;
  return uploadToStorage(supabase, path, file, false);
}

/**
 * 동아리 갤러리 이미지를 업로드합니다.
 *
 * path: circles/{circleId}/gallery/{uuid}.jpg (중복 없음)
 *
 * @param supabase - Client Component 용 Supabase 클라이언트
 * @param circleId - 동아리 UUID
 * @param file - 업로드할 이미지 파일
 */
export async function uploadGalleryImage(
  supabase: SB,
  circleId: string,
  file: File
): Promise<UploadResult> {
  const path = `circles/${circleId}/gallery/${crypto.randomUUID()}.jpg`;
  return uploadToStorage(supabase, path, file, false);
}

/**
 * 활동 리포트 이미지를 업로드합니다.
 *
 * path: circles/{circleId}/reports/{reportId}/{uuid}.jpg (중복 없음)
 *
 * @param supabase - Client Component 용 Supabase 클라이언트
 * @param circleId - 동아리 UUID
 * @param reportId - 리포트 UUID
 * @param file - 업로드할 이미지 파일
 */
export async function uploadReportImage(
  supabase: SB,
  circleId: string,
  reportId: string,
  file: File
): Promise<UploadResult> {
  const path = `circles/${circleId}/reports/${reportId}/${crypto.randomUUID()}.jpg`;
  return uploadToStorage(supabase, path, file, false);
}
