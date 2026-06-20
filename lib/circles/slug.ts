/**
 * lib/circles/slug.ts
 *
 * 역할:
 *  - 서클 이름으로부터 URL-safe 한 slug 를 생성하는 유틸리티
 *  - circles.slug 컬럼은 UNIQUE 제약이 있으므로, random suffix 로 충돌을 회피
 *
 * 전략:
 *  1. 이름에서 영문자·숫자·공백만 남긴 뒤 공백을 하이픈으로 교체 → 소문자화
 *  2. 변환 후 빈 문자열이 되면 "circle" 로 대체 (일본어 전용 이름 등의 경우)
 *  3. 끝에 "-{randomUUID().slice(0,8)}" 를 붙여 UNIQUE 보장
 *
 * 주의:
 *  - 이 파일은 브라우저·서버 양쪽에서 사용 가능 (crypto.randomUUID 는 양쪽 지원)
 *  - slug 는 사람이 읽기 좋은 형태이지만 의미 보장보다 유일성 보장이 우선
 *
 * @example
 * makeCircleSlug("Tennis Circle")   // "tennis-circle-a1b2c3d4"
 * makeCircleSlug("テニスサークル")   // "circle-e5f6a7b8"
 * makeCircleSlug("K-Pop Dance")      // "k-pop-dance-9c0d1e2f"
 */

/**
 * 서클 이름을 URL-safe slug 로 변환합니다.
 *
 * @param name - 서클 이름 (한국어·일본어 포함 가능)
 * @returns "{slugified-name}-{8자리 UUID}" 형식의 고유 slug
 */
/**
 * 서클 상세 페이지 경로를 만듭니다.
 *
 * slug 가 있으면 사람이 읽기 좋은 URL(/circles/keio-baseball)을,
 * 없으면 UUID(/circles/{id})로 자동 fallback 합니다.
 * 모든 서클 카드/링크는 이 헬퍼를 통해 href 를 생성해 일관성을 유지합니다.
 *
 * @param circle slug(任意) + id(필수) 를 가진 객체
 * @returns "/circles/{slug 또는 id}" 경로
 */
export function circleHref(circle: { slug?: string | null; id: string }): string {
  return `/circles/${circle.slug ?? circle.id}`;
}

export function makeCircleSlug(name: string): string {
  // 1. 영문자·숫자·공백만 남기기 (일본어, 한국어, 특수문자 제거)
  const cleaned = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "") // 영숫자·공백·하이픈 이외 제거
    .trim()
    .replace(/\s+/g, "-") // 연속 공백을 하이픈으로
    .replace(/-+/g, "-") // 연속 하이픈을 단일 하이픈으로
    .replace(/^-|-$/g, ""); // 앞뒤 하이픈 제거

  // 2. 변환 후 빈 문자열이면 기본값 "circle" 사용
  const base = cleaned.length > 0 ? cleaned : "circle";

  // 3. 8자리 random suffix 추가 → UNIQUE 보장
  const suffix = crypto.randomUUID().slice(0, 8);

  return `${base}-${suffix}`;
}
