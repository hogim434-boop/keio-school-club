"use client";

/**
 * components/dm/dm-thread.tsx
 *
 * DM 스레드 뷰 (Client Component) — 풀스크린 메신저형.
 *
 * ── LINE / iMessage 벤치마킹 레이아웃 ──────────────────────────────────────
 * fixed inset-0 flex flex-col 3단 구성:
 *   1. DmChatHeader (sticky 상단)
 *   2. 메시지 영역 (flex-1 overflow-y-auto)
 *   3. DmComposer (하단 일반 배치 — 풀스크린 flex 마지막 자식)
 *
 * ── 메시지 그룹핑 ─────────────────────────────────────────────────────────
 * groupMessages() 헬퍼로 같은 발신자 + 5분 이내 연속 메시지를 하나의 그룹으로 묶음.
 * - 아바타: 상대 그룹 마지막 버블 옆에만 1회
 * - 발신자 라벨: 상대 그룹 첫 버블 위에만 1회
 * - 시간: 그룹 마지막 버블 옆에만 1회
 *
 * ── 날짜 구분선 ───────────────────────────────────────────────────────────
 * 날짜가 바뀌는 시점에 DateDivider를 삽입.
 *
 * ── Realtime 구독 (보존) ──────────────────────────────────────────────────
 * useEffect에서 inquiry:${id} 채널 구독 → INSERT 시 setMessages 업데이트.
 * cleanup에서 removeChannel 필수.
 *
 * ── 자동 읽음 (보존) ──────────────────────────────────────────────────────
 * 스레드 진입 시 markInquiryMessagesRead → kc:dm-read 이벤트 발화.
 * A-5 엄수: 화면에 읽음 표시 절대 금지.
 *
 * ── A-5 엄수 ──────────────────────────────────────────────────────────────
 * is_read_by_recipient 는 내부 카운트용. 「既読」텍스트/체크마크 절대 금지.
 *
 * ── F058 엄수 ─────────────────────────────────────────────────────────────
 * 운영진 개인 이름·아바타 비노출. 운영진 라벨은 「{circleName}運営」만.
 *
 * ── 카피 규칙 ─────────────────────────────────────────────────────────────
 * 일본어 UI. 금지어(公認/公式LINEに参加/必ず) 사용 금지. サークル・部活動 병기.
 */

import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { MessageCircle } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { markInquiryMessagesRead } from "@/app/messages/actions";
import type { InquiryWithMessages, InquiryMessage } from "@/lib/supabase/queries/inquiries";
import { DmComposer } from "@/components/dm/dm-composer";
import { DmChatHeader } from "@/components/dm/dm-chat-header";
import { DateDivider } from "@/components/dm/date-divider";
import { ReportMessageMenu } from "@/components/dm/report-message-menu";
import { groupMessages } from "@/lib/dm/group-messages";
import type { MessageGroupItem } from "@/lib/dm/group-messages";
import { cn } from "@/lib/utils";

interface DmThreadProps {
  /** SSR 로드된 inquiry 전체 데이터 (메시지 포함) */
  inquiry: InquiryWithMessages;
  /** 서클명 — 운영진 라벨「○○運営」에 사용 */
  circleName: string;
  /** 현재 로그인한 사용자의 UUID */
  currentUserId: string;
  /** true = 현재 사용자가 운영진 / false = 문의 발신자(inquirer) */
  viewerIsStaff: boolean;
}

/**
 * 타임스탬프를 「HH:mm」형식으로 포맷하는 헬퍼.
 * 그룹 마지막 버블 옆에 1회만 표시.
 */
function formatMessageTime(isoString: string): string {
  return format(new Date(isoString), "HH:mm", { locale: ja });
}

/**
 * DM 스레드 뷰 — 풀스크린 메신저형 (LINE / iMessage 벤치마킹).
 */
export function DmThread({ inquiry, circleName, currentUserId, viewerIsStaff }: DmThreadProps) {
  // ── 메시지 목록 state (초기값 = SSR 데이터) ─────────────────────────────
  const [messages, setMessages] = useState<InquiryMessage[]>(inquiry.messages);

  // 메시지 목록 하단 자동 스크롤용 ref
  const bottomRef = useRef<HTMLDivElement>(null);

  // ── Supabase Realtime 구독 ─────────────────────────────────────────────
  // 절대 보존: 기존 로직 그대로 유지
  useEffect(() => {
    // 브라우저 클라이언트 — 3-context 패턴에서 Realtime은 항상 createBrowserClient
    const supabase = createClient();

    const channel = supabase
      .channel(`inquiry:${inquiry.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "inquiry_messages",
          // 이 inquiry의 메시지만 필터링
          filter: `inquiry_id=eq.${inquiry.id}`,
        },
        (payload) => {
          const newRow = payload.new as Record<string, unknown>;

          // ── 수신된 메시지를 InquiryMessage 타입으로 변환 ─────────────────
          const newMessage: InquiryMessage = {
            id: newRow.id as string,
            inquiry_id: newRow.inquiry_id as string,
            sender_user_id: newRow.sender_user_id as string,
            sender_role: (newRow.sender_role as "inquirer" | "circle_staff") ?? "inquirer",
            body: newRow.body as string,
            attachments: (newRow.attachments as string[] | null) ?? null,
            is_read_by_recipient: (newRow.is_read_by_recipient as boolean) ?? false,
            created_at: newRow.created_at as string,
          };

          // ── 중복 방지 (dedupe): id가 이미 존재하면 append하지 않음 ────────
          setMessages((prev) => {
            const alreadyExists = prev.some((m) => m.id === newMessage.id);
            if (alreadyExists) return prev;
            return [...prev, newMessage];
          });
        }
      )
      .subscribe((status) => {
        // 구독 상태 진단 — 연결 실패/타임아웃 시 콘솔 경고 (조용한 실패 방지)
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          console.warn(`[dm-thread] Realtime 구독 상태: ${status}`);
        }
      });

    // cleanup: 컴포넌트 언마운트 시 채널 해제 (누수·중복 수신 방지)
    return () => {
      supabase.removeChannel(channel);
    };
  }, [inquiry.id]);

  // ── 자동 읽음 처리 (스레드 진입 시 1회) ─────────────────────────────────
  // Server Component 렌더 중에는 mutation/revalidate가 금지되므로 client effect에서 처리.
  // 완료 후 kc:dm-read 이벤트 발화 → 헤더 메시지 아이콘 배지 즉시 갱신.
  // A-5 엄수: 화면에는 읽음 표시 안 함 (내부 카운트용).
  useEffect(() => {
    let cancelled = false;
    markInquiryMessagesRead(inquiry.id)
      .then(() => {
        if (!cancelled) {
          window.dispatchEvent(new Event("kc:dm-read"));
        }
      })
      .catch(() => {
        // 실패해도 무시 — 다음 진입 시 재시도됨
      });
    return () => {
      cancelled = true;
    };
  }, [inquiry.id]);

  // ── 메시지 추가 시 하단으로 자동 스크롤 ──────────────────────────────────
  // 절대 보존: 기존 scrollIntoView 로직 그대로
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── 메시지 그룹핑 ─────────────────────────────────────────────────────
  // groupMessages()가 날짜 구분선 + 메시지 그룹 혼합 배열을 반환한다.
  const groupedItems = groupMessages(messages, currentUserId, circleName, viewerIsStaff);

  return (
    // 풀스크린 3단 flex — LINE / iMessage 벤치마킹
    <div className="bg-background fixed inset-0 flex flex-col">
      {/* ── 1. 채팅 헤더 (공유 컴포넌트) ─────────────────────────────────── */}
      {/* DmChatHeader: 뒤로가기 + 운영진 아이콘 + {circleName}運営 라벨 */}
      <DmChatHeader
        circleName={circleName}
        // avgResponseTime은 DmThread에서는 미표시 (스레드 단계에서는 불필요)
      />

      {/* ── 2. 메시지 스크롤 영역 ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col px-4 py-3">
          {/* ── 메시지 0건: 빈 상태 안내 ────────────────────────────────── */}
          {/* new-dm-chat 빈 상태와 동일한 레이아웃으로 통일 */}
          {messages.length === 0 && (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
              <div
                className="bg-muted/60 flex size-14 items-center justify-center rounded-full"
                aria-hidden
              >
                <MessageCircle className="text-muted-foreground/50 size-7" />
              </div>
              <div className="space-y-1">
                <p className="text-foreground text-sm font-medium">まだメッセージはありません</p>
                <p className="text-muted-foreground text-xs">
                  {circleName}の運営に気軽に質問してみましょう
                </p>
              </div>
            </div>
          )}

          {/* ── 날짜 구분선 + 메시지 그룹 목록 ─────────────────────────── */}
          <ol className="flex flex-col gap-1" aria-label="メッセージ一覧">
            {groupedItems.map((item) => {
              // ── 날짜 구분선 ────────────────────────────────────────────
              if (item.kind === "date-divider") {
                return (
                  <li key={item.key} className="my-2">
                    <DateDivider date={item.date} />
                  </li>
                );
              }

              // ── 메시지 그룹 ────────────────────────────────────────────
              if (item.kind === "message-group") {
                const group = item as MessageGroupItem;
                return (
                  <li
                    key={group.key}
                    // 그룹 간 간격. items-end/start 를 두지 않는다 —
                    // 두면 내부 row 가 콘텐츠 최소폭으로 줄어들어 max-w-[75%] 가 무력화되고
                    // 좁은 버블에서 한글이 음절 단위로 줄바꿈된다. 좌우 정렬은 각 row 의 justify 로 처리.
                    className="mb-3 flex flex-col"
                  >
                    {group.messages.map((gm) => (
                      <div
                        key={gm.message.id}
                        className={cn(
                          // group CSS: hover 시 신고 메뉴(ReportMessageMenu) 표시
                          "group",
                          // w-full: row 가 전체 폭을 차지해야 버블 wrapper 의 max-w-[75%] 가
                          // 화면 폭 기준으로 계산된다(폭 붕괴·한글 음절 줄바꿈 방지). 정렬은 justify 로.
                          "mb-0.5 flex w-full items-end gap-2",
                          gm.message.sender_user_id === currentUserId
                            ? "justify-end"
                            : "justify-start"
                        )}
                      >
                        {/* ── 상대 메시지: 아바타 자리 + 버블 + 시간 + 신고 ── */}
                        {!group.isMine && (
                          <>
                            {/* 아바타 — 그룹 마지막 버블 옆에만 표시 */}
                            {gm.showAvatar ? (
                              <div
                                className={cn(
                                  "flex size-8 shrink-0 items-center justify-center",
                                  "bg-muted text-muted-foreground rounded-full text-xs font-bold"
                                )}
                                aria-hidden
                              >
                                {/* F058: 서클명 이니셜 — 개인 아바타 비노출 */}
                                {circleName.charAt(0) ?? "？"}
                              </div>
                            ) : (
                              // 아바타 없는 버블에는 동일 너비 공백 유지 (들여쓰기 정렬)
                              <div className="size-8 shrink-0" aria-hidden />
                            )}

                            <div className="flex max-w-[75%] flex-col gap-0.5">
                              {/* 발신자 라벨: 그룹 첫 버블 위에만 */}
                              {gm.senderLabel && (
                                <span className="text-muted-foreground px-1 text-xs">
                                  {gm.senderLabel}
                                </span>
                              )}

                              {/* 버블 + 시간 + 신고 메뉴 */}
                              <div className="flex items-end gap-1.5">
                                {/* 상대 메시지 버블 (좌측, bg-muted) */}
                                <div
                                  className={cn(
                                    "px-3.5 py-2.5 text-sm",
                                    "bg-muted text-foreground",
                                    // iMessage 스타일 꼬리: 그룹 마지막만 rounded-bl-sm
                                    gm.isFirst && gm.isLast
                                      ? "rounded-2xl rounded-bl-sm" // 단독 버블
                                      : gm.isFirst
                                        ? "rounded-2xl rounded-b-lg" // 그룹 첫 버블
                                        : gm.isLast
                                          ? "rounded-2xl rounded-bl-sm" // 그룹 마지막 버블 (꼬리)
                                          : "rounded-2xl rounded-l-lg" // 중간 버블
                                  )}
                                >
                                  <p className="leading-relaxed break-words whitespace-pre-wrap">
                                    {gm.message.body}
                                  </p>
                                </div>

                                {/* 시간: 그룹 마지막 버블에만 */}
                                {gm.showTime && (
                                  <time
                                    dateTime={gm.message.created_at}
                                    className="text-muted-foreground/60 shrink-0 text-[10px]"
                                  >
                                    {formatMessageTime(gm.message.created_at)}
                                  </time>
                                )}

                                {/*
                                 * T-031: 신고 메뉴 — 상대 메시지에만 표시.
                                 * group-hover 로 hover 시 노출 (ReportMessageMenu 내부 클래스).
                                 * 기존 기능 그대로 보존.
                                 */}
                                <ReportMessageMenu
                                  inquiryId={inquiry.id}
                                  messageId={gm.message.id}
                                />
                              </div>
                            </div>
                          </>
                        )}

                        {/* ── 내 메시지: 버블 + 시간 (우측) ──────────────── */}
                        {group.isMine && (
                          <div className="flex max-w-[75%] flex-col items-end gap-0.5">
                            <div className="flex items-end gap-1.5">
                              {/* 시간: 그룹 마지막 버블에만 (버블 왼쪽) */}
                              {gm.showTime && (
                                <time
                                  dateTime={gm.message.created_at}
                                  className="text-muted-foreground/60 shrink-0 text-[10px]"
                                >
                                  {formatMessageTime(gm.message.created_at)}
                                </time>
                              )}

                              {/* 내 메시지 버블 (우측, bg-primary) */}
                              <div
                                className={cn(
                                  "px-3.5 py-2.5 text-sm",
                                  "bg-primary text-primary-foreground",
                                  // iMessage 스타일 꼬리: 그룹 마지막만 rounded-br-sm
                                  gm.isFirst && gm.isLast
                                    ? "rounded-2xl rounded-br-sm" // 단독 버블
                                    : gm.isFirst
                                      ? "rounded-2xl rounded-b-lg" // 그룹 첫 버블
                                      : gm.isLast
                                        ? "rounded-2xl rounded-br-sm" // 그룹 마지막 (꼬리)
                                        : "rounded-2xl rounded-r-lg" // 중간 버블
                                )}
                              >
                                <p className="leading-relaxed break-words whitespace-pre-wrap">
                                  {gm.message.body}
                                </p>
                              </div>
                            </div>
                            {/*
                             * A-5 엄수: is_read_by_recipient は既読表示に使用しない.
                             * 화면에 「既読」텍스트 / 체크마크 등 일절 표시 금지.
                             */}
                          </div>
                        )}
                      </div>
                    ))}
                  </li>
                );
              }

              return null;
            })}
          </ol>

          {/* 자동 스크롤 앵커 — messages 변경 시 이 위치로 스크롤 */}
          <div ref={bottomRef} aria-hidden />
        </div>
      </div>

      {/* ── 3. 메시지 입력창 (DmComposer) ────────────────────────────────── */}
      {/* 풀스크린 flex 마지막 자식 — fixed 아님, flex 레이아웃으로 자연스럽게 하단에 위치 */}
      <DmComposer inquiryId={inquiry.id} circleId={inquiry.circle_id} />
    </div>
  );
}
