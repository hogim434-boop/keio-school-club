"use client";

/**
 * components/dm/inbox-list.tsx
 *
 * 운영진 인박스 스레드 리스트 (Client Component).
 *
 * ── 역할 ─────────────────────────────────────────────────────────────────────
 * - SSR 로 로드된 CircleInboxItem[] 를 카드 리스트로 렌더링.
 * - 카드 클릭 → /circles/:circleId/dm/:inquiryId 이동.
 * - Supabase Realtime 구독: 새 DM 수신 시 sonner 토스트 + router.refresh() 로 리스트 갱신.
 *
 * ── A-5 엄수 ──────────────────────────────────────────────────────────────────
 * 「既読」텍스트 / 아이콘 금지. 미읽음 수(숫자 배지)만 표시.
 *
 * ── F058 엄수 ─────────────────────────────────────────────────────────────────
 * sender_user_id 는 T-032 차단 메뉴용으로 data-* 속성에만 보존.
 * 발신자 이름은 카드에 최소 표시 (인박스 = 운영진 전용이므로 발신자 식별 허용).
 *
 * ── T-032 연동 안내 ───────────────────────────────────────────────────────────
 * T-032(차단)가 각 스레드 카드에 「このユーザーをブロック」메뉴를 추가할 예정.
 * 각 InboxThreadCard 에 data-sender-user-id={item.sender_user_id} 가 있으므로
 * T-032 는 이 컴포넌트에 DropdownMenu 를 추가하면 됩니다.
 * 또는 InboxListProps 에 onBlock(senderId, inquiryId) 콜백을 추가하는 방식도 가능.
 *
 * ── Realtime 구독 ─────────────────────────────────────────────────────────────
 * 채널명: `circle-inbox:${circleId}`
 * 구독 대상: inquiry_messages 테이블의 INSERT 이벤트 (새 메시지 도착 감지)
 * 새 메시지 도착 → sonner toast(「新しいDMが届きました」) + router.refresh()
 * cleanup: removeChannel 필수 (누수 방지).
 *
 * ── 3-context 패턴 ────────────────────────────────────────────────────────────
 * Realtime 구독은 브라우저 클라이언트(lib/supabase/client.ts)를 사용.
 */

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { MessageCircle, InboxIcon } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import type { CircleInboxItem } from "@/lib/supabase/queries/inquiries";
import { INQUIRY_CATEGORY_LABELS } from "@/lib/dm/constants";
import { Badge } from "@/components/ui/badge";
import { BlockUserMenu } from "@/components/dm/block-user-menu";
import { cn } from "@/lib/utils";

// ── Props ──────────────────────────────────────────────────────────────────────
interface InboxListProps {
  /** SSR でロードした問い合わせスレッド一覧 */
  initialItems: CircleInboxItem[];
  /** このインボックスが属するサークル UUID */
  circleId: string;
  /**
   * 차단된 발신자 user ID Set.
   * page.tsx 에서 user_blocks 를 한 번 조회해 Set 으로 변환 후 전달.
   * N+1 조회를 피하기 위해 컴포넌트 내부가 아닌 상위에서 전달받는다.
   */
  blockedUserIds?: Set<string>;
}

/**
 * タイムスタンプを日本語の相対表記にフォーマットするヘルパー.
 * 例: 「3分前」「2時間前」「3日前」
 */
function formatRelativeTime(isoString: string): string {
  return formatDistanceToNow(new Date(isoString), {
    addSuffix: true,
    locale: ja,
  });
}

/**
 * スレッドステータスのラベル・スタイルを返すヘルパー.
 */
function getStatusBadgeProps(status: string): {
  label: string;
  className: string;
} {
  switch (status) {
    case "open":
      return {
        label: "対応中",
        className:
          "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400",
      };
    case "resolved":
      return {
        label: "解決済み",
        className: "border-muted bg-muted/50 text-muted-foreground",
      };
    case "blocked":
      return {
        label: "ブロック",
        className:
          "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400",
      };
    default:
      return { label: status, className: "border-muted text-muted-foreground" };
  }
}

// ── メインコンポーネント ─────────────────────────────────────────────────────────

/**
 * 운영진 인박스 스레드 리스트 컴포넌트.
 */
export function InboxList({ initialItems, circleId, blockedUserIds }: InboxListProps) {
  const router = useRouter();

  // ── Realtime 구독: 새 메시지 도착 감지 ──────────────────────────────────
  // 이미 수신된 항목의 중복 토스트를 방지하기 위해 마지막 토스트 시각을 ref 로 관리
  const lastToastAtRef = useRef<number>(0);

  useEffect(() => {
    // 브라우저 클라이언트 — 3-context 패턴
    const supabase = createClient();

    // inquiry_messages INSERT 를 감지해 인박스 전체를 갱신
    // (inquiries 테이블을 구독하면 신규 스레드 생성도 감지 가능하지만,
    //  메시지 도착이 더 빈번하고 사용자에게 중요하므로 messages 구독)
    const channel = supabase
      .channel(`circle-inbox:${circleId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "inquiry_messages",
          // circle_id 직접 필터 불가(inquiry_messages 에 circle_id 없음)
          // → 채널 구독 후 payload 로 inquiry_id 확인, 토스트만 표시하고 refresh 로 최신 목록 취득
        },
        (payload) => {
          const newRow = payload.new as Record<string, unknown>;

          // 운영진이 직접 보낸 메시지(circle_staff)는 토스트 불필요
          if (newRow.sender_role === "circle_staff") return;

          // 중복 토스트 방지: 1초 이내 재발화 억제
          const now = Date.now();
          if (now - lastToastAtRef.current < 1000) return;
          lastToastAtRef.current = now;

          // 새 DM 도착 알림 토스트
          toast("新しいDMが届きました", {
            description: "インボックスを更新しました",
            icon: <MessageCircle className="size-4 text-sky-400" />,
          });

          // Server Component 재실행 → 최신 인박스 취득
          router.refresh();
        }
      )
      .subscribe();

    // cleanup: 컴포넌트 언마운트 시 채널 해제 (누수 방지)
    return () => {
      supabase.removeChannel(channel);
    };
  }, [circleId, router]);

  // ── 빈 인박스 표시 ────────────────────────────────────────────────────
  if (initialItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <InboxIcon className="text-muted-foreground/40 mb-4 size-12" aria-hidden />
        <p className="text-muted-foreground text-sm font-medium">まだ問い合わせがありません</p>
        <p className="text-muted-foreground/70 mt-1 text-xs">
          サークル・部活動に問い合わせが届くとここに表示されます
        </p>
      </div>
    );
  }

  // ── スレッドカードリスト ──────────────────────────────────────────────
  return (
    <ol className="flex flex-col divide-y" aria-label="問い合わせ一覧">
      {initialItems.map((item) => {
        const categoryLabel = item.category
          ? (INQUIRY_CATEGORY_LABELS[item.category] ?? item.category)
          : null;
        const statusBadge = getStatusBadgeProps(item.status);
        const hasUnread = item.unread_count > 0;
        const timeLabel = item.last_message_at
          ? formatRelativeTime(item.last_message_at)
          : formatRelativeTime(item.created_at);

        // 이 발신자가 현재 차단 상태인지 확인
        const isBlocked = blockedUserIds?.has(item.sender_user_id) ?? false;

        return (
          <li
            key={item.id}
            className={cn(
              "relative",
              // 차단된 발신자 스레드는 흐림 처리로 시각적 구분
              isBlocked && "opacity-60"
            )}
          >
            {/*
             * 레이아웃: Link(카드 클릭 영역) + BlockUserMenu(우측 메뉴 버튼).
             * <Link> 내부에 메뉴 버튼을 넣으면 클릭 이벤트가 겹치므로,
             * 메뉴 버튼을 <Link> 밖에 absolute 로 배치해 충돌을 완전히 분리한다.
             */}
            <Link
              href={`/circles/${circleId}/dm/${item.id}`}
              data-sender-user-id={item.sender_user_id}
              className={cn(
                "hover:bg-muted/50 active:bg-muted flex items-start gap-3 px-4 py-4 pr-12 transition-colors",
                // 未読があれば左側に強調ボーダー
                hasUnread && "border-l-primary border-l-2"
              )}
              aria-label={`${item.sender_display_name ?? "ユーザー"}からの問い合わせ。${categoryLabel ?? "カテゴリなし"}${isBlocked ? "（ブロック中）" : ""}`}
            >
              {/* ── 발신자 아이콘 자리 ────────────────────────────────── */}
              <div
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                  hasUnread ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                )}
                aria-hidden
              >
                {/* 발신자 이름 첫 글자 — display_name 없으면 「?」 */}
                {item.sender_display_name?.charAt(0) ?? "?"}
              </div>

              {/* ── 스레드 본문 ───────────────────────────────────────── */}
              <div className="min-w-0 flex-1">
                {/* 상단: 발신자명 + 타임스탬프 + 미읽음 배지 */}
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      "truncate text-sm",
                      hasUnread ? "text-foreground font-semibold" : "text-foreground/80 font-medium"
                    )}
                  >
                    {/* F058: 인박스는 운영진 전용이므로 발신자 식별용 이름 표시 가능. 개인명 최소 노출. */}
                    {item.sender_display_name ?? "ユーザー"}
                  </span>

                  <div className="flex shrink-0 items-center gap-1.5">
                    {/* 차단 중 배지 — 차단된 사용자의 스레드임을 운영진에게 표시 */}
                    {isBlocked && (
                      <Badge
                        variant="outline"
                        className="h-4 rounded-full border-red-200 bg-red-50 px-1.5 text-[10px] text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400"
                      >
                        ブロック中
                      </Badge>
                    )}
                    {/* 미읽음 배지 — A-5: 「既読」텍스트 금지, 숫자 배지만 */}
                    {hasUnread && (
                      <Badge
                        variant="default"
                        className="h-5 min-w-5 rounded-full px-1.5 text-[10px] font-bold tabular-nums"
                        aria-label={`未読${item.unread_count}件`}
                      >
                        {item.unread_count > 99 ? "99+" : item.unread_count}
                      </Badge>
                    )}
                    {/* 타임스탬프 */}
                    <time
                      dateTime={item.last_message_at ?? item.created_at}
                      className="text-muted-foreground text-[11px]"
                    >
                      {timeLabel}
                    </time>
                  </div>
                </div>

                {/* 중단: 카테고리 라벨 + 상태 배지 */}
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                  {categoryLabel && (
                    <span className="text-muted-foreground rounded-full border px-2 py-0.5 text-[10px]">
                      {categoryLabel}
                    </span>
                  )}
                  <Badge
                    variant="outline"
                    className={cn("h-4 rounded-full px-1.5 text-[10px]", statusBadge.className)}
                  >
                    {statusBadge.label}
                  </Badge>
                </div>

                {/* 하단: 마지막 메시지 미리보기 */}
                {item.last_message_preview && (
                  <p
                    className={cn(
                      "mt-1 line-clamp-1 text-xs",
                      hasUnread ? "text-foreground/80" : "text-muted-foreground"
                    )}
                  >
                    {item.last_message_preview}
                  </p>
                )}
              </div>
            </Link>

            {/* ── 차단 메뉴 버튼 — <Link> 밖에 absolute 배치 ─────────────────
             * <Link> 내부에 버튼이 있으면 클릭 이벤트가 충돌하므로 분리.
             * pointer-events-none 인 <Link> 영역 위에 겹쳐 배치.
             */}
            <div
              className="absolute top-1/2 right-2 -translate-y-1/2"
              // 메뉴 영역의 클릭이 <li> 또는 <Link> 로 버블링되지 않도록
              onClick={(e) => e.preventDefault()}
            >
              <BlockUserMenu
                circleId={circleId}
                targetUserId={item.sender_user_id}
                isBlocked={isBlocked}
                inquiryId={item.id}
                targetDisplayName={item.sender_display_name}
              />
            </div>
          </li>
        );
      })}
    </ol>
  );
}
