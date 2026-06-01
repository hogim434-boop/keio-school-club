/**
 * lib/ics.ts
 *
 * RFC 5545 형식의 ICS (iCalendar) 문자열 생성 헬퍼.
 *
 * 왜 수동 구현인가:
 * - `ics` npm 패키지를 추가하지 않고 ~30줄로 충분히 커버 가능.
 * - 의존성을 최소화해 번들 크기 절감.
 *
 * 주의사항 (T-017 위험 목록):
 * - DB 의 timestamptz 는 이미 UTC — 추가 변환 불필요, new Date() 로 바로 사용.
 * - DTSTAMP / DTSTART / DTEND 는 모두 `YYYYMMDDTHHmmssZ` (Z = UTC 절대 시각).
 * - 종일 이벤트(is_all_day=true) 는 `DTSTART;VALUE=DATE:YYYYMMDD` 형식 사용.
 * - SUMMARY / LOCATION / DESCRIPTION 값에 콤마·세미콜론·개행은 백슬래시 이스케이프 처리.
 * - 빈 값(null/undefined)인 행은 출력에서 제거.
 *
 * 사용 예:
 *   const ics = buildIcsString(event);
 *   const dataUri = `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
 */

import { formatInTimeZone } from "date-fns-tz";
import { addHours } from "date-fns";
import type { EventDetail } from "@/lib/types/domain";

// ─────────────────────────────────────────────────────────────────────────────
// 내부 유틸
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Date → UTC 기준 ICS timestamp 형식 (`YYYYMMDDTHHmmssZ`).
 * formatInTimeZone 은 date-fns-tz 를 사용해 서버/클라이언트 모두 동일한 결과를 보장.
 */
function toIcsUtc(date: Date): string {
  return formatInTimeZone(date, "UTC", "yyyyMMdd'T'HHmmss'Z'");
}

/**
 * Date → 종일 이벤트용 날짜 형식 (`YYYYMMDD`).
 * UTC 기준으로 날짜를 추출 (서버 TZ 의존 제거).
 */
function toIcsDate(date: Date): string {
  return formatInTimeZone(date, "UTC", "yyyyMMdd");
}

/**
 * ICS 텍스트 필드 이스케이프.
 * RFC 5545 §3.3.11: COMMA(,), SEMICOLON(;), BACKSLASH(\\), NEWLINE(\\n) 이스케이프.
 */
function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")   // 백슬래시 먼저
    .replace(/;/g, "\\;")     // 세미콜론
    .replace(/,/g, "\\,")     // 콤마
    .replace(/\r?\n/g, "\\n"); // 개행
}

// ─────────────────────────────────────────────────────────────────────────────
// 공개 API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * EventDetail 객체를 받아 RFC 5545 형식의 ICS 문자열을 반환.
 *
 * @param event  - 이벤트 상세 도메인 객체 (DB의 UTC timestamptz 문자열 포함)
 * @returns      - BEGIN:VCALENDAR ... END:VCALENDAR 형식의 ICS 문자열
 *
 * @example
 *   const ics = buildIcsString(event);
 *   // → "BEGIN:VCALENDAR\r\nVERSION:2.0\r\n..."
 */
export function buildIcsString(event: EventDetail): string {
  // DB의 ISO 문자열(UTC) → Date 객체
  const startsAt = new Date(event.starts_at);
  // ends_at 없으면 시작 + 1시간으로 폴백
  const endsAt = event.ends_at ? new Date(event.ends_at) : addHours(startsAt, 1);

  // 현재 UTC 타임스탬프 (DTSTAMP 용)
  const dtstamp = toIcsUtc(new Date());

  // UID는 이벤트 ID 기반으로 고정 (재생성 시 동일 UID → 기존 이벤트 업데이트)
  const uid = `${event.id}@k-club`;

  // 종일 이벤트 여부에 따라 DTSTART / DTEND 형식 분기
  const dtstart = event.is_all_day
    ? `DTSTART;VALUE=DATE:${toIcsDate(startsAt)}`
    : `DTSTART:${toIcsUtc(startsAt)}`;

  const dtend = event.is_all_day
    ? `DTEND;VALUE=DATE:${toIcsDate(endsAt)}`
    : `DTEND:${toIcsUtc(endsAt)}`;

  // 옵션 필드 — null/빈 문자열이면 undefined 반환 → filter(Boolean) 으로 제거
  const location = event.location
    ? `LOCATION:${escapeIcsText(event.location)}`
    : undefined;

  const description = event.description?.trim()
    ? `DESCRIPTION:${escapeIcsText(event.description.trim())}`
    : undefined;

  // ICS 행 배열 — RFC 5545 는 CRLF(\r\n) 개행 필수
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//K CLUB//Event//JP",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    dtstart,
    dtend,
    `SUMMARY:${escapeIcsText(event.title)}`,
    location,
    description,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean) as string[];

  return lines.join("\r\n");
}

/**
 * Google Calendar 새 이벤트 URL 생성.
 *
 * 쿼리 파라미터:
 * - action=TEMPLATE : 사전 채워진 새 이벤트 모드
 * - text            : 이벤트 제목
 * - dates           : YYYYMMDDTHHmmssZ/YYYYMMDDTHHmmssZ (시작/종료 UTC)
 * - details         : 설명
 * - location        : 장소
 *
 * @returns Google Calendar render URL 문자열
 */
export function buildGoogleCalendarUrl(event: EventDetail): string {
  const startsAt = new Date(event.starts_at);
  const endsAt = event.ends_at ? new Date(event.ends_at) : addHours(startsAt, 1);

  // 종일 이벤트의 경우 날짜만 (YYYYMMDD/YYYYMMDD)
  const dateRange = event.is_all_day
    ? `${toIcsDate(startsAt)}/${toIcsDate(endsAt)}`
    : `${toIcsUtc(startsAt)}/${toIcsUtc(endsAt)}`;

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: dateRange,
  });

  if (event.location) params.set("location", event.location);
  if (event.description?.trim()) params.set("details", event.description.trim());

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
