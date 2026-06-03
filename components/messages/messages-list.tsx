"use client";

/**
 * components/messages/messages-list.tsx
 *
 * メッセージ一覧の行コンテナ — クライアントコンポーネント.
 *
 * ── 責務 ─────────────────────────────────────────────────────────────────────
 * - Server Component (page.tsx) から MyInquiryItem[] を受け取り、
 *   MessageRow 一覧をレンダリングする.
 * - 「他の行をスワイプすると前の行が閉じる」動作のため、
 *   現在開いている行の closeSwipe 関数を ref で管理する.
 *
 * ── スワイプ排他制御 ──────────────────────────────────────────────────────────
 * openedCloseRef: 現在開いているMessageRowのcloseRow関数を保持.
 * MessageRow が onOpen コールバックで closeRow を登録 → 次の行が開く時に前の行を閉じる.
 */

import { useRef, useCallback } from "react";

import type { MyInquiryItem } from "@/lib/supabase/queries/inquiries";
import MessageRow, { type CloseSwipeFn } from "./message-row";

interface MessagesListProps {
  items: MyInquiryItem[];
}

export default function MessagesList({ items }: MessagesListProps) {
  // 현재 열린 행의 닫힘 함수를 저장하는 ref
  // (여러 행이 동시에 열리지 않도록 배타 제어)
  const openedCloseRef = useRef<CloseSwipeFn | null>(null);

  // MessageRow 의 onOpen 콜백:
  // 새 행이 열릴 때 이전 행을 닫고, 새 행의 close 함수를 등록
  const handleRowOpen = useCallback((closeFn: CloseSwipeFn) => {
    // 이전 열린 행이 있으면 닫기
    if (openedCloseRef.current) {
      openedCloseRef.current();
    }
    // 새 행의 close 함수를 등록
    openedCloseRef.current = closeFn;
  }, []);

  return (
    // -mx-4: container 좌우 패딩을 상쇄해 행을 화면 가장자리까지 확장 (LINE 풀폭 행)
    // divide-y は MessageRow 내부의 인셋 구분선으로 대체 → 미사용
    <ol className="-mx-4" aria-label="メッセージスレッド一覧">
      {items.map((item) => (
        <MessageRow key={item.id} item={item} onOpen={handleRowOpen} />
      ))}
    </ol>
  );
}
