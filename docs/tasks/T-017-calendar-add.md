# T-017: カレンダーに追加 (Google/Apple) + ICS 헬퍼

| 항목 | 내용 |
|---|---|
| **Phase** | 1-3 |
| **우선순위** | Med |
| **예상 소요** | 1.5일 |
| **의존성** | T-014 |
| **관련 기능 ID** | F035 |
| **PRD 참조** | PRD 5-4 F035 · 9-2 (date-fns-tz) |

## 산출물

- `components/calendar-add-button.tsx` (shadcn Popover)
- `lib/ics.ts` — ICS 파일 수동 생성 (~30줄)

## 검증 기준

- Popover 클릭 → Google/Apple 분기
- Google → Google Calendar 새 일정 URL 새 탭
- Apple → ICS 파일 다운로드, 클릭 시 캘린더 앱 열림
- 일시는 JST → UTC 변환 후 ICS 에 기록

## 세부 작업

- [ ] shadcn `Popover` 추가
- [ ] Google Calendar URL 생성 — `https://calendar.google.com/calendar/r/eventedit?text=...&dates=YYYYMMDDTHHmmssZ/...`
- [ ] ICS 파일 생성 헬퍼 (BEGIN:VCALENDAR ... END:VCALENDAR)
- [ ] JST → UTC 변환 (`date-fns-tz` `zonedTimeToUtc`)
- [ ] Blob → 다운로드

## 위험·주의사항

- ⚠️ **JST 변환 실수** — DB 가 UTC 인데 한 번 더 UTC 변환하면 9시간 오차. **DB 값은 이미 UTC 라는 전제**.
- ⚠️ **ICS DTSTAMP 형식** — `YYYYMMDDTHHMMSSZ` (Z 접미사 = UTC).
- ⚠️ **종일 이벤트** — `is_all_day=true` 면 `DTSTART;VALUE=DATE:YYYYMMDD` 형식.

## 코드 스니펫

```typescript
// lib/ics.ts
import { formatInTimeZone } from "date-fns-tz";

export function generateIcs(event: { title: string; startsAt: Date; endsAt?: Date; location?: string; description?: string }) {
  const fmt = (d: Date) => formatInTimeZone(d, "UTC", "yyyyMMdd'T'HHmmss'Z'");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//K CLUB//Event//JP",
    "BEGIN:VEVENT",
    `UID:${crypto.randomUUID()}@kclub.app`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(event.startsAt)}`,
    event.endsAt ? `DTEND:${fmt(event.endsAt)}` : "",
    `SUMMARY:${event.title}`,
    event.location ? `LOCATION:${event.location}` : "",
    event.description ? `DESCRIPTION:${event.description.replace(/\n/g, "\\n")}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");
}
```

## 테스트 체크리스트

- [ ] Google 분기 → 새 탭에 사전 채워진 일정
- [ ] Apple 분기 → `.ics` 다운로드 → 캘린더 열림
- [ ] 일시가 JST 로 정확히 표시 (시차 오차 없음)
