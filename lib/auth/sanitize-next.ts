/**
 * sanitizeNext — 오픈 리다이렉트 방지 유틸리티
 *
 * next 파라미터를 안전한 상대 경로로만 허용한다.
 * - "/"로 시작해야 함 (절대 URL 차단: https://evil.com)
 * - "//"로 시작하면 안 됨 (protocol-relative URL 차단: //evil.com)
 *
 * 유효하지 않으면 null을 반환한다. (null을 받은 쪽에서 기본값 처리)
 *
 * 사용 예:
 *   const safe = sanitizeNext(searchParams.get("next")); // "/circles" 또는 null
 */
export function sanitizeNext(rawNext: string | null): string | null {
  // 값이 없으면 null 반환
  if (!rawNext) return null;
  // 절대 경로("/"로 시작)가 아니면 차단
  if (!rawNext.startsWith("/")) return null;
  // protocol-relative URL("//")는 외부 도메인으로 이동 가능해 차단
  if (rawNext.startsWith("//")) return null;
  return rawNext;
}
