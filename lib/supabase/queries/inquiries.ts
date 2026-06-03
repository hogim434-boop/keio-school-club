/**
 * lib/supabase/queries/inquiries.ts
 *
 * 운영진 DM 문의(inquiry) 관련 서버 전용 쿼리 함수.
 *
 * ── 캐시 정책 ─────────────────────────────────────────────────────────────
 * DM 은 개인 데이터(발신자 + 수신 운영진만 볼 수 있음) → unstable_cache 절대 금지.
 * 매 요청마다 인증된 server 클라이언트를 새로 생성해 RLS 로 접근을 제한한다.
 *
 * ── RLS 요약 ─────────────────────────────────────────────────────────────
 * inquiries SELECT  : sender_user_id = auth.uid() OR is_circle_staff(circle_id) OR is_admin()
 * inquiry_messages SELECT : 위 조건을 만족하는 inquiry 에 속한 메시지
 * → 미참여자가 조회하면 RLS 에 의해 자동으로 null / 빈 배열 반환
 *
 * ── 후속 Task 확장 예정 ──────────────────────────────────────────────────
 * 이 파일에 함수를 추가(append)할 Task:
 *   T-029 : getCircleInbox(circleId)  — 서클 인박스 목록
 *   T-030 : getMyInquiries(userId)    — 내가 발신한 문의 목록
 *   T-034 : getAvgResponseTime(circleId) — 평균 응답 시간 집계
 *
 * ── 파일 구조 ───────────────────────────────────────────────────────────
 * [섹션 1] 공통 타입 export        ← 이 파일에서 정의
 * [섹션 2] getInquiryWithMessages  ← T-028 (현재 구현)
 * [섹션 3] getCircleInbox          ← T-029 에서 추가 예정
 * [섹션 4] getMyInquiries          ← T-030 에서 추가 예정
 * [섹션 5] getAvgResponseTime      ← T-034 에서 추가 예정
 */

import { createClient } from "@/lib/supabase/server";
import type { InquiryCategoryValue } from "@/lib/dm/constants";

// ══════════════════════════════════════════════════════════════════════════════
//  [섹션 1] 공통 타입 — Client Component(dm-thread.tsx 등)에서 재사용
// ══════════════════════════════════════════════════════════════════════════════

/**
 * inquiry_messages 테이블의 단일 메시지 행 타입.
 *
 * sender_role:
 *   "inquirer"     — 문의 발신자(학생 측)
 *   "circle_staff" — 동아리·부활동 운영진 측
 */
export type InquiryMessage = {
  id: string;
  inquiry_id: string;
  sender_user_id: string;
  /** 발송자 역할 — "inquirer" | "circle_staff" */
  sender_role: "inquirer" | "circle_staff";
  /** 메시지 본문 */
  body: string;
  /** 첨부 파일 URL 배열 (현재 미사용, nullable) */
  attachments: string[] | null;
  /** 수신자 기존 읽음 여부 — A-5: 화면에 既読 텍스트로 표시 금지 */
  is_read_by_recipient: boolean;
  created_at: string;
};

/**
 * inquiries 테이블의 문의 헤더 행 타입.
 * circles JOIN 결과(name)도 포함한다.
 */
export type InquiryWithMessages = {
  id: string;
  circle_id: string;
  /** 발신자 user ID */
  sender_user_id: string;
  /** 문의 카테고리 — lib/dm/constants.ts 의 InquiryCategoryValue */
  category: InquiryCategoryValue | null;
  /** 문의 제목 (현재 빈 문자열 기본값) */
  subject: string;
  /** 문의 상태 — "open" | "closed" */
  status: string;
  /** 마지막 메시지 시각 (ISO) */
  last_message_at: string | null;
  created_at: string;
  /** 조인된 서클명 — UI 라벨("○○運営")에 사용 */
  circle_name: string;
  /** 메시지 목록 (created_at ASC) */
  messages: InquiryMessage[];
};

// ══════════════════════════════════════════════════════════════════════════════
//  [섹션 2] getInquiryWithMessages — T-028
// ══════════════════════════════════════════════════════════════════════════════

/**
 * inquiry 1건 + 소속 메시지 N건(created_at ASC)을 조회한다.
 *
 * ── 접근 제어 ─────────────────────────────────────────────────────────────
 * - RLS(inquiries_select): sender_user_id = auth.uid() OR is_circle_staff(circle_id) OR is_admin()
 * - 미참여자(발신자도 운영진도 아님) → RLS 가 행을 숨김 → null 반환
 * - 위 케이스를 페이지에서 notFound() 로 처리 (미참여자에게 존재 여부도 비공개)
 *
 * ── 캐시 ─────────────────────────────────────────────────────────────────
 * unstable_cache 금지 — 개인 DM 데이터. 매 요청 최신값 반환.
 *
 * @param inquiryId - inquiries.id UUID
 * @returns InquiryWithMessages | null (미존재 / 미참여자 / 오류 시 null)
 */
export async function getInquiryWithMessages(
  inquiryId: string
): Promise<InquiryWithMessages | null> {
  // Fluid compute 대응: 함수 내에서 매번 새로 생성
  const supabase = await createClient();

  // ── inquiry + circle 이름 조회 ─────────────────────────────────────────
  // circles 를 JOIN 해서 서클명을 한 번에 가져온다.
  // RLS 로 인해 미참여자의 경우 data 가 null 로 반환됨 (에러가 아닌 null)
  const { data: inquiryRow, error: inquiryError } = await supabase
    .from("inquiries")
    .select(
      `
      id,
      circle_id,
      sender_user_id,
      category,
      subject,
      status,
      last_message_at,
      created_at,
      circles (
        name
      )
    `
    )
    .eq("id", inquiryId)
    .maybeSingle();

  if (inquiryError) {
    console.error("[getInquiryWithMessages] inquiry fetch error:", inquiryError.message);
    return null;
  }

  if (!inquiryRow) {
    // RLS 로 차단된 경우 또는 존재하지 않는 ID — null 반환
    return null;
  }

  // ── inquiry_messages 조회 (created_at ASC) ────────────────────────────
  // RLS(inquiry_messages_select): 상위 inquiry 에 접근 가능한 사용자만 조회 가능
  const { data: messagesRows, error: messagesError } = await supabase
    .from("inquiry_messages")
    .select(
      `
      id,
      inquiry_id,
      sender_user_id,
      sender_role,
      body,
      attachments,
      is_read_by_recipient,
      created_at
    `
    )
    .eq("inquiry_id", inquiryId)
    .order("created_at", { ascending: true });

  if (messagesError) {
    console.error("[getInquiryWithMessages] messages fetch error:", messagesError.message);
    return null;
  }

  // ── circles JOIN 결과 → 서클명 추출 ───────────────────────────────────
  // Supabase 는 FK JOIN 결과를 단일 객체 또는 배열로 반환할 수 있음
  const circlesJoinRaw = inquiryRow.circles as { name: string } | { name: string }[] | null;
  const circleName = Array.isArray(circlesJoinRaw)
    ? (circlesJoinRaw[0]?.name ?? "")
    : (circlesJoinRaw?.name ?? "");

  // ── 메시지 배열 타입 변환 ──────────────────────────────────────────────
  const messages: InquiryMessage[] = (messagesRows ?? []).map((row) => ({
    id: row.id as string,
    inquiry_id: row.inquiry_id as string,
    sender_user_id: row.sender_user_id as string,
    // DB 에 저장된 값이 "inquirer" | "circle_staff" 이므로 캐스팅
    sender_role: (row.sender_role as "inquirer" | "circle_staff") ?? "inquirer",
    body: row.body as string,
    attachments: (row.attachments as string[] | null) ?? null,
    is_read_by_recipient: (row.is_read_by_recipient as boolean) ?? false,
    created_at: row.created_at as string,
  }));

  return {
    id: inquiryRow.id as string,
    circle_id: inquiryRow.circle_id as string,
    sender_user_id: inquiryRow.sender_user_id as string,
    category: (inquiryRow.category as InquiryCategoryValue | null) ?? null,
    subject: (inquiryRow.subject as string) ?? "",
    status: (inquiryRow.status as string) ?? "open",
    last_message_at: (inquiryRow.last_message_at as string | null) ?? null,
    created_at: inquiryRow.created_at as string,
    circle_name: circleName,
    messages,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
//  [섹션 3] getCircleInbox — T-029
// ══════════════════════════════════════════════════════════════════════════════

/**
 * 운영진 인박스용 스레드 단일 아이템 타입.
 *
 * ── 개인 데이터 정책 ─────────────────────────────────────────────────────────
 * - sender_user_id: T-032(차단) 메뉴에서 필요하므로 포함. UI 에는 직접 노출 금지.
 * - sender_display_name: 인박스에서 발신자 식별용으로 필요하나 최소 노출.
 *   (개인 이름 노출 금지 정책 F058 → 스레드 상세에서는 「問い合わせ者」표시)
 *
 * ── 미읽음 카운트 ─────────────────────────────────────────────────────────────
 * unread_count: sender_role='inquirer' + is_read_by_recipient=false 인 메시지 수.
 * A-5: 화면에 「既読」텍스트 금지. 미읽음 배지(숫자)만 허용.
 *
 * ── T-032 연동 안내 ───────────────────────────────────────────────────────────
 * T-032(차단)가 inbox-list 스레드 카드에 「このユーザーをブロック」메뉴를 추가할 예정.
 * sender_user_id 를 이 타입에 포함시켜 두었으므로 inbox-list 에서 props 로 전달 가능.
 */
export type CircleInboxItem = {
  /** inquiry PK */
  id: string;
  circle_id: string;
  /** 문의 발신자 user ID — T-032 차단 메뉴에서 사용. UI 직접 노출 금지. */
  sender_user_id: string;
  /** 발신자 표시명 — null 일 때 「ユーザー」로 fallback 표시 */
  sender_display_name: string | null;
  /** 문의 카테고리 */
  category: InquiryCategoryValue | null;
  /** 문의 제목 */
  subject: string;
  /** 스레드 상태: "open" | "resolved" | "blocked" */
  status: string;
  /** 마지막 메시지 시각 (ISO) — 인박스 정렬 기준 */
  last_message_at: string | null;
  /** 마지막 메시지 본문 미리보기 (최대 60자) */
  last_message_preview: string | null;
  /** inquirer 발신 미읽음 메시지 수 (A-5: 숫자 배지용) */
  unread_count: number;
  created_at: string;
};

/**
 * 동아리·부활동 운영진 인박스 목록을 조회한다.
 *
 * ── 정렬 ─────────────────────────────────────────────────────────────────────
 * 1순위: status='open' 스레드 우선 (open=1, 그 외=0 내림차순)
 * 2순위: last_message_at DESC NULLS LAST (최신 활동 스레드 상단)
 *
 * ── 접근 제어 (Defense in Depth) ─────────────────────────────────────────────
 * - RLS(inquiries_select): is_circle_staff(circle_id) 조건이 포함되어 있어
 *   운영진이 아닌 사용자는 circle_id 에 해당하는 행을 전혀 볼 수 없음.
 * - 페이지(inbox/page.tsx)에서도 is_circle_staff RPC 로 2차 가드.
 *
 * ── 캐시 ─────────────────────────────────────────────────────────────────────
 * unstable_cache 금지 — 개인 DM 데이터 (쿠키 세션 사용자 한정).
 *
 * ── 미읽음 카운트 계산 ────────────────────────────────────────────────────────
 * inquiry_messages 를 서브쿼리 없이 allMessages 로 한 번에 가져와서
 * 클라이언트(서버 함수)에서 filter 한다.
 * 이유: Supabase PostgREST 의 embedded filter 로 count 집계가 제한적이므로
 *       별도 조회(N+1)를 피하기 위해 한 번에 SELECT.
 *
 * @param circleId - circles.id UUID
 * @returns CircleInboxItem[] — 빈 배열(조회 없거나 에러) 또는 정렬된 목록
 */
export async function getCircleInbox(circleId: string): Promise<CircleInboxItem[]> {
  // Fluid compute 대응: 함수 내에서 매번 새로 생성
  const supabase = await createClient();

  // ── inquiries + 발신자 profiles JOIN ────────────────────────────────────
  // profiles.display_name: 인박스에서 발신자 식별(최소 노출).
  // sender_role='inquirer' 메시지의 미읽음 카운트를 embedded 로 가져온다.
  const { data: rows, error } = await supabase
    .from("inquiries")
    .select(
      `
      id,
      circle_id,
      sender_user_id,
      category,
      subject,
      status,
      last_message_at,
      created_at,
      profiles!inquiries_sender_user_id_fkey (
        display_name
      ),
      inquiry_messages (
        id,
        sender_role,
        body,
        is_read_by_recipient,
        created_at
      )
    `
    )
    .eq("circle_id", circleId)
    // open 스레드 우선 정렬: PostgreSQL 에서 boolean 비교 내림차순
    .order("status", { ascending: true }) // 'blocked' < 'open' < 'resolved' 알파벳 오름차순 → 뒤에서 재정렬
    .order("last_message_at", { ascending: false, nullsFirst: false });

  if (error) {
    console.error("[getCircleInbox] fetch error:", error.message);
    return [];
  }

  if (!rows || rows.length === 0) {
    return [];
  }

  // ── 결과 매핑 + 정렬 재조정 ─────────────────────────────────────────────
  // PostgREST 의 ORDER BY 로 "open 우선" 정렬이 어렵기 때문에
  // 클라이언트(서버 함수)에서 최종 정렬을 적용한다.
  const items: CircleInboxItem[] = rows.map((row) => {
    // profiles JOIN 결과 추출 (단일 객체 또는 배열 모두 대응)
    const profilesRaw = row.profiles as
      | { display_name: string | null }
      | { display_name: string | null }[]
      | null;
    const displayName = Array.isArray(profilesRaw)
      ? (profilesRaw[0]?.display_name ?? null)
      : (profilesRaw?.display_name ?? null);

    // inquiry_messages 배열 추출
    type MsgRow = {
      id: string;
      sender_role: string | null;
      body: string;
      is_read_by_recipient: boolean;
      created_at: string;
    };
    const messages: MsgRow[] = Array.isArray(row.inquiry_messages)
      ? (row.inquiry_messages as MsgRow[])
      : [];

    // 미읽음 카운트: inquirer 발신 + is_read_by_recipient=false
    const unreadCount = messages.filter(
      (m) => m.sender_role === "inquirer" && !m.is_read_by_recipient
    ).length;

    // 마지막 메시지 미리보기: created_at 기준 가장 최근 메시지 본문 60자 제한
    const sortedMessages = [...messages].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const lastMsgBody = sortedMessages[0]?.body ?? null;
    const lastMessagePreview = lastMsgBody
      ? lastMsgBody.slice(0, 60) + (lastMsgBody.length > 60 ? "…" : "")
      : null;

    return {
      id: row.id as string,
      circle_id: row.circle_id as string,
      sender_user_id: row.sender_user_id as string,
      sender_display_name: displayName,
      category: (row.category as InquiryCategoryValue | null) ?? null,
      subject: (row.subject as string) ?? "",
      status: (row.status as string) ?? "open",
      last_message_at: (row.last_message_at as string | null) ?? null,
      last_message_preview: lastMessagePreview,
      unread_count: unreadCount,
      created_at: row.created_at as string,
    };
  });

  // open 스레드 우선 → last_message_at DESC NULLS LAST
  items.sort((a, b) => {
    // open=1, 그 외=0 → 내림차순
    const aOpen = a.status === "open" ? 1 : 0;
    const bOpen = b.status === "open" ? 1 : 0;
    if (bOpen !== aOpen) return bOpen - aOpen;

    // 같은 우선순위면 last_message_at 최신 우선
    if (!a.last_message_at && !b.last_message_at) return 0;
    if (!a.last_message_at) return 1;
    if (!b.last_message_at) return -1;
    return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
  });

  return items;
}

// ══════════════════════════════════════════════════════════════════════════════
//  [섹션 4] getMyInquiries — T-030
// ══════════════════════════════════════════════════════════════════════════════

/**
 * 발신자(inquirer) 입장의 DM 스레드 단일 아이템 타입.
 *
 * ── CircleInboxItem 과의 차이점 ───────────────────────────────────────────────
 * CircleInboxItem : 운영진(circle_staff) 인박스용. 발신자 정보 중심.
 * MyInquiryItem   : 학생(inquirer) 발신 목록용. 대화 상대인 동아리명 중심.
 *
 * ── 미읽음 카운트 방향 ─────────────────────────────────────────────────────────
 * unread_count: 운영진(circle_staff)이 보낸 메시지 중 본인이 안 읽은 것.
 *   = inquiry_messages WHERE sender_role='circle_staff' AND is_read_by_recipient=false 카운트.
 * (getCircleInbox 는 inquirer 미읽음을 셌으므로, 이 함수는 반대 방향)
 *
 * ── A-5 엄수 ──────────────────────────────────────────────────────────────────
 * is_read_by_recipient 는 집계에만 사용. 「既読」텍스트로 화면에 표시 금지.
 * unread_count 가 0 이면 배지 미표시.
 */
export type MyInquiryItem = {
  /** inquiry PK */
  id: string;
  /** 문의 대상 동아리 UUID */
  circle_id: string;
  /** 동아리 표시명 — 카드 메인 라벨로 사용 */
  circle_name: string;
  /** 문의 카테고리 */
  category: InquiryCategoryValue | null;
  /** 문의 제목 */
  subject: string;
  /** 스레드 상태: "open" | "resolved" | "blocked" */
  status: string;
  /** 마지막 메시지 시각 (ISO) — 정렬 기준 */
  last_message_at: string | null;
  /** 마지막 메시지 본문 미리보기 (최대 60자) */
  last_message_preview: string | null;
  /**
   * 운영진(circle_staff)이 보낸 미읽음 메시지 수.
   * A-5: 숫자 배지 표시용. 0 이면 배지 미표시.
   */
  unread_count: number;
  created_at: string;
};

/**
 * 현재 로그인한 사용자가 발신한 DM 스레드 목록을 조회한다.
 *
 * ── 정렬 ─────────────────────────────────────────────────────────────────────
 * last_message_at DESC NULLS LAST (최신 활동 스레드 상단).
 *
 * ── 접근 제어 ─────────────────────────────────────────────────────────────────
 * - RLS(inquiries_select): sender_user_id = auth.uid() 조건으로 본인 스레드만 열람 가능.
 * - 페이지(inbox/page.tsx)에서 getClaims() 로 인증 여부를 한 번 더 확인.
 *
 * ── 캐시 ─────────────────────────────────────────────────────────────────────
 * unstable_cache 금지 — 개인 DM 데이터. 쿠키 기반 세션 클라이언트 사용.
 *
 * ── 미읽음 카운트 계산 ────────────────────────────────────────────────────────
 * inquiry_messages 를 embedded 로 한 번에 가져온 뒤 서버 함수에서 filter.
 * (getCircleInbox 와 동일한 방식 — N+1 방지)
 * 단, 집계 방향이 반대:
 *   getCircleInbox  : sender_role='inquirer' + is_read_by_recipient=false
 *   getMyInquiries  : sender_role='circle_staff' + is_read_by_recipient=false
 *
 * @returns MyInquiryItem[] — 빈 배열(조회 없거나 에러) 또는 정렬된 목록
 */
export async function getMyInquiries(): Promise<MyInquiryItem[]> {
  // Fluid compute 대응: 함수 내에서 매번 새로 생성
  const supabase = await createClient();

  // ── inquiries + circles JOIN + 메시지 embedded ────────────────────────────
  // RLS 에 의해 auth.uid() 와 일치하는 sender_user_id 의 행만 반환됨
  // sender_hidden_at IS NULL: 본인이 숨긴(soft delete) 스레드는 제외
  const { data: rows, error } = await supabase
    .from("inquiries")
    .select(
      `
      id,
      circle_id,
      category,
      subject,
      status,
      last_message_at,
      created_at,
      circles (
        name
      ),
      inquiry_messages (
        id,
        sender_role,
        body,
        is_read_by_recipient,
        created_at
      )
    `
    )
    // 발신자가 숨긴 스레드 제외 (soft delete 필터)
    .is("sender_hidden_at", null)
    .order("last_message_at", { ascending: false, nullsFirst: false });

  if (error) {
    console.error("[getMyInquiries] fetch error:", error.message);
    return [];
  }

  if (!rows || rows.length === 0) {
    return [];
  }

  // ── 결과 매핑 ────────────────────────────────────────────────────────────
  const items: MyInquiryItem[] = rows.map((row) => {
    // circles JOIN 결과 추출 (단일 객체 또는 배열 모두 대응)
    const circlesRaw = row.circles as { name: string } | { name: string }[] | null;
    const circleName = Array.isArray(circlesRaw)
      ? (circlesRaw[0]?.name ?? "")
      : (circlesRaw?.name ?? "");

    // inquiry_messages 배열 추출
    type MsgRow = {
      id: string;
      sender_role: string | null;
      body: string;
      is_read_by_recipient: boolean;
      created_at: string;
    };
    const messages: MsgRow[] = Array.isArray(row.inquiry_messages)
      ? (row.inquiry_messages as MsgRow[])
      : [];

    // 미읽음 카운트: circle_staff 발신 + is_read_by_recipient=false
    // (검토자 입장 — 운영진이 보낸 답장 중 본인이 아직 읽지 않은 것)
    const unreadCount = messages.filter(
      (m) => m.sender_role === "circle_staff" && !m.is_read_by_recipient
    ).length;

    // 마지막 메시지 미리보기: created_at 기준 가장 최근 메시지 본문 60자 제한
    const sortedMessages = [...messages].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const lastMsgBody = sortedMessages[0]?.body ?? null;
    const lastMessagePreview = lastMsgBody
      ? lastMsgBody.slice(0, 60) + (lastMsgBody.length > 60 ? "…" : "")
      : null;

    return {
      id: row.id as string,
      circle_id: row.circle_id as string,
      circle_name: circleName,
      category: (row.category as InquiryCategoryValue | null) ?? null,
      subject: (row.subject as string) ?? "",
      status: (row.status as string) ?? "open",
      last_message_at: (row.last_message_at as string | null) ?? null,
      last_message_preview: lastMessagePreview,
      unread_count: unreadCount,
      created_at: row.created_at as string,
    };
  });

  return items;
}

// ══════════════════════════════════════════════════════════════════════════════
//  [섹션 5] getAvgResponseTime — T-034
// ══════════════════════════════════════════════════════════════════════════════

import { unstable_cache } from "next/cache";

import { createAnonClient } from "@/lib/supabase/anon";

/**
 * 평균 응답 시간 표시용 타입.
 *
 * - days: 평균 응답 일 수(올림, 최솟값 1). UI 에서 「平均的に○日以内に返信」으로 표시.
 * - null: 집계 데이터 없음 → UI 에서 「データ収集中」표시.
 */
export type AvgResponseTime = { days: number } | null;

/**
 * 동아리별 평균 응답 시간(일 수)을 조회한다 — T-034.
 *
 * ── 계산 방식 ─────────────────────────────────────────────────────────────────
 * DB 함수 public.avg_response_time(_circle_id uuid) 를 RPC 로 호출.
 * "첫 번째 inquirer 메시지 → 첫 번째 circle_staff 응답" 시간차의 평균(최근 3개월).
 *
 * ── 반환값 변환 ───────────────────────────────────────────────────────────────
 * DB 는 interval 타입을 ISO 8601 duration 문자열(예: "00:32:15" / "1 day 02:30:00")
 * 또는 seconds 숫자로 반환한다.
 * → 일 수로 환산(Math.ceil, 최솟값 1일).
 * → NULL 이면 null 반환.
 *
 * ── 캐시 정책 ─────────────────────────────────────────────────────────────────
 * 이 통계는 집계 수치(비개인·공개)이므로 unstable_cache 로 60초 캐싱한다.
 * - createAnonClient(): unstable_cache 안에서 cookies() 금지 → anon 클라이언트 사용.
 * - tags:["circles"]: 동아리 mutation 시 revalidateTag("circles") 로 무효화 연동.
 * ⚠️  DM 본문은 캐시 절대 금지. 이 함수는 집계 수치만 캐싱한다.
 *
 * @param circleId - circles.id UUID
 * @returns AvgResponseTime — { days: number } | null
 */
export const getAvgResponseTime = unstable_cache(
  async (circleId: string): Promise<AvgResponseTime> => {
    // unstable_cache 안에서는 cookies() 금지 → anon 클라이언트 사용
    const supabase = createAnonClient();

    const { data, error } = await supabase.rpc("avg_response_time", {
      _circle_id: circleId,
    });

    if (error) {
      console.error("[getAvgResponseTime] rpc error:", error.message);
      return null;
    }

    // DB 에서 NULL 반환 시 (집계 데이터 없음)
    if (data === null || data === undefined) {
      return null;
    }

    // ── interval → 초(seconds) 환산 ──────────────────────────────────────────
    // Supabase JS SDK 는 interval 을 "HH:MM:SS" 또는 "N days HH:MM:SS" 문자열로 반환.
    // 일부 환경에서는 숫자(초)로 반환하는 경우도 있으므로 타입 분기 처리.
    let totalSeconds: number;

    if (typeof data === "number") {
      // 숫자로 반환된 경우 (초 단위)
      totalSeconds = data;
    } else if (typeof data === "string") {
      // 문자열 interval 파싱: "N days HH:MM:SS" 또는 "HH:MM:SS" 형식
      totalSeconds = parseIntervalToSeconds(data);
    } else {
      // 알 수 없는 형식 — null 로 처리
      console.warn("[getAvgResponseTime] unexpected data type:", typeof data, data);
      return null;
    }

    if (totalSeconds <= 0) {
      return null;
    }

    // 초 → 일 수 환산(올림, 최솟값 1일)
    const days = Math.max(1, Math.ceil(totalSeconds / 86400));

    return { days };
  },
  ["avg-response-time"],
  { revalidate: 60, tags: ["circles"] }
);

/**
 * PostgreSQL interval 문자열 → 초(seconds)로 파싱하는 내부 헬퍼.
 *
 * 지원 형식:
 *   "HH:MM:SS"              예: "00:45:30"
 *   "N days HH:MM:SS"       예: "2 days 03:15:00"
 *   "N day HH:MM:SS"        예: "1 day 00:00:00"
 *
 * 이 형식은 Supabase PostgreSQL의 interval 기본 출력 포맷이다.
 */
function parseIntervalToSeconds(interval: string): number {
  let days = 0;
  let timeStr = interval.trim();

  // "N days HH:MM:SS" 또는 "N day HH:MM:SS" 패턴 파싱
  const daysMatch = timeStr.match(/^(\d+)\s+days?\s+/i);
  if (daysMatch) {
    days = parseInt(daysMatch[1], 10);
    timeStr = timeStr.slice(daysMatch[0].length);
  }

  // "HH:MM:SS" 파싱
  const timeParts = timeStr.split(":");
  if (timeParts.length !== 3) {
    return days * 86400;
  }

  const hours = parseInt(timeParts[0], 10) || 0;
  const minutes = parseInt(timeParts[1], 10) || 0;
  const seconds = parseFloat(timeParts[2]) || 0;

  return days * 86400 + hours * 3600 + minutes * 60 + seconds;
}

// ══════════════════════════════════════════════════════════════════════════════
//  [섹션 6] getActiveInquiryForUser — 채팅 개편(T-DM-CHAT)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * 현재 로그인 사용자의 특정 동아리에 대한 활성 문의 스레드 1건을 조회한다.
 *
 * ── 목적 ─────────────────────────────────────────────────────────────────────
 * dm/page.tsx 에서 기존 활성 대화방이 있는지 확인할 때 사용한다.
 * 존재하면 해당 스레드로 redirect, 없으면 빈 채팅창(NewDmChat) 렌더.
 *
 * ── 조회 조건 ─────────────────────────────────────────────────────────────────
 * - status IN ('open', 'resolved') — blocked 제외
 * - circle_id = circleId
 * - sender_user_id = auth.uid() (RLS 로 자동 필터링)
 * - 정렬: last_message_at DESC NULLS LAST, created_at DESC — 가장 최근 스레드 1건
 *
 * ── 접근 제어 ─────────────────────────────────────────────────────────────────
 * RLS(inquiries_select): sender_user_id = auth.uid() → 본인 스레드만 반환.
 * 미인증/타인의 스레드 → RLS 가 자동으로 행을 숨김 → null 반환.
 *
 * ── 캐시 정책 ─────────────────────────────────────────────────────────────────
 * DM 는 개인 데이터 → unstable_cache 절대 금지.
 * 매 요청 최신값 반환.
 *
 * @param circleId - 동아리 UUID
 * @returns { id: string } (inquiry UUID) | null (없거나 오류)
 */
export async function getActiveInquiryForUser(circleId: string): Promise<{ id: string } | null> {
  // Fluid compute 대응: 함수 내에서 매번 새로 생성
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("inquiries")
    .select("id")
    .eq("circle_id", circleId)
    // blocked 제외 (open, resolved 만 포함)
    .in("status", ["open", "resolved"])
    // 정렬: last_message_at 최신 우선, 동률이면 created_at 최신
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[getActiveInquiryForUser] fetch error:", error.message);
    return null;
  }

  if (!data) {
    return null;
  }

  return { id: data.id as string };
}
