/**
 * lib/dm/circle-avatar-color.ts
 *
 * 동아리명 기반 고유 파스텔 아바타 색 헬퍼.
 *
 * ── 목적 ─────────────────────────────────────────────────────────────────────
 * 같은 동아리명이면 항상 같은 색 → 사용자가 아바타 색으로 동아리를 인식 가능.
 * Telegram / WhatsApp / Google Contacts 패턴.
 *
 * ── 구현 ─────────────────────────────────────────────────────────────────────
 * circle_name 문자열의 charCode 합을 팔레트 길이로 나눈 나머지로 색 선택.
 * 팔레트는 Tailwind CSS custom class 형식으로 bg-* + text-* 를 쌍으로 정의.
 *
 * ── F058 준수 ─────────────────────────────────────────────────────────────────
 * 이 색은 서클명 이니셜 아바타(개인 아바타 금지)에 적용한다.
 *
 * @param name - 동아리명 문자열
 * @returns bg, text ペア — Tailwind CSS class (bg-xxx/15 + text-xxx)
 *
 * @example
 * circleAvatarColor("バドミントン部") // → { bg: "bg-blue-500/15", text: "text-blue-700" }
 */

/**
 * 절제된 팔레트 — bg(배경) + text(글자) 5쌍.
 *
 * 앱 전체가 무채색 + keio-navy(딥 네이비) 기반의 차분한 톤이므로,
 * 쨍한 무지개 색(lime·fuchsia·cyan·orange 등)을 배제하고 keio-navy 를 중심으로 한
 * **저채도·딥톤** 5색만 사용한다. 배경은 /10 으로 은은하게, 글자는 딥톤으로 대비 확보.
 * → 동아리별 식별성은 유지하되 전체 톤 통일감을 해치지 않는다(LINE/Linear 류 절제미).
 */
const PALETTE: { bg: string; text: string }[] = [
  { bg: "bg-keio-navy/10", text: "text-keio-navy dark:text-blue-200" },
  { bg: "bg-slate-500/10", text: "text-slate-700 dark:text-slate-300" },
  { bg: "bg-teal-700/10", text: "text-teal-800 dark:text-teal-300" },
  { bg: "bg-indigo-500/10", text: "text-indigo-700 dark:text-indigo-300" },
  { bg: "bg-rose-400/10", text: "text-rose-700 dark:text-rose-300" },
];

/**
 * 동아리명에서 결정론적으로 아바타 색 클래스를 반환한다.
 *
 * @param name - 동아리명 (빈 문자열이면 첫 번째 팔레트 반환)
 */
export function circleAvatarColor(name: string): { bg: string; text: string } {
  if (!name) return PALETTE[0];
  // charCode 합 → 팔레트 인덱스
  const sum = [...name].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return PALETTE[sum % PALETTE.length];
}
