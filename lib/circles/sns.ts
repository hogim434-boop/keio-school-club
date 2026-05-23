/**
 * lib/circles/sns.ts
 *
 * SNS 핸들/ID ↔ URL 양방향 변환 헬퍼 모음.
 *
 * 설계 방침:
 *  - DB 에는 항상 "전체 URL" 저장 (기존 규약 유지)
 *  - 폼 입력·표시 시에는 "핸들(ID)" 로 변환하여 사용자 경험 개선
 *  - 이 파일은 순수 함수만 포함 — 런타임 의존성(next/headers, supabase 등) 없음
 *  - 브라우저·서버·Edge 어디서든 import 가능
 *
 * 변환 규칙 요약:
 *  Instagram : keio_tennis  ↔  https://instagram.com/keio_tennis
 *  X         : keio_tennis  ↔  https://x.com/keio_tennis
 *  LINE      : @keio_tennis ↔  https://line.me/R/ti/p/%40keio_tennis
 */

// ─────────────────────────────────────────────────────────────────────────────
// Instagram
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Instagram 핸들을 공식 URL 로 변환합니다.
 *
 * - 선행 `@` 와 공백을 제거한 뒤 URL 을 조합합니다.
 * - 빈 문자열/undefined 는 그대로 반환합니다.
 *
 * @param handle - Instagram 핸들 (예: "keio_tennis" 또는 "@keio_tennis")
 * @returns 전체 URL (예: "https://instagram.com/keio_tennis") 또는 빈 문자열
 *
 * @example
 * instagramHandleToUrl("keio_tennis")  // "https://instagram.com/keio_tennis"
 * instagramHandleToUrl("@keio_tennis") // "https://instagram.com/keio_tennis"
 * instagramHandleToUrl("")             // ""
 */
export function instagramHandleToUrl(handle: string | undefined): string {
  // 빈 값은 변환하지 않고 빈 문자열 반환
  if (!handle) return "";
  // 선행 @ 와 양쪽 공백 제거
  const cleaned = handle.trim().replace(/^@/, "");
  if (!cleaned) return "";
  return `https://instagram.com/${cleaned}`;
}

/**
 * Instagram URL 에서 핸들을 추출합니다.
 *
 * - `(www.)instagram.com/{handle}` 패턴을 인식합니다.
 * - 쿼리스트링·트레일링 슬래시는 제거합니다.
 * - URL 이 아닌 값(이미 핸들 형태 등)은 그대로 반환합니다(best-effort).
 *
 * @param url - Instagram 전체 URL (예: "https://www.instagram.com/keio_tennis/")
 * @returns 핸들 (예: "keio_tennis") 또는 원본 문자열
 *
 * @example
 * instagramUrlToHandle("https://www.instagram.com/keio_tennis/") // "keio_tennis"
 * instagramUrlToHandle("https://instagram.com/keio_tennis")      // "keio_tennis"
 * instagramUrlToHandle("")                                        // ""
 */
export function instagramUrlToHandle(url: string | undefined): string {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    // hostname 에서 www. 제거 후 instagram.com 인지 확인
    const hostname = parsed.hostname.replace(/^www\./, "");
    if (hostname !== "instagram.com") {
      // 인식 불가 URL — best-effort 로 원본 반환
      return url;
    }
    // pathname: "/keio_tennis" → "keio_tennis" (앞 슬래시 제거, 트레일링 슬래시 제거)
    const handle = parsed.pathname.replace(/^\//, "").replace(/\/$/, "").split("/")[0];
    return handle || url;
  } catch {
    // URL 파싱 실패 → 이미 핸들 형태일 가능성이 높으므로 원본 반환
    return url;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// X (구 Twitter)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * X(구 Twitter) 핸들을 공식 URL 로 변환합니다.
 *
 * - 저장은 항상 x.com 으로 통일합니다(twitter.com 입력도 x.com 으로 저장).
 * - 선행 `@` 와 공백을 제거합니다.
 *
 * @param handle - X 핸들 (예: "keio_tennis" 또는 "@keio_tennis")
 * @returns 전체 URL (예: "https://x.com/keio_tennis") 또는 빈 문자열
 *
 * @example
 * xHandleToUrl("keio_tennis")  // "https://x.com/keio_tennis"
 * xHandleToUrl("@keio_tennis") // "https://x.com/keio_tennis"
 * xHandleToUrl("")             // ""
 */
export function xHandleToUrl(handle: string | undefined): string {
  if (!handle) return "";
  const cleaned = handle.trim().replace(/^@/, "");
  if (!cleaned) return "";
  return `https://x.com/${cleaned}`;
}

/**
 * X(구 Twitter) URL 에서 핸들을 추출합니다.
 *
 * - `x.com` 과 `twitter.com` 양쪽 모두 인식합니다.
 *
 * @param url - X 또는 Twitter 전체 URL (예: "https://x.com/keio_tennis")
 * @returns 핸들 (예: "keio_tennis") 또는 원본 문자열
 *
 * @example
 * xUrlToHandle("https://x.com/keio_tennis")       // "keio_tennis"
 * xUrlToHandle("https://twitter.com/keio_tennis") // "keio_tennis"
 * xUrlToHandle("")                                 // ""
 */
export function xUrlToHandle(url: string | undefined): string {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace(/^www\./, "");
    if (hostname !== "x.com" && hostname !== "twitter.com") {
      return url;
    }
    const handle = parsed.pathname.replace(/^\//, "").replace(/\/$/, "").split("/")[0];
    return handle || url;
  } catch {
    return url;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LINE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * LINE 공식계정 ID を URL 로 변환합니다.
 *
 * 규칙:
 *  - 입력 ID 에 `@` 가 없으면 자동으로 붙입니다 (예: "keio" → "@keio").
 *  - `@` 가 포함된 ID 를 encodeURIComponent 로 인코딩합니다 ("@keio" → "%40keio").
 *  - LINE Developers 공식 딥링크 형식 `https://line.me/R/ti/p/{encodedId}` 를 사용합니다.
 *
 * @param id - LINE 공식계정 Basic ID (예: "@keio_tennis" 또는 "keio_tennis")
 * @returns 딥링크 URL (예: "https://line.me/R/ti/p/%40keio_tennis") 또는 빈 문자열
 *
 * @example
 * lineIdToUrl("@keio_tennis") // "https://line.me/R/ti/p/%40keio_tennis"
 * lineIdToUrl("keio_tennis")  // "https://line.me/R/ti/p/%40keio_tennis"
 * lineIdToUrl("")             // ""
 */
export function lineIdToUrl(id: string | undefined): string {
  if (!id) return "";
  const trimmed = id.trim();
  if (!trimmed) return "";
  // @ 가 없으면 붙여 정규화
  const normalized = trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
  // encodeURIComponent: "@" → "%40"
  return `https://line.me/R/ti/p/${encodeURIComponent(normalized)}`;
}

/**
 * LINE URL 에서 공식계정 ID 를 추출합니다.
 *
 * 규칙:
 *  - `line.me/R/ti/p/{encodedId}` 패턴이면 마지막 세그먼트를 decodeURIComponent 하여 반환.
 *  - `lin.ee/...` 등 다른 패턴(초대링크)은 **원본 문자열 그대로 반환** (데이터 손실 방지, best-effort).
 *
 * @param url - LINE URL (예: "https://line.me/R/ti/p/%40keio_tennis")
 * @returns LINE ID (예: "@keio_tennis") 또는 원본 문자열
 *
 * @example
 * lineUrlToId("https://line.me/R/ti/p/%40keio_tennis") // "@keio_tennis"
 * lineUrlToId("https://lin.ee/abc123")                 // "https://lin.ee/abc123" (원본 유지)
 * lineUrlToId("")                                      // ""
 */
export function lineUrlToId(url: string | undefined): string {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace(/^www\./, "");
    if (hostname !== "line.me") {
      // lin.ee 등 다른 도메인 — best-effort 원본 반환
      return url;
    }
    // pathname: "/R/ti/p/%40keio_tennis" 패턴 확인
    const segments = parsed.pathname.split("/").filter(Boolean);
    // 기대 구조: ["R", "ti", "p", "%40keio_tennis"]
    if (
      segments.length >= 4 &&
      segments[0] === "R" &&
      segments[1] === "ti" &&
      segments[2] === "p"
    ) {
      return decodeURIComponent(segments[3]);
    }
    // 패턴 불일치 — best-effort 원본 반환
    return url;
  } catch {
    return url;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 디스패처 (플랫폼 지정 통합 API)
// ─────────────────────────────────────────────────────────────────────────────

/** snsToUrl / snsFromUrl 이 인식하는 플랫폼 리터럴 타입 */
export type SnsPlatform = "instagram" | "x" | "line";

/**
 * 플랫폼 지정 통합 변환 — 핸들/ID → URL.
 *
 * @param platform - "instagram" | "x" | "line"
 * @param value    - 핸들 또는 ID 문자열
 * @returns 전체 URL 문자열 또는 빈 문자열
 *
 * @example
 * snsToUrl("instagram", "keio_tennis")  // "https://instagram.com/keio_tennis"
 * snsToUrl("line", "@keio")             // "https://line.me/R/ti/p/%40keio"
 */
export function snsToUrl(platform: SnsPlatform, value: string | undefined): string {
  switch (platform) {
    case "instagram":
      return instagramHandleToUrl(value);
    case "x":
      return xHandleToUrl(value);
    case "line":
      return lineIdToUrl(value);
  }
}

/**
 * 플랫폼 지정 통합 변환 — URL → 핸들/ID.
 *
 * @param platform - "instagram" | "x" | "line"
 * @param value    - 저장된 전체 URL 또는 기존 핸들
 * @returns 핸들/ID 문자열 또는 빈 문자열 (역변환 불가 시 원본 반환)
 *
 * @example
 * snsFromUrl("instagram", "https://instagram.com/keio_tennis")  // "keio_tennis"
 * snsFromUrl("line", "https://line.me/R/ti/p/%40keio")          // "@keio"
 * snsFromUrl("line", "https://lin.ee/abc123")                   // "https://lin.ee/abc123"
 */
export function snsFromUrl(platform: SnsPlatform, value: string | undefined): string {
  switch (platform) {
    case "instagram":
      return instagramUrlToHandle(value);
    case "x":
      return xUrlToHandle(value);
    case "line":
      return lineUrlToId(value);
  }
}
