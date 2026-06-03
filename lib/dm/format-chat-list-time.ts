/**
 * lib/dm/format-chat-list-time.ts
 *
 * LINE型メッセージリスト用タイムスタンプフォーマットヘルパー.
 *
 * ── 表示ルール ───────────────────────────────────────────────────────────────
 * | 条件                       | 表示例          |
 * |---------------------------|----------------|
 * | 今日(当日0時以降)            | 午後 3:45       |
 * | 昨日(前日0時〜当日0時前)       | 昨日            |
 * | 同一週(月曜0時〜昨日0時前)     | 月 / 火 / ... 日 |
 * | それ以前                    | 6月3日          |
 *
 * ── 設計 ─────────────────────────────────────────────────────────────────────
 * - date-fns(ja locale) を使用.
 * - 「相対時間(3分前)」は廃止 — LINE/iMessage パターン準拠.
 * - サーバー・クライアント両方で使用可能な純粋関数.
 * - referenceDate 引数でテスト可能(デフォルト: new Date()).
 *
 * ── 注意 ─────────────────────────────────────────────────────────────────────
 * - format() は import from "date-fns" で取得. "date-fns/locale" は ja のみ.
 * - 同一週判定: isSameWeek は locale の weekStartsOn=1(月) を使用.
 */

import { format, isToday, isYesterday, isSameWeek, parseISO } from "date-fns";
import { ja } from "date-fns/locale";

/**
 * 曜日インデックス → 日本語短縮表記マッピング (0=日〜6=土).
 * date-fns の format("E") が en-US ロケール前提の略語を返すため、手動マッピング使用.
 */
const WEEKDAY_JA = ["日", "月", "火", "水", "木", "金", "土"] as const;

/**
 * ISO 8601 タイムスタンプをメッセージリスト用の日本語文字列にフォーマットする.
 *
 * @param isoString - ISO 8601 形式の日時文字列 (例: "2026-06-03T15:45:00Z")
 * @param referenceDate - 基準日 (テスト用, デフォルト: 現在時刻)
 * @returns フォーマット済み文字列 (例: "午後 3:45" / "昨日" / "月" / "6月3日")
 *
 * @example
 * formatChatListTime("2026-06-03T06:45:00Z") // → "午後 3:45"
 * formatChatListTime("2026-06-02T10:00:00Z") // → "昨日"
 * formatChatListTime("2026-06-01T10:00:00Z") // → "月"
 * formatChatListTime("2026-05-20T10:00:00Z") // → "5月20日"
 */
export function formatChatListTime(isoString: string, referenceDate: Date = new Date()): string {
  // ISO 문자열 → Date 객체
  // null/빈 문자열 방어: 파싱 실패 시 빈 문자열 반환
  let date: Date;
  try {
    date = parseISO(isoString);
    if (isNaN(date.getTime())) return "";
  } catch {
    return "";
  }

  // ── 오늘: "午後 3:45" 형식 ────────────────────────────────────────────────
  // date-fns format "aaa h:mm" → "午前 9:05" / "午後 3:45"
  // locale ja 를 사용해 AM/PM → 午前/午後 변환
  if (isToday(date, { in: undefined })) {
    return format(date, "aaa h:mm", { locale: ja });
  }

  // ── 어제: "昨日" ──────────────────────────────────────────────────────────
  if (isYesterday(date)) {
    return "昨日";
  }

  // ── 같은 주(월~어제): 요일 한자 한 글자 "月"~"日" ──────────────────────────
  // weekStartsOn: 1 (월요일 기준) — ISO week 표준
  if (isSameWeek(date, referenceDate, { weekStartsOn: 1 })) {
    const dayIndex = date.getDay(); // 0=일, 1=월, ..., 6=토
    return WEEKDAY_JA[dayIndex];
  }

  // ── 그 이전: "6月3日" 형식 ─────────────────────────────────────────────────
  // locale ja + format "M月d日"
  return format(date, "M月d日", { locale: ja });
}
