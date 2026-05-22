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
 *
 * 애니메이션:
 * - LazyMotion + domAnimation: 번들 최소화 (프로젝트 표준 패턴)
 * - m.ul / m.li stagger: 시트 열릴 때 카드가 아래에서 위로 0.05s 간격 순차 페이드업
 * - m.a whileTap: SPRING_PRESS 토큰 기반 press 피드백 (scale 0.97)
 * - useReducedMotion: true면 stagger 없이 즉시 표시 + whileTap 비활성
 */

import { LazyMotion, domAnimation, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";

import { ChevronRight, Instagram, MessageCircle, Twitter } from "lucide-react";

import { incrementInquiryCount } from "@/app/circles/[id]/actions";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { SPRING_PRESS } from "@/lib/motion/tokens";
import type { CircleDetail } from "@/lib/types/domain";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────
// 모션 variants (채널 카드 stagger 등장)
// ─────────────────────────────────────────

/**
 * 카드 목록 컨테이너 variant.
 * staggerChildren: 각 카드 사이 0.05s 간격 — 너무 빠르지도 느리지도 않은 세련된 리듬.
 * delayChildren: 시트가 열리고 0.05s 후 첫 카드 등장 — Radix 슬라이드업이 완료되는 타이밍에 맞춤.
 */
const listVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.05,
    },
  },
} as const;

/**
 * 개별 카드 아이템 variant.
 * y:8 — 8px 아래에서 시작해 자연스럽게 위로 올라옴 (과하지 않은 미세 이동).
 * ease [0.22,1,0.36,1] — expo out: 빠르게 치솟고 부드럽게 착지 (고급스러운 타이밍).
 * duration 0.3 — 마이크로인터랙션 범주 (너무 길면 답답, 너무 짧으면 어색).
 */
const cardVariants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1],
    },
  },
} as const;

/**
 * 채널 키별 라벨·아이콘·브랜드 컬러·보조 텍스트 매핑.
 * iconBg: 원형 아이콘 배경에 사용되는 Tailwind 클래스 문자열.
 * sub: 카드 하단 보조 텍스트 (일본어).
 */
const CHANNEL_META: Record<
  "instagram" | "x" | "line",
  { label: string; Icon: typeof Instagram; iconBg: string; sub: string }
> = {
  instagram: {
    label: "Instagram",
    Icon: Instagram,
    /* Instagram 공식 그라데이션 */
    iconBg: "bg-gradient-to-br from-[#feda75] via-[#d62976] to-[#4f5bd5]",
    sub: "Instagramで問い合わせる",
  },
  x: {
    label: "X (Twitter)",
    Icon: Twitter,
    /* X(구 Twitter) 공식 블랙 */
    iconBg: "bg-black",
    sub: "X(旧Twitter)で問い合わせる",
  },
  line: {
    label: "LINE",
    Icon: MessageCircle,
    /* LINE 공식 그린 */
    iconBg: "bg-[#06C755]",
    sub: "LINEで問い合わせる",
  },
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
  /* OS "동작 줄이기" 감지 — true 면 stagger/whileTap 비활성 */
  const shouldReduceMotion = useReducedMotion();

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
        {/* 스와이프 힌트용 드래그 핸들바 */}
        <div
          className="bg-muted-foreground/30 mx-auto mb-4 h-1.5 w-10 rounded-full"
          aria-hidden="true"
        />

        <SheetHeader className="pb-2">
          <SheetTitle>参加方法を選んでください</SheetTitle>
          <SheetDescription>{circle.name} に問い合わせる連絡先を選んでください。</SheetDescription>
        </SheetHeader>

        {channels.length === 0 ? (
          /* 채널이 하나도 등록되지 않은 경우 EmptyState */
          <div className="space-y-4 py-8 text-center">
            <p className="text-muted-foreground text-sm">連絡先が登録されていません。</p>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              閉じる
            </Button>
          </div>
        ) : (
          /*
           * LazyMotion: domAnimation 만 번들에 포함 (프로젝트 표준 최적화 패턴).
           * 채널 카드 stagger 등장 + 카드 press 피드백을 이 블록에서만 활성화.
           */
          <LazyMotion features={domAnimation}>
            {/*
             * m.ul — stagger 컨테이너.
             * initial="hidden" animate="show": 시트 마운트 시 즉시 stagger 발동.
             * shouldReduceMotion: true 면 listVariants 없이 즉시 show 상태로 렌더.
             */}
            <m.ul
              className="space-y-3 py-4"
              variants={shouldReduceMotion ? undefined : listVariants}
              initial={shouldReduceMotion ? false : "hidden"}
              animate="show"
            >
              {channels.map((ch) => {
                const meta = CHANNEL_META[ch.key];
                const Icon = meta.Icon;
                return (
                  /*
                   * m.li — stagger 아이템.
                   * 각 카드가 0.05s 간격으로 아래(y:8)에서 위로 페이드업 등장.
                   * shouldReduceMotion: true 면 cardVariants 없이 즉시 표시.
                   */
                  <m.li key={ch.key} variants={shouldReduceMotion ? undefined : cardVariants}>
                    {/*
                     * m.a — 카드형 앵커 (기존 <a> 대체).
                     * whileTap scale:0.97 + SPRING_PRESS: 손가락으로 누르는 듯한 탄성 피드백.
                     * 기존 active:scale-[0.99] CSS 피드백은 motion whileTap 으로 대체 → 제거.
                     * href / target / rel / onClick / aria-label / className 전부 보존.
                     */}
                    <m.a
                      href={ch.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${meta.label}で問い合わせる(外部リンク)`}
                      onClick={() => handleChannelClick()}
                      whileTap={
                        shouldReduceMotion ? undefined : { scale: 0.97, transition: SPRING_PRESS }
                      }
                      className="bg-card hover:bg-muted/50 flex items-center gap-3 rounded-xl border p-3 transition-colors"
                    >
                      {/* 브랜드 컬러 원형 아이콘 영역 */}
                      <div
                        className={cn(
                          "flex size-11 shrink-0 items-center justify-center rounded-full",
                          meta.iconBg
                        )}
                        aria-hidden="true"
                      >
                        <Icon className="size-5 text-white" />
                      </div>

                      {/* 채널명 + 보조 텍스트 */}
                      <div className="flex min-w-0 flex-1 flex-col">
                        <p className="text-sm font-semibold">{meta.label}</p>
                        <p className="text-muted-foreground text-xs">{meta.sub}</p>
                      </div>

                      {/* 우측 화살표 아이콘 */}
                      <ChevronRight
                        className="text-muted-foreground ml-auto size-5 shrink-0"
                        aria-hidden="true"
                      />
                    </m.a>
                  </m.li>
                );
              })}
            </m.ul>
          </LazyMotion>
        )}
      </SheetContent>
    </Sheet>
  );
}
