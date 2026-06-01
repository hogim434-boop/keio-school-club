/**
 * lib/format/jst.ts
 *
 * JST(日本標準時 / UTC+9) 기준 날짜·시간 포맷 헬퍼.
 *
 * 왜 이 파일이 필요한가:
 * - DB 의 모든 timestamptz 는 UTC 로 저장된다.
 * - 서버 런타임(Vercel Edge/Node)은 UTC 기준이므로 new Date().toLocaleString('ja-JP') 는
 *   환경에 따라 잘못된 시각을 반환할 수 있다.
 * - date-fns-tz 의 formatInTimeZone() 을 사용하면 IANA timezone("Asia/Tokyo")을 지정해
 *   서버/클라이언트 모두에서 항상 일본 시간으로 올바르게 변환된다.
 *
 * 사용 예:
 *   formatJst("2026-06-07T05:00:00Z")          // "2026/06/07 14:00"
 *   formatJst("2026-06-07T05:00:00Z", "M月d日") // "6月7日"
 *
 * 의존: date-fns-tz (^3 / ^4 모두 지원, peerDependency: date-fns ^3||^4)
 */

import { formatInTimeZone } from "date-fns-tz";

/** JST 타임존 상수 — 코드 전역에서 문자열 오타 방지 */
export const JST = "Asia/Tokyo";

/** 기본 날짜+시간 포맷 (이벤트 상세에서 사용) */
const DEFAULT_FORMAT = "yyyy/MM/dd HH:mm";

/**
 * timestamptz 문자열 또는 Date 를 JST(UTC+9)로 변환해 포매팅.
 *
 * @param date    - UTC 기준 날짜 (DB 의 timestamptz 문자열, ISO 8601, 또는 Date 객체)
 * @param fmt     - date-fns 포맷 패턴 (기본 "yyyy/MM/dd HH:mm")
 * @returns       - JST 기준 포맷된 문자열 (예: "2026/06/07 14:00")
 *
 * @example
 *   formatJst("2026-06-07T05:00:00+00:00")          // "2026/06/07 14:00"
 *   formatJst("2026-06-07T05:00:00Z", "M月d日(E)")  // "6月7日(日)"
 *   formatJst("2026-06-14T06:00:00Z", "HH:mm")      // "15:00"
 */
export function formatJst(date: string | Date, fmt: string = DEFAULT_FORMAT): string {
  // 문자열이면 Date 객체로 변환 (ISO 8601 → UTC Date)
  const d = typeof date === "string" ? new Date(date) : date;
  return formatInTimeZone(d, JST, fmt);
}

/**
 * 이벤트 시작·종료 시각을 "2026/06/07 14:00 〜 17:00" 또는 "2026/06/07 終日" 형식으로 반환.
 *
 * @param startsAt    - 시작 시각 (UTC timestamptz 문자열)
 * @param endsAt      - 종료 시각 (UTC timestamptz 문자열, null 허용)
 * @param isAllDay    - 종일 여부 (true 면 시간 미표시)
 * @returns           - 표시용 문자열
 *
 * @example
 *   formatEventDateRange("2026-06-07T05:00:00Z", "2026-06-07T08:00:00Z", false)
 *   // "2026/06/07 14:00 〜 17:00"
 *
 *   formatEventDateRange("2026-06-07T00:00:00Z", null, true)
 *   // "2026/06/07 終日"
 *
 *   formatEventDateRange("2026-06-07T05:00:00Z", null, false)
 *   // "2026/06/07 14:00"
 */
export function formatEventDateRange(
  startsAt: string,
  endsAt: string | null,
  isAllDay: boolean
): string {
  if (isAllDay) {
    return `${formatJst(startsAt, "yyyy/MM/dd")} 終日`;
  }

  const start = formatJst(startsAt, "yyyy/MM/dd HH:mm");

  if (!endsAt) return start;

  // 같은 날이면 종료 시각만 「HH:mm」, 다른 날이면 전체 포맷
  const startDate = formatJst(startsAt, "yyyy/MM/dd");
  const endDate = formatJst(endsAt, "yyyy/MM/dd");
  const endTime = startDate === endDate ? formatJst(endsAt, "HH:mm") : formatJst(endsAt, "yyyy/MM/dd HH:mm");

  return `${start} 〜 ${endTime}`;
}

/**
 * 이벤트 시작 시각까지 남은 일수(D-day) 계산 (JST 기준 날짜 차이).
 *
 * 반환값:
 * - 양수: 미래 이벤트 (n일 후)
 * - 0: 오늘
 * - 음수: 과거 이벤트 (n일 전)
 *
 * @param startsAt - UTC timestamptz 문자열
 * @param now      - 현재 시각 (기본 new Date(), 테스트 주입용)
 */
export function calcDday(startsAt: string, now: Date = new Date()): number {
  // JST 기준 날짜(시각 제거 → 00:00:00)로 비교
  const startDay = formatJst(startsAt, "yyyy-MM-dd");
  const todayDay = formatInTimeZone(now, JST, "yyyy-MM-dd");

  const startMs = new Date(startDay).getTime();
  const todayMs = new Date(todayDay).getTime();

  return Math.round((startMs - todayMs) / (1000 * 60 * 60 * 24));
}
