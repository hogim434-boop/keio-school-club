"use client";

/**
 * components/messages/message-row.tsx
 *
 * LINE型メッセージ一覧の1行 — スワイプ対応クライアントコンポーネント.
 *
 * ── レイアウト (LINE/iMessage HIG パターン) ──────────────────────────────────
 * [円形アバター size-12, イニシャル, 固有色]
 * [上段: サークル名(未読 bold) + 時刻(右)]
 * [下段: 最後のメッセージプレビュー(truncate) + 未読バッジ(右)]
 *
 * ── スワイプアクション (motion/react drag-x) ──────────────────────────────────
 * - 左スワイプ → 背後に2つのアクションボタン表示: [既読にする][削除]
 * - 一定距離以上ドラッグ → ボタン固定表示 → タップで実行
 * - 他の行をスワイプした時は前の行を閉じる (Context 経由)
 * - prefers-reduced-motion: スワイプアニメーション無効化 → ボタン即時表示
 *
 * ── P0 LINE 精緻化 4点 ───────────────────────────────────────────────────────
 * 1. 時刻混合表記: formatChatListTime(iso) ヘルパー
 * 2. インセット区切り線: アバター右端から始まる border-b (ml-[72px])
 * 3. 解決済み/終了フェード: status=resolved → opacity-60 + 「解決済み」バッジ
 * 4. サークル固有色: circleAvatarColor(name) ヘルパー
 *
 * ── A-5 準拠 ────────────────────────────────────────────────────────────────
 * 「既読」テキスト表示禁止. 未読数バッジ(数値)のみ.
 *
 * ── F058 準拠 ───────────────────────────────────────────────────────────────
 * サークルイニシャルのみ表示. 運営者個人のアバター/名前は非表示.
 *
 * ── セキュリティ ─────────────────────────────────────────────────────────────
 * hideInquiry / markInquiryMessagesRead は Server Action — getClaims で再検証済み.
 */

import { useCallback, useRef, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LazyMotion, domAnimation, m, useMotionValue, useTransform, animate } from "motion/react";
import { Check, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatChatListTime } from "@/lib/dm/format-chat-list-time";
import { circleAvatarColor } from "@/lib/dm/circle-avatar-color";
import { markInquiryMessagesRead } from "@/app/messages/actions";
import { hideInquiry } from "@/app/messages/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { MyInquiryItem } from "@/lib/supabase/queries/inquiries";

// ── 스와이프 아이콘 버튼 영역 너비 ─────────────────────────────────────────────
// 읽음 처리(64px) + 삭제(64px) = 128px
const ACTION_WIDTH = 128;
// 스와이프 열림 임계 거리 (이 이상 밀면 버튼 고정)
const SNAP_THRESHOLD = ACTION_WIDTH * 0.5;

// ── 열림 상태 공유를 위한 콜백 타입 ────────────────────────────────────────────
// page.tsx 에서 "현재 열린 행" ref 를 내려줘서 다른 행 스와이프 시 이전 행 닫힘 구현
export type CloseSwipeFn = () => void;

interface MessageRowProps {
  item: MyInquiryItem;
  /** 행이 열릴 때 이 함수를 호출 → page 에서 이전 열린 행을 닫는다 */
  onOpen?: (closeFn: CloseSwipeFn) => void;
}

export default function MessageRow({ item, onOpen }: MessageRowProps) {
  const router = useRouter();

  // ── 낙관적 UI 상태 ──────────────────────────────────────────────────────────
  // 스와이프 동작 후 즉시 UI 반영 (서버 재검증 전)
  const [unreadCount, setUnreadCount] = useState(item.unread_count);
  const [hidden, setHidden] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // ── prefers-reduced-motion 감지 ─────────────────────────────────────────────
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
  }, []);

  // ── motion 드래그 값 ─────────────────────────────────────────────────────────
  const x = useMotionValue(0);
  // 배경 액션 버튼 영역 너비: x 가 음수일수록 넓어짐 (max ACTION_WIDTH)
  const actionAreaWidth = useTransform(x, [-ACTION_WIDTH, 0], [ACTION_WIDTH, 0]);
  // 드래그 중 행 배경 약간 어둡게 (UX 피드백)
  const rowBg = useTransform(x, [-ACTION_WIDTH, 0], ["hsl(var(--muted))", "transparent"]);

  // ── 스와이프 열림 여부 ──────────────────────────────────────────────────────
  const isOpenRef = useRef(false);

  // ── 행 닫힘 함수 (다른 행 열릴 때 호출됨) ──────────────────────────────────
  const closeRow = useCallback(() => {
    isOpenRef.current = false;
    animate(x, 0, { type: "spring", stiffness: 300, damping: 30 });
  }, [x]);

  // ── 드래그 종료 핸들러 ──────────────────────────────────────────────────────
  const handleDragEnd = useCallback(() => {
    const currentX = x.get();
    if (currentX < -SNAP_THRESHOLD) {
      // 임계 거리 이상: 버튼 고정 표시
      animate(x, -ACTION_WIDTH, { type: "spring", stiffness: 300, damping: 30 });
      isOpenRef.current = true;
      // 다른 열린 행 닫기
      onOpen?.(closeRow);
    } else {
      // 임계 미만: 원위치
      animate(x, 0, { type: "spring", stiffness: 300, damping: 30 });
      isOpenRef.current = false;
    }
  }, [x, closeRow, onOpen]);

  // ── 읽음 처리 핸들러 ────────────────────────────────────────────────────────
  const handleMarkRead = useCallback(async () => {
    // 이미 읽음이면 no-op
    if (unreadCount === 0) {
      closeRow();
      return;
    }
    // 낙관적: 배지 즉시 제거
    setUnreadCount(0);
    closeRow();
    // Server Action 호출
    await markInquiryMessagesRead(item.id);
    // 헤더 배지 갱신 이벤트 (messages-link.tsx 가 수신)
    window.dispatchEvent(new Event("kc:dm-read"));
  }, [unreadCount, item.id, closeRow]);

  // ── 삭제 확인 핸들러 ────────────────────────────────────────────────────────
  const handleDeleteConfirm = useCallback(async () => {
    // 낙관적: 행 즉시 숨김
    setHidden(true);
    // Server Action 호출
    const result = await hideInquiry(item.id);
    if (!result.ok) {
      // 실패 시 복원
      setHidden(false);
      console.error("[MessageRow] hideInquiry error:", result.error);
    } else {
      // 성공: router.refresh 로 목록 재동기화
      router.refresh();
    }
  }, [item.id, router]);

  // ── 동아리 고유 아바타 색 ────────────────────────────────────────────────────
  const avatarColor = circleAvatarColor(item.circle_name);

  // ── 시간 표기 ───────────────────────────────────────────────────────────────
  const timeLabel = formatChatListTime(item.last_message_at ?? item.created_at);

  // ── 상태 배지 텍스트 + 행 스타일 ────────────────────────────────────────────
  // P0-3: resolved = opacity-60 + 「解決済み」배지, blocked = 「終了」배지
  const isResolved = item.status === "resolved";
  const isBlocked = item.status === "blocked";
  const hasStatusBadge = isResolved || isBlocked;
  const statusBadgeText = isResolved ? "解決済み" : "終了";

  // 숨김(soft delete 낙관적) 처리된 행은 렌더 제외
  if (hidden) return null;

  return (
    <>
      <li className="relative overflow-hidden">
        {/* ── 배경 액션 버튼 영역 ────────────────────────────────────────────── */}
        {/* 행 뒤에 배치 — 스와이프로 노출 */}
        <m.div
          className="absolute inset-y-0 right-0 flex items-stretch"
          style={{ width: actionAreaWidth }}
          aria-hidden
        >
          {/* 읽음 처리 버튼 (파랑/회색) */}
          {/* A-5: 「既読」텍스트 금지 — アイコン + 「読んだ」ラベルで代替 */}
          <button
            onClick={handleMarkRead}
            disabled={unreadCount === 0}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
              unreadCount === 0
                ? "bg-muted/80 text-muted-foreground/50 cursor-default"
                : "bg-blue-500 text-white active:bg-blue-600"
            )}
            aria-label={unreadCount === 0 ? "すべて読みました" : "未読を消す"}
          >
            <Check className="size-5" strokeWidth={2.5} />
            <span>{unreadCount === 0 ? "読了" : "未読を消す"}</span>
          </button>

          {/* 삭제 버튼 (빨강) */}
          <button
            onClick={() => {
              closeRow();
              setDeleteDialogOpen(true);
            }}
            className="bg-destructive text-destructive-foreground active:bg-destructive/90 flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors"
            aria-label="トークを削除"
          >
            <Trash2 className="size-5" />
            <span>削除</span>
          </button>
        </m.div>

        {/* ── 행 본문 (드래그 가능) ──────────────────────────────────────────── */}
        <LazyMotion features={domAnimation}>
          <m.div
            drag={reducedMotion ? false : "x"}
            // 오른쪽으로는 0 이상 드래그 불가, 왼쪽으로는 ACTION_WIDTH 까지
            dragConstraints={{ left: -ACTION_WIDTH, right: 0 }}
            dragElastic={{ left: 0.1, right: 0 }}
            style={{ x, backgroundColor: rowBg }}
            onDragEnd={handleDragEnd}
            // 드래그 중 Link 클릭 방지 — dragOffset 이 있으면 클릭 이벤트 흡수
            onPointerDown={() => {
              // 드래그 시작 시 열린 행 닫기
              if (!isOpenRef.current) {
                // 다른 열린 행이 있으면 닫음 (onOpen 콜백으로 처리)
              }
            }}
            className="relative z-10 select-none"
          >
            {/* ── 탭 가능한 링크 영역 ────────────────────────────────────────── */}
            <Link
              href={`/circles/${item.circle_id}/dm/${item.id}`}
              className={cn(
                "active:bg-muted/40 flex items-center gap-3.5 px-4 py-3.5 transition-colors",
                // P0-3: resolved/blocked 는 전체 행 흐림
                hasStatusBadge && "opacity-60"
              )}
              // 드래그 중 링크 이동 방지
              onClick={(e) => {
                if (Math.abs(x.get()) > 4) {
                  e.preventDefault();
                }
              }}
              aria-label={`${item.circle_name}とのトーク`}
            >
              {/* ── 원형 아바타 (F058: 서클 이니셜, 개인 아바타 비노출) ──────── */}
              {/* P0-4: circle_name 기반 고유 파스텔 색 */}
              <div
                className={cn(
                  "flex size-12 shrink-0 items-center justify-center rounded-full text-[15px] font-semibold",
                  avatarColor.bg,
                  avatarColor.text
                )}
                aria-hidden
              >
                {item.circle_name.charAt(0) || "?"}
              </div>

              {/* ── 본문 — 상단(서클명 + 시각) / 하단(미리보기 + 미읽음) ────── */}
              {/* P0-2: 인셋 구분선은 li 하위 pseudo 로 적용 (아래 참고) */}
              <div className="min-w-0 flex-1">
                {/* 상단: 서클명 + 상태 배지 + 시각 */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span
                      className={cn(
                        "truncate text-[15px] tracking-[-0.01em]",
                        unreadCount > 0
                          ? "text-foreground font-semibold"
                          : "text-foreground/85 font-medium"
                      )}
                    >
                      {item.circle_name}
                    </span>
                    {/* P0-3: 상태 배지 — 「解決済み」/ 「終了」*/}
                    {hasStatusBadge && (
                      <span className="bg-muted text-muted-foreground shrink-0 rounded px-1 py-px text-[10px] font-medium">
                        {statusBadgeText}
                      </span>
                    )}
                  </div>
                  {/* P0-1: LINE 혼합 시간 표기 */}
                  <time
                    dateTime={item.last_message_at ?? item.created_at}
                    className="text-muted-foreground/80 shrink-0 text-[11px] tabular-nums"
                  >
                    {timeLabel}
                  </time>
                </div>

                {/* 하단: 마지막 메시지 미리보기 + 미읽음 배지 */}
                <div className="mt-0.5 flex items-center justify-between gap-2">
                  <p
                    className={cn(
                      "min-w-0 flex-1 truncate text-sm",
                      unreadCount > 0 ? "text-foreground/80" : "text-muted-foreground"
                    )}
                  >
                    {item.last_message_preview ?? "メッセージはありません"}
                  </p>

                  {/* A-5: 「既読」텍스트 금지 — 미읽음 숫자 배지만 */}
                  {unreadCount > 0 && (
                    <span
                      className="bg-keio-navy text-keio-navy-foreground flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold tabular-nums"
                      aria-label={`未読${unreadCount}件`}
                    >
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </Link>

            {/* P0-2: 인셋 구분선 — 아바타 우측(ml-[72px])부터 border-b */}
            {/* overflow-hidden 으로 인해 absolute 사용. 행 하단에 인셋 선 표시. */}
            <div className="border-border/50 absolute right-0 bottom-0 left-[78px] border-b" />
          </m.div>
        </LazyMotion>
      </li>

      {/* ── 삭제 확인 AlertDialog ──────────────────────────────────────────────── */}
      {/* 강제·위협 표현 금지 — 부드러운 일본어 카피 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>このトークを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              あなたの一覧から削除されます。
              <br />
              運営側のトーク履歴は引き続き保持されます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDeleteConfirm}>
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
