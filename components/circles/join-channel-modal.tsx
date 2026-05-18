"use client";

/**
 * JoinChannelModal — 「参加する」 CTA 클릭 시 노출되는 채널 선택 시트.
 *
 * - shadcn Sheet side="bottom" 단일 패턴 (모바일·데스크탑 공통).
 * - mx-auto max-w-md 로 데스크탑에서 너무 넓어지지 않도록 제한.
 * - 입력된 채널(contact_instagram / contact_x / contact_line)만 channels 배열에 push.
 * - 채널 0개: 「連絡先が登録されていません」 EmptyState + 「閉じる」 버튼.
 * - 채널 1개 이상: Button asChild + a[target="_blank" rel="noopener noreferrer"] 풀폭 노출.
 * - handleChannelClick: [T-009 anchor] console.info 후 모달 닫기.
 * - T-015 anchor: 미로그인 시 router.push(`/auth/login?next=/circles/${circle.id}`) — Phase 1.2 이후 구현.
 */

import { ExternalLink, Instagram, MessageCircle, Twitter } from "lucide-react";

import { incrementInquiryCount } from "@/app/circles/[id]/actions";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { CircleDetail } from "@/lib/types/domain";

/** 채널 키별 라벨 및 아이콘 매핑 — 컴포넌트 외부에서 한 번만 생성하여 매 render 재생성 방지 */
const CHANNEL_META: Record<"instagram" | "x" | "line", { label: string; Icon: typeof Instagram }> =
  {
    instagram: { label: "Instagram", Icon: Instagram },
    x: { label: "X (Twitter)", Icon: Twitter },
    line: { label: "LINE", Icon: MessageCircle },
  };

interface JoinChannelModalProps {
  /** 채널 URL 이 포함된 서클 상세 정보 */
  circle: CircleDetail;
  /** Sheet 열림 상태 */
  open: boolean;
  /** Sheet 열림 상태 변경 콜백 */
  onOpenChange: (open: boolean) => void;
}

/**
 * 채널 선택 모달 컴포넌트.
 * circle 의 contact_* 필드 중 입력된 항목만 버튼으로 노출한다.
 */
export function JoinChannelModal({ circle, open, onOpenChange }: JoinChannelModalProps) {
  /** 입력된 채널만 수집하여 배열 생성 */
  const channels: { key: "instagram" | "x" | "line"; url: string }[] = [];
  if (circle.contact_instagram) channels.push({ key: "instagram", url: circle.contact_instagram });
  if (circle.contact_x) channels.push({ key: "x", url: circle.contact_x });
  if (circle.contact_line) channels.push({ key: "line", url: circle.contact_line });

  /**
   * 채널 링크 클릭 처리.
   *
   * - fire-and-forget 로 incrementInquiryCount Server Action 호출.
   * - 에러가 나도 UX에 영향 없음 (void 처리).
   */
  function handleChannelClick() {
    // 문의 카운트 증가 — fire-and-forget (await 없음)
    void incrementInquiryCount(circle.id);
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {/* mx-auto max-w-md: 데스크탑에서 시트 폭을 md 로 제한 */}
      <SheetContent side="bottom" className="mx-auto max-w-md">
        <SheetHeader>
          <SheetTitle>参加方法を選んでください</SheetTitle>
          <SheetDescription>{circle.name} に問い合わせる連絡先を選んでください。</SheetDescription>
        </SheetHeader>

        {channels.length === 0 ? (
          /* 채널이 하나도 등록되지 않은 경우 EmptyState */
          <div className="space-y-3 py-6 text-center">
            <p className="text-muted-foreground text-sm">連絡先が登録されていません。</p>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              閉じる
            </Button>
          </div>
        ) : (
          /* 채널이 1개 이상인 경우 풀폭 버튼 목록 */
          <ul className="space-y-2 py-4">
            {channels.map((ch) => {
              const meta = CHANNEL_META[ch.key];
              const Icon = meta.Icon;
              return (
                <li key={ch.key}>
                  {/* h-12(48px): WCAG 터치 타깃 최소 크기 준수 */}
                  <Button asChild className="h-12 w-full justify-start gap-3">
                    <a
                      href={ch.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${meta.label}で問い合わせる(外部リンク)`}
                      onClick={() => handleChannelClick()}
                    >
                      <Icon className="size-5" aria-hidden="true" />
                      <span>{meta.label}</span>
                      <ExternalLink className="ml-auto size-4" aria-hidden="true" />
                    </a>
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </SheetContent>
    </Sheet>
  );
}
