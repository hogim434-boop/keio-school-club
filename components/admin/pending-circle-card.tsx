"use client";

/**
 * PendingCircleCard — 관리자 승인 큐의 신청 1건 카드.
 *
 * 표시: 커버(있으면) · 이름 · 카테고리 + official_type(검수 목적이라 5종 전부 노출) ·
 *       대표자 표시이름 + 慶應 인증 뱃지 · 신청일 · 신청 메모(submission_note).
 * 액션: 「承認」(즉시) / 「却下」(거절 사유 Sheet 입력 → 필수).
 *
 * 처리 결과는 부모(AdminQueueView)의 onResolved(id) 로 알려 목록에서 낙관적으로 제거한다.
 * 거절 사유 입력은 하단 Sheet(모바일·데스크탑 공통 바텀시트)로 받는다.
 */

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Building2, CalendarDays, CircleCheck, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORY_LABELS } from "@/lib/constants/category";
import { OFFICIAL_TYPE_LABELS } from "@/lib/constants/official-type";
import { MEMBER_BAND_LABELS } from "@/lib/constants/member-band";
import { approveCircle, rejectCircle } from "@/app/admin/actions";
import type { PendingCircle } from "@/lib/supabase/queries/circles";

/** 거절 사유 최대 길이 (서버 액션과 동일) */
const MAX_REJECTION_REASON = 500;

/** 신청일 표시 — 2026年5月24日 형식 */
function formatJpDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

interface PendingCircleCardProps {
  circle: PendingCircle;
  /** 승인/거절 처리 성공 시 호출 — 부모가 목록에서 제거 */
  onResolved: (id: string) => void;
}

export function PendingCircleCard({ circle, onResolved }: PendingCircleCardProps) {
  /** 승인/거절 처리 중 — 버튼 비활성 */
  const [busy, setBusy] = useState(false);
  /** 거절 사유 Sheet 열림 여부 */
  const [rejectOpen, setRejectOpen] = useState(false);
  /** 거절 사유 입력값 */
  const [reason, setReason] = useState("");

  const officialLabel = OFFICIAL_TYPE_LABELS[circle.official_type];

  /** 承認 핸들러 */
  async function handleApprove() {
    setBusy(true);
    const result = await approveCircle(circle.id);
    if (!result.ok) {
      toast.error(result.error ?? "承認に失敗しました");
      setBusy(false);
      return;
    }
    toast.success(`「${circle.name}」を承認しました`);
    onResolved(circle.id);
  }

  /** 却下 핸들러 — Sheet 에서 사유 입력 후 호출 */
  async function handleReject() {
    const trimmed = reason.trim();
    if (!trimmed) {
      toast.error("却下理由を入力してください");
      return;
    }
    setBusy(true);
    const result = await rejectCircle(circle.id, trimmed);
    if (!result.ok) {
      toast.error(result.error ?? "却下に失敗しました");
      setBusy(false);
      return;
    }
    toast.success(`「${circle.name}」を却下しました`);
    setRejectOpen(false);
    onResolved(circle.id);
  }

  return (
    <Card className="overflow-hidden p-0">
      <CardContent className="space-y-3 p-4">
        {/* ── 커버 + 기본 정보 ── */}
        <div className="flex gap-3">
          {/* 커버 썸네일 (1:1) */}
          <div className="bg-muted relative size-16 shrink-0 overflow-hidden rounded-md">
            {circle.cover_image_url ? (
              <Image
                src={circle.cover_image_url}
                alt={circle.name}
                fill
                sizes="64px"
                className="object-cover"
              />
            ) : (
              <div className="text-muted-foreground flex h-full w-full items-center justify-center">
                <Building2 className="size-6" aria-hidden="true" />
              </div>
            )}
          </div>

          {/* 이름 · 카테고리 · official_type */}
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 text-sm leading-snug font-semibold">{circle.name}</h3>
            <p className="text-muted-foreground mt-1 text-xs">
              {CATEGORY_LABELS[circle.category]} · {officialLabel}
            </p>
            {/* 신청일 */}
            <p className="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
              <CalendarDays className="size-3" aria-hidden="true" />
              申請日: {formatJpDate(circle.created_at)}
            </p>
          </div>
        </div>

        {/* ── 대표자 정보 ── */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted-foreground">代表者:</span>
          <span className="font-medium">{circle.owner_display_name ?? "（未設定）"}</span>
          {circle.owner_keio_verified ? (
            <Badge variant="outline" className="gap-1 text-[11px] font-normal">
              <ShieldCheck className="size-3 text-emerald-600" aria-hidden="true" />
              慶應認証済み
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground text-[11px] font-normal">
              未認証
            </Badge>
          )}
        </div>

        {/* ── 신청 메모 (있을 때만) ── */}
        {circle.submission_note && (
          <div className="bg-muted/60 text-foreground/80 rounded-md px-3 py-2 text-xs">
            <span className="text-muted-foreground font-medium">申請メモ: </span>
            {circle.submission_note}
          </div>
        )}

        {/* ── 申請内容 (대표자가 등록 시 기입한 내용) — 심사 판단용 ── */}
        <div className="bg-background space-y-2 rounded-md border px-3 py-2.5 text-xs">
          <p className="text-muted-foreground font-medium">申請内容</p>

          {/* 소개글 — 6줄 클램프, 줄바꿈 보존 */}
          {circle.description ? (
            <p className="text-foreground/80 line-clamp-6 leading-relaxed whitespace-pre-line">
              {circle.description}
            </p>
          ) : (
            <p className="text-muted-foreground italic">紹介文は未入力です</p>
          )}

          {/* 활동요일 · 부원 수 */}
          {(circle.activity_days || circle.member_band) && (
            <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
              {circle.activity_days && (
                <span>
                  活動曜日: <span className="text-foreground/80">{circle.activity_days}</span>
                </span>
              )}
              {circle.member_band && (
                <span>
                  部員数:{" "}
                  <span className="text-foreground/80">
                    {MEMBER_BAND_LABELS[circle.member_band]}
                  </span>
                </span>
              )}
            </div>
          )}

          {/* 연락처 */}
          {(circle.contact_instagram || circle.contact_x || circle.contact_line) && (
            <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
              {circle.contact_instagram && (
                <span>
                  IG: <span className="text-foreground/80">{circle.contact_instagram}</span>
                </span>
              )}
              {circle.contact_x && (
                <span>
                  X: <span className="text-foreground/80">{circle.contact_x}</span>
                </span>
              )}
              {circle.contact_line && (
                <span>
                  LINE: <span className="text-foreground/80">{circle.contact_line}</span>
                </span>
              )}
            </div>
          )}

          {/* 전체 상세(이미지·태그 포함)는 상세 페이지에서 — admin 은 RLS 로 pending 도 열람 가능 */}
          <Link
            href={`/circles/${circle.id}`}
            target="_blank"
            className="text-keio-navy inline-block pt-0.5 underline"
          >
            詳細ページで全て確認 →
          </Link>
        </div>

        {/* ── 액션 버튼 ── */}
        <div className="flex gap-2 pt-1">
          <Button
            variant="outline"
            className="flex-1"
            disabled={busy}
            onClick={() => setRejectOpen(true)}
          >
            却下
          </Button>
          <Button className="flex-1" disabled={busy} onClick={handleApprove}>
            <CircleCheck aria-hidden="true" />
            承認
          </Button>
        </div>
      </CardContent>

      {/* ── 却下 사유 입력 Sheet (바텀시트) ── */}
      <Sheet open={rejectOpen} onOpenChange={(open) => !busy && setRejectOpen(open)}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>「{circle.name}」を却下</SheetTitle>
            <SheetDescription>
              却下理由を入力してください。代表者の申請画面に表示されます。
            </SheetDescription>
          </SheetHeader>

          <div className="px-4">
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={MAX_REJECTION_REASON}
              rows={4}
              placeholder="例) 公認サークルとして確認できませんでした。学籍・公認状況をご確認のうえ再申請してください。"
              aria-label="却下理由"
            />
            <p className="text-muted-foreground mt-1 text-right text-xs">
              {reason.length}/{MAX_REJECTION_REASON}
            </p>
          </div>

          <SheetFooter>
            <Button variant="destructive" disabled={busy || !reason.trim()} onClick={handleReject}>
              却下する
            </Button>
            <SheetClose asChild>
              <Button variant="outline" disabled={busy}>
                キャンセル
              </Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </Card>
  );
}
