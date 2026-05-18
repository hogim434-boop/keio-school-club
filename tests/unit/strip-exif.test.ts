/**
 * tests/unit/strip-exif.test.ts
 *
 * validateUpload 단위 테스트
 *
 * 검증 범위:
 *  - 정상 케이스: 1MB JPEG → { ok: true }
 *  - 크기 초과: 5MB JPEG → { ok: false }, error 에 'MB 초과' 포함
 *  - 미허용 MIME: image/gif → { ok: false }, error 에 '허용되지 않은' 포함
 *  - null 입력: → { ok: false }, error 에 '없습니다' 포함
 *
 * 주의: stripImageExif 는 Canvas API 의존으로 jsdom 환경에서 테스트 불가.
 *       브라우저 통합 테스트는 T-018 (Playwright) 시점에 추가 예정.
 */

import { describe, expect, it } from "vitest";

import { validateUpload } from "@/lib/storage/strip-exif";

// ─── 테스트용 File 생성 헬퍼 ───────────────────────────────────────────────

/**
 * 지정한 크기(바이트)와 MIME 타입으로 더미 File 을 생성합니다.
 * 실제 이미지 데이터가 필요 없으므로 빈 ArrayBuffer 로 채웁니다.
 */
function makeFile(sizeBytes: number, type: string, name = "test.jpg"): File {
  const buffer = new ArrayBuffer(sizeBytes);
  return new File([buffer], name, { type });
}

const MB = 1024 * 1024;

// ─── 테스트 스위트 ────────────────────────────────────────────────────────

describe("validateUpload", () => {
  it("정상 케이스: 1MB JPEG 파일은 ok=true 를 반환한다", () => {
    const file = makeFile(1 * MB, "image/jpeg");
    const result = validateUpload(file);
    expect(result.ok).toBe(true);
  });

  it("크기 초과: 5MB JPEG 파일은 ok=false 이고 error 에 'MB 초과' 가 포함된다", () => {
    const file = makeFile(5 * MB, "image/jpeg");
    const result = validateUpload(file);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("MB 초과");
    }
  });

  it("미허용 MIME: image/gif 파일은 ok=false 이고 error 에 '허용되지 않은' 이 포함된다", () => {
    const file = makeFile(1 * MB, "image/gif", "test.gif");
    const result = validateUpload(file);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("허용되지 않은");
    }
  });

  it("null 입력: ok=false 이고 error 에 '없습니다' 가 포함된다", () => {
    const result = validateUpload(null);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("없습니다");
    }
  });
});
