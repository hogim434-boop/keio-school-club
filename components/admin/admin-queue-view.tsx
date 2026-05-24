"use client";

/**
 * AdminQueueView — 관리자 승인 큐 리스트 컨테이너.
 *
 * 서버(RSC page)에서 받은 initial(PendingCircle[])을 state 로 보유하고,
 * 각 카드의 승인/거절 성공 시 해당 항목을 목록에서 낙관적으로 제거한다.
 * (revalidatePath 로도 서버 데이터가 갱신되지만, 즉시 반응을 위해 클라이언트에서 먼저 제거)
 *
 * 레이아웃: 데스크탑 2열 그리드 / 모바일 1열. 0건 시 빈 상태 안내.
 */

import { useState } from "react";
import { Inbox } from "lucide-react";

import type { PendingCircle } from "@/lib/supabase/queries/circles";

import { PendingCircleCard } from "./pending-circle-card";

export function AdminQueueView({ initial }: { initial: PendingCircle[] }) {
  const [list, setList] = useState<PendingCircle[]>(initial);

  /** 승인/거절 처리된 항목을 목록에서 제거 */
  function handleResolved(id: string) {
    setList((prev) => prev.filter((c) => c.id !== id));
  }

  // 빈 상태 — 처리할 신청이 없음
  if (list.length === 0) {
    return (
      <div className="text-muted-foreground flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-16 text-center">
        <Inbox className="size-10" aria-hidden="true" />
        <p className="text-sm">承認待ちのサークルはありません。</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {list.map((circle) => (
        <PendingCircleCard key={circle.id} circle={circle} onResolved={handleResolved} />
      ))}
    </div>
  );
}
