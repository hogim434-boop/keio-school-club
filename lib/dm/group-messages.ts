/**
 * lib/dm/group-messages.ts
 *
 * DM 메시지 그룹핑 헬퍼.
 *
 * ── 개요 ──────────────────────────────────────────────────────────────────────
 * LINE / iMessage 처럼 "같은 발신자의 연속 메시지를 하나의 그룹"으로 묶고,
 * 날짜가 바뀌는 시점에 날짜 구분선 데이터를 삽입한다.
 *
 * ── 그룹 조건 ─────────────────────────────────────────────────────────────────
 * 다음 조건이 모두 충족될 때 이전 메시지와 같은 그룹으로 묶는다.
 * 1. sender_user_id 가 동일
 * 2. 이전 메시지와의 시간 차가 GROUP_MERGE_THRESHOLD_MS(5분) 이내
 * 3. 날짜(yyyy-MM-dd)가 동일 — 날짜가 바뀌면 항상 새 그룹으로 시작
 *
 * ── 반환 형태 ─────────────────────────────────────────────────────────────────
 * 날짜 구분선(DateDividerItem) + 메시지 그룹(MessageGroup) 의 혼합 배열.
 * DmThread 컴포넌트에서 이 배열을 순서대로 렌더한다.
 *
 * ── 버블 꼬리 규칙 (iMessage/LINE 벤치마킹) ──────────────────────────────────
 * - 그룹 내 첫 번째 버블: 상단 둥글게, 하단 살짝 각지게 (isFirst=true)
 * - 그룹 중간 버블: 양쪽 모두 둥글게 (isFirst=false, isLast=false)
 * - 그룹 마지막 버블: 하단 한쪽에 "꼬리" 느낌의 작은 radius (isLast=true)
 *
 * ── 아바타 / 발신자 라벨 / 시간 표시 위치 ────────────────────────────────────
 * - 아바타: 상대 그룹의 마지막 버블 옆에 1회만 (나머지 버블은 동일 너비 공백)
 * - 발신자 라벨: 상대 그룹의 첫 버블 위에 1회만
 * - 시간: 그룹의 마지막 버블 옆에 1회만 표시
 */

import type { InquiryMessage } from "@/lib/supabase/queries/inquiries";

// 5분 = 300_000ms — 이 시간 이내 연속 메시지는 같은 그룹으로 묶음
const GROUP_MERGE_THRESHOLD_MS = 5 * 60 * 1000;

/**
 * 그룹 내 개별 버블에 붙는 메타 정보.
 * DmThread 가 버블 스타일(꼬리 유무)·아바타·라벨·시간 표시 여부를 결정하는 데 사용.
 */
export interface GroupedMessage {
  message: InquiryMessage;
  /** 그룹 내 첫 번째 버블 여부 */
  isFirst: boolean;
  /** 그룹 내 마지막 버블 여부 */
  isLast: boolean;
  /**
   * 발신자 라벨 (상대 그룹 첫 버블에만 설정, 그 외 null).
   * - 운영진 메시지: 「{circleName}運営」(F058: 개인 이름 비노출)
   * - inquirer 메시지(운영진 뷰): 「問い合わせ者」
   * - 내 메시지 / 표시 불필요: null
   */
  senderLabel: string | null;
  /**
   * 시간 표시 여부 — 그룹의 마지막 버블에서만 true.
   * 중간 버블에 시간이 반복되는 것을 방지한다.
   */
  showTime: boolean;
  /**
   * 아바타 표시 여부 — 상대 그룹의 마지막 버블에서만 true.
   * 나머지 버블에서는 동일 너비(size-8)의 공백을 유지해 들여쓰기를 맞춘다.
   */
  showAvatar: boolean;
}

/**
 * 날짜 구분선 데이터.
 * 날짜가 바뀌는 첫 번째 메시지 앞에 삽입된다.
 */
export interface DateDividerItem {
  kind: "date-divider";
  /** 구분선에 표시할 날짜 문자열 — DateDivider 컴포넌트가 포맷 처리 */
  date: Date;
  /** 구분선 고유 키 */
  key: string;
}

/**
 * 메시지 그룹 데이터.
 * 같은 발신자·5분 이내·같은 날짜 메시지들의 묶음.
 */
export interface MessageGroupItem {
  kind: "message-group";
  /** 그룹 고유 키 (첫 번째 메시지 id 사용) */
  key: string;
  /** 현재 사용자가 발신한 그룹인지 */
  isMine: boolean;
  /** 그룹 내 메시지 목록 (순서: 오래된 것 → 최신) */
  messages: GroupedMessage[];
}

/**
 * groupMessages 의 반환 타입 — 날짜 구분선과 메시지 그룹의 혼합 배열.
 */
export type GroupedItem = DateDividerItem | MessageGroupItem;

/**
 * YYYY-MM-DD 형식의 날짜 키 생성 (날짜 동일 여부 비교용).
 */
function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/**
 * 메시지 배열을 날짜 구분선 + 메시지 그룹 혼합 배열로 변환한다.
 *
 * @param messages     시간순 정렬된 InquiryMessage 배열 (created_at ASC 기준)
 * @param currentUserId 현재 로그인한 사용자의 UUID — isMine 판별에 사용
 * @param circleName    서클명 — 운영진 라벨 「{circleName}運営」 생성에 사용
 * @param viewerIsStaff true = 현재 사용자가 운영진 / false = 문의 발신자
 */
export function groupMessages(
  messages: InquiryMessage[],
  currentUserId: string,
  circleName: string,
  viewerIsStaff: boolean
): GroupedItem[] {
  if (messages.length === 0) return [];

  const result: GroupedItem[] = [];

  // 현재 구축 중인 그룹 (null이면 그룹 없음)
  let currentGroup: MessageGroupItem | null = null;
  let lastDateKey: string | null = null;
  let lastSenderId: string | null = null;
  let lastTimestamp: number | null = null;

  for (const message of messages) {
    const msgDate = new Date(message.created_at);
    const msgDateKey = toDateKey(msgDate);
    const msgTimestamp = msgDate.getTime();
    const isMine = message.sender_user_id === currentUserId;

    // ── 날짜 구분선 삽입 ───────────────────────────────────────────────────
    if (msgDateKey !== lastDateKey) {
      // 날짜가 바뀌면 현재 그룹 확정 후 날짜 구분선 삽입
      if (currentGroup) {
        result.push(currentGroup);
        currentGroup = null;
      }
      result.push({
        kind: "date-divider",
        date: msgDate,
        key: `divider-${msgDateKey}`,
      });
      lastDateKey = msgDateKey;
      // 날짜 구분선 이후에는 반드시 새 그룹 시작
      lastSenderId = null;
      lastTimestamp = null;
    }

    // ── 같은 그룹으로 묶을 수 있는지 판단 ────────────────────────────────
    const isSameSender = message.sender_user_id === lastSenderId;
    const isWithinThreshold =
      lastTimestamp !== null && msgTimestamp - lastTimestamp <= GROUP_MERGE_THRESHOLD_MS;
    const canMerge = isSameSender && isWithinThreshold;

    if (!canMerge || !currentGroup) {
      // 새 그룹 시작 — 이전 그룹이 있으면 먼저 결과에 추가
      if (currentGroup) {
        result.push(currentGroup);
      }

      // 발신자 라벨 결정 (상대 그룹 첫 버블에만)
      const senderLabel = buildSenderLabel(message, isMine, circleName, viewerIsStaff);

      // 새 그룹 생성
      currentGroup = {
        kind: "message-group",
        key: message.id,
        isMine,
        messages: [
          {
            message,
            isFirst: true,
            isLast: true, // 지금은 유일한 버블이므로 first이자 last
            senderLabel,
            showTime: true, // 마지막 버블이므로 시간 표시
            showAvatar: !isMine, // 상대 메시지의 마지막 버블에만 아바타
          },
        ],
      };
    } else {
      // 기존 그룹에 버블 추가
      // 이전 마지막 버블의 isLast / showTime / showAvatar 를 false 로 수정
      const prevMessages = currentGroup.messages;
      const prevLast = prevMessages[prevMessages.length - 1];
      prevMessages[prevMessages.length - 1] = {
        ...prevLast,
        isLast: false,
        showTime: false,
        showAvatar: false,
      };

      // 새 버블 추가 (그룹 내 마지막 버블)
      prevMessages.push({
        message,
        isFirst: false,
        isLast: true,
        senderLabel: null, // 라벨은 첫 버블에만
        showTime: true, // 그룹 마지막 버블에만 시간 표시
        showAvatar: !isMine, // 상대 그룹 마지막 버블에만 아바타
      });
    }

    lastSenderId = message.sender_user_id;
    lastTimestamp = msgTimestamp;
  }

  // 마지막 그룹 처리
  if (currentGroup) {
    result.push(currentGroup);
  }

  return result;
}

/**
 * 상대 그룹의 첫 버블에 표시할 발신자 라벨을 생성한다.
 *
 * - 내 메시지: null (라벨 불필요)
 * - 운영진 메시지: 「{circleName}運営」 (F058: 개인 이름 비노출)
 * - inquirer 메시지 (운영진 뷰): 「問い合わせ者」
 * - inquirer 메시지 (일반 사용자 뷰): null (본인이므로 라벨 불필요)
 */
function buildSenderLabel(
  message: InquiryMessage,
  isMine: boolean,
  circleName: string,
  viewerIsStaff: boolean
): string | null {
  if (isMine) return null;

  if (message.sender_role === "circle_staff") {
    // F058: 운영진 개인 이름·아바타 비노출 — 「{circleName}運営」만 표시
    return `${circleName}運営`;
  }

  // inquirer 메시지를 운영진이 보는 경우
  if (viewerIsStaff) {
    return "問い合わせ者";
  }

  return null;
}
