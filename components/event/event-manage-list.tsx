"use client";

/**
 * components/event/event-manage-list.tsx
 *
 * イベント申込者管理リスト — Client Component (T-024 산출물).
 *
 * 役割:
 * - フィルタータブ (全員 / going / pending / waiting / cancelled / interested)
 * - 各行: 氏名·申込日·ステータスバッジ表示
 * - pending 行: 「承認」「拒否」ボタン + 拒否理由入力
 * - 「CSV ダウンロード」「一斉通知を送信」ボタン
 *
 * 설계:
 * - Server Actions (approveRsvp, rejectRsvp, broadcastEvent) 호출.
 * - 낙관적 업데이트 대신 action 완료 후 router.refresh() — 서버 데이터 최신화.
 * - toast 는 sonner 라이브러리 사용 (shadcn/ui 기본 설정).
 */

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CheckCircle,
  XCircle,
  Download,
  Bell,
  BellRing,
  ChevronDown,
  ChevronUp,
  Loader2,
  Users,
} from "lucide-react";

import type { RsvpRow, InterestRow, RsvpStatus } from "@/lib/supabase/queries/event-rsvps";
import { approveRsvp, rejectRsvp, broadcastEvent } from "@/app/circles/[id]/events/actions";
import { sendEventChangeNotifications } from "@/lib/server-actions/event-change-notify";
import { formatJst } from "@/lib/format/jst";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// ─────────────────────────────────────────────────────────────────────────────
//  타입 정의
// ─────────────────────────────────────────────────────────────────────────────

interface EventManageListProps {
  circleId: string;
  eventId: string;
  // circleName: Server Action 내부에서 DB JOIN으로 취득하므로 prop 불필요
  rsvpMode: "strict" | "light";
  rsvps: RsvpRow[];
  interests: InterestRow[];
  csvUrl: string;
  /** T-026: 미발송 변경 로그 수 (変更通知 버튼 배지 표시용) */
  unsentCount: number;
}

// ─────────────────────────────────────────────────────────────────────────────
//  상태 배지 색상 맵
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<
  RsvpStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  going: { label: "参加予定", variant: "default" },
  pending: { label: "審査中", variant: "secondary" },
  waiting: { label: "キャンセル待ち", variant: "outline" },
  cancelled: { label: "キャンセル", variant: "destructive" },
  rejected: { label: "拒否", variant: "destructive" },
};

// ─────────────────────────────────────────────────────────────────────────────
//  서브 컴포넌트: 拒否ダイアログ
// ─────────────────────────────────────────────────────────────────────────────

interface RejectDialogProps {
  rsvp: RsvpRow;
  circleId: string;
  eventId: string;
  onDone: () => void;
}

function RejectDialog({ rsvp, circleId, eventId, onDone }: RejectDialogProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleReject() {
    startTransition(async () => {
      const result = await rejectRsvp(eventId, rsvp.user_id, circleId, reason);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("拒否しました");
      setOpen(false);
      setReason("");
      onDone();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="destructive"
          size="sm"
          className="gap-1"
          disabled={isPending}
        >
          <XCircle className="h-3.5 w-3.5" />
          拒否
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>申込を拒否しますか？</DialogTitle>
          <DialogDescription>
            {rsvp.display_name ?? rsvp.user_id} さんの申込を拒否します。
            <br />
            理由を入力すると申込者に通知されます（任意）。
          </DialogDescription>
        </DialogHeader>

        <Textarea
          placeholder="拒否理由（任意）"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          maxLength={200}
          disabled={isPending}
        />

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            キャンセル
          </Button>
          <Button
            variant="destructive"
            onClick={handleReject}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "拒否する"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  서브 컴포넌트: 一斉通知ダイアログ
// ─────────────────────────────────────────────────────────────────────────────

interface BroadcastDialogProps {
  circleId: string;
  eventId: string;
  recipientCount: number;
}

function BroadcastDialog({ circleId, eventId, recipientCount }: BroadcastDialogProps) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleBroadcast() {
    startTransition(async () => {
      const result = await broadcastEvent(eventId, circleId, body);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success(
        result.count > 0
          ? `${result.count}名に通知を送信しました`
          : "通知対象者がいませんでした"
      );
      setOpen(false);
      setBody("");
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <BellRing className="h-4 w-4" />
          一斉通知を送信
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>一斉通知を送信</DialogTitle>
          <DialogDescription>
            参加予定者 {recipientCount} 名にプッシュ通知を送信します。
          </DialogDescription>
        </DialogHeader>

        <Textarea
          placeholder="通知メッセージを入力してください（最大500文字）"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          maxLength={500}
          disabled={isPending}
        />
        <p className="text-xs text-muted-foreground text-right">
          {body.length} / 500
        </p>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            キャンセル
          </Button>
          <Button
            onClick={handleBroadcast}
            disabled={isPending || body.trim().length === 0}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Bell className="h-4 w-4 mr-1" />
                送信する
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  서브 컴포넌트: 変更通知ボタン (T-026)
// ─────────────────────────────────────────────────────────────────────────────

interface ChangeNotifyButtonProps {
  circleId: string;
  eventId: string;
  /** 미발송 변경 로그 수. 0이면 버튼 비활성화. */
  unsentCount: number;
}

/**
 * 이벤트 내용이 변경됐을 때 신청자 전원에게 알림을 일제히 보내는 버튼.
 *
 * - 미발송 count 가 0이면 비활성화 (gray badge 표시).
 * - 클릭 시 sendEventChangeNotifications Server Action 호출.
 * - 성공하면 toast + router.refresh() 로 count 재조회.
 * - 이미 발송 완료된 경우(2번 클릭) "未送信の変更はありません" toast.
 */
function ChangeNotifyButton({ circleId, eventId, unsentCount }: ChangeNotifyButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // 낙관적으로 표시할 count (Server Action 완료 전 UI 갱신용)
  const [localCount, setLocalCount] = useState(unsentCount);

  // prop 갱신 시 (router.refresh() 후) localCount 동기화
  // useState 초기값은 최초 1회만 적용되므로 useEffect 로 반영
  useEffect(() => {
    setLocalCount(unsentCount);
  }, [unsentCount]);

  function handleNotify() {
    if (localCount === 0) {
      toast.info("未送信の変更はありません");
      return;
    }

    startTransition(async () => {
      const result = await sendEventChangeNotifications(eventId, circleId);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      if (result.notifiedCount > 0) {
        toast.success(
          `${result.notifiedCount}名に変更通知を送信しました（${result.processedLogCount}件の変更）`
        );
      } else if (result.processedLogCount > 0) {
        // 알림 대상자 없었지만 로그는 처리됨
        toast.info("通知対象者はいませんでしたが、変更ログを処理済みにしました");
      } else {
        toast.info("未送信の変更はありません");
      }

      // 낙관적으로 0 으로 갱신 후 router.refresh() 로 서버 데이터 최신화
      setLocalCount(0);
      router.refresh();
    });
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5"
      onClick={handleNotify}
      disabled={isPending || localCount === 0}
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Bell className="h-4 w-4" />
      )}
      変更通知を送信
      {/* 미발송 건수 배지 */}
      {localCount > 0 && (
        <span className="ml-0.5 inline-flex items-center justify-center rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-medium leading-none text-destructive-foreground">
          {localCount}件
        </span>
      )}
    </Button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  서브 컴포넌트: RSVP 한 행
// ─────────────────────────────────────────────────────────────────────────────

interface RsvpRowItemProps {
  rsvp: RsvpRow;
  circleId: string;
  eventId: string;
  onRefresh: () => void;
}

function RsvpRowItem({ rsvp, circleId, eventId, onRefresh }: RsvpRowItemProps) {
  const [approving, startApproveTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);

  const badgeInfo = STATUS_BADGE[rsvp.status] ?? { label: rsvp.status, variant: "outline" as const };

  function handleApprove() {
    startApproveTransition(async () => {
      const result = await approveRsvp(eventId, rsvp.user_id, circleId);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      // T-023 트리거가 정원 초과 시 waiting 으로 강제 전환 — toast 안내
      if (result.finalStatus === "waiting") {
        toast.info("定員オーバーのため、キャンセル待ちに自動振り分けされました");
      } else {
        toast.success("承認しました");
      }
      onRefresh();
    });
  }

  return (
    <div className="rounded-lg border bg-card p-3 space-y-2">
      {/* 메인 행 */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {/* 이름 */}
          <p className="text-sm font-medium truncate">
            {rsvp.display_name ?? "(名前なし)"}
          </p>
          {/* 이메일 (운영자만 표시) */}
          {rsvp.email && (
            <p className="text-xs text-muted-foreground truncate">{rsvp.email}</p>
          )}
          {/* 신청일시 */}
          <p className="text-xs text-muted-foreground mt-0.5">
            申込: {formatJst(rsvp.created_at, "MM/dd HH:mm")}
            {rsvp.waiting_position != null && (
              <span className="ml-2 text-amber-600 dark:text-amber-400">
                待機 #{rsvp.waiting_position}
              </span>
            )}
          </p>
        </div>

        {/* 상태 배지 */}
        <Badge variant={badgeInfo.variant} className="shrink-0 text-xs">
          {badgeInfo.label}
        </Badge>
      </div>

      {/* pending 전용: 承認 / 拒否 버튼 */}
      {rsvp.status === "pending" && (
        <div className="flex gap-2">
          <Button
            size="sm"
            className="gap-1 flex-1"
            onClick={handleApprove}
            disabled={approving}
          >
            {approving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle className="h-3.5 w-3.5" />
            )}
            承認
          </Button>
          <RejectDialog
            rsvp={rsvp}
            circleId={circleId}
            eventId={eventId}
            onDone={onRefresh}
          />
        </div>
      )}

      {/* 拒否済み: 거부 사유 접기/펼치기 */}
      {rsvp.status === "rejected" && rsvp.rejection_reason && (
        <div>
          <button
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setExpanded((v) => !v)}
            type="button"
          >
            {expanded ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
            拒否理由
          </button>
          {expanded && (
            <p className="mt-1 text-xs text-muted-foreground rounded bg-muted px-2 py-1.5">
              {rsvp.rejection_reason}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  메인 컴포넌트
// ─────────────────────────────────────────────────────────────────────────────

export default function EventManageList({
  circleId,
  eventId,
  rsvpMode,
  rsvps,
  interests,
  csvUrl,
  unsentCount,
}: EventManageListProps) {
  const router = useRouter();

  // 페이지 데이터 갱신 — Server Action 완료 후 router.refresh() 로 최신화
  function handleRefresh() {
    router.refresh();
  }

  // ── going 수 (일괄 알림 대상 수 표시용) ──────────────────────────────
  const goingCount = rsvps.filter((r) => r.status === "going").length;
  const pendingCount = rsvps.filter((r) => r.status === "pending").length;

  // ── 필터 탭 목록 (strict 모드) ────────────────────────────────────────
  const TABS = [
    { value: "all", label: `全員 (${rsvps.length})` },
    { value: "going", label: `参加予定 (${goingCount})` },
    { value: "pending", label: `審査中 (${pendingCount})` },
    {
      value: "waiting",
      label: `待機 (${rsvps.filter((r) => r.status === "waiting").length})`,
    },
    {
      value: "cancelled",
      label: `キャンセル (${rsvps.filter((r) => r.status === "cancelled").length})`,
    },
    {
      value: "rejected",
      label: `拒否 (${rsvps.filter((r) => r.status === "rejected").length})`,
    },
  ] as const;

  // ─────────────────────────────────────────────────────────────────────
  //  light 모드: 興味あり リスト 표시
  // ─────────────────────────────────────────────────────────────────────
  if (rsvpMode === "light") {
    return (
      <div className="space-y-4">
        {/* ツールバー */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>興味あり: {interests.length} 名</span>
          </div>
          <a href={csvUrl} download>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Download className="h-4 w-4" />
              CSV ダウンロード
            </Button>
          </a>
        </div>

        {/* 興味あり リスト */}
        {interests.length === 0 ? (
          <EmptyState message="まだ興味ありの登録者はいません" />
        ) : (
          <div className="space-y-2">
            {interests.map((item) => (
              <div
                key={item.user_id}
                className="rounded-lg border bg-card p-3"
              >
                <p className="text-sm font-medium">
                  {item.display_name ?? "(名前なし)"}
                </p>
                {item.email && (
                  <p className="text-xs text-muted-foreground">{item.email}</p>
                )}
                <p className="text-xs text-muted-foreground mt-0.5">
                  登録: {formatJst(item.created_at, "MM/dd HH:mm")}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  //  strict 모드: 承認制 신청자 관리
  // ─────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* ツールバー: 変更通知 / 一斉通知 / CSV */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        {/* T-026: 変更通知送信ボタン (미발송 count 배지 포함) */}
        <ChangeNotifyButton
          circleId={circleId}
          eventId={eventId}
          unsentCount={unsentCount}
        />

        {/* 일반 일괄 알림 (broadcastEvent) */}
        <BroadcastDialog
          circleId={circleId}
          eventId={eventId}
          recipientCount={goingCount}
        />

        {/* CSV ダウンロード */}
        <a href={csvUrl} download>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Download className="h-4 w-4" />
            CSV ダウンロード
          </Button>
        </a>
      </div>

      {/* フィルタータブ */}
      <Tabs defaultValue="all">
        <TabsList className="w-full flex overflow-x-auto gap-0.5 h-auto flex-wrap">
          {TABS.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="text-xs px-2.5 py-1.5 whitespace-nowrap"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* 全員タブ */}
        <TabsContent value="all" className="mt-3 space-y-2">
          {rsvps.length === 0 ? (
            <EmptyState message="まだ申込者はいません" />
          ) : (
            rsvps.map((rsvp) => (
              <RsvpRowItem
                key={rsvp.user_id}
                rsvp={rsvp}
                circleId={circleId}
                eventId={eventId}
                onRefresh={handleRefresh}
              />
            ))
          )}
        </TabsContent>

        {/* 상태별 탭 */}
        {(["going", "pending", "waiting", "cancelled", "rejected"] as RsvpStatus[]).map(
          (status) => (
            <TabsContent key={status} value={status} className="mt-3 space-y-2">
              {(() => {
                const filtered = rsvps.filter((r) => r.status === status);
                if (filtered.length === 0) {
                  return (
                    <EmptyState
                      message={`${STATUS_BADGE[status].label}の申込者はいません`}
                    />
                  );
                }
                return filtered.map((rsvp) => (
                  <RsvpRowItem
                    key={rsvp.user_id}
                    rsvp={rsvp}
                    circleId={circleId}
                    eventId={eventId}
                    onRefresh={handleRefresh}
                  />
                ));
              })()}
            </TabsContent>
          )
        )}
      </Tabs>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  빈 상태 컴포넌트
// ─────────────────────────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-10 text-center">
      <Users className="h-8 w-8 text-muted-foreground/50 mb-2" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
