"use client";

/**
 * JoinChannelModal — 「参加する」 CTA 클릭 시 노출되는 채널 선택 팝업.
 *
 * 동작 정책 (2026-05 개편):
 * - 기존 바텀시트(Sheet side="bottom") → 화면 "중앙" 팝업으로 변경.
 * - SNS 아이콘 3개(Instagram / X / LINE)가 가로 한 줄로 중앙에 배치.
 * - 각 아이콘이 scale 팝 + stagger 로 작게→커지며 순차 등장 (스프링 탄성).
 * - 아이콘을 누르면 해당 채널 링크(외부)로 새 탭 이동 + 모달 닫힘.
 *
 * 컨테이너 (카드 없는 모자이크 배경):
 * - Radix Dialog primitive 를 직접 사용 (shadcn DialogContent 의 카드 chrome/zoom 회피).
 * - Overlay: bg-black/45 + backdrop-blur-xl → 뒤 화면 자체를 모자이크. 바깥 클릭 시 dismiss.
 * - Content: 투명(box/border 없음). 제목·아이콘이 모자이크 배경 위에 직접 떠 있음.
 * - 텍스트: 가독성을 위해 흰색(text-white) + drop-shadow.
 * - 접근성: Dialog 는 Title 필수 → 보이는 제목 + Description 포함.
 *
 * 채널 데이터:
 * - circle 의 contact_instagram / contact_x / contact_line 중 입력된 항목만 노출.
 * - 채널 0개: 「連絡先が登録されていません」 EmptyState + 「閉じる」 버튼.
 *
 * 애니메이션 (탄성 등장 + 상시 떠다니기):
 * - LazyMotion + domAnimation: 번들 최소화 (프로젝트 표준 패턴).
 * - 제목: headerVariants fade-up 등장.
 * - m.ul / m.li: scale 0.3 + y 24 → 통통 bounce spring 으로 0.08s 간격 stagger 등장.
 * - 아이콘 내부 m.div: y[0,-6,0] 무한 루프(float), index 별 delay 로 비동기 떠다님.
 * - m.a whileHover scale 1.1 / whileTap scale 0.9 (SPRING_PRESS).
 * - useReducedMotion: true 면 등장·float·hover·tap 모두 비활성 (정적 표시).
 */

import { LazyMotion, domAnimation, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";

import { Instagram, MessageCircle, Twitter } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";

import { incrementInquiryCount } from "@/app/circles/[id]/actions";
import { Button } from "@/components/ui/button";
import { SPRING_PRESS } from "@/lib/motion/tokens";
import type { CircleDetail } from "@/lib/types/domain";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────
// 모션 variants (아이콘 scale 팝 stagger 등장)
// ─────────────────────────────────────────

/**
 * 아이콘 row 컨테이너 variant.
 * staggerChildren: 각 아이콘 사이 0.08s 간격 — 또렷한 "하나씩 팝" 리듬.
 * delayChildren: Dialog 가 열리고 0.05s 후 첫 아이콘 등장.
 */
const rowVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
} as const;

/**
 * 개별 아이콘 아이템 등장 variant.
 * scale:0.3 + y:24 → 1/0 : 아래에서 작게 시작해 "톡" 튀어오르는 팝 느낌.
 * spring(stiffness 260 / damping 12): 살짝 통통 오버슈트하며 탄성 있게 안착 (bounce).
 */
const itemVariants = {
  hidden: { opacity: 0, scale: 0.3, y: 24 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 260,
      damping: 12,
    },
  },
} as const;

/**
 * 제목/설명 묶음 fade-up 등장 variant.
 * 아이콘보다 먼저 살짝 떠오르며 나타나 시선을 위에서 아래로 유도.
 */
const headerVariants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
  },
} as const;

/**
 * 채널 키별 라벨·아이콘·브랜드 컬러 매핑.
 * iconBg: 원형 아이콘 배경에 사용되는 Tailwind 클래스 문자열.
 */
const CHANNEL_META: Record<
  "instagram" | "x" | "line",
  { label: string; Icon: typeof Instagram; iconBg: string }
> = {
  instagram: {
    label: "Instagram",
    Icon: Instagram,
    /* Instagram 공식 그라데이션 */
    iconBg: "bg-gradient-to-br from-[#feda75] via-[#d62976] to-[#4f5bd5]",
  },
  x: {
    label: "X (Twitter)",
    Icon: Twitter,
    /* X(구 Twitter) 공식 블랙 */
    iconBg: "bg-black",
  },
  line: {
    label: "LINE",
    Icon: MessageCircle,
    /* LINE 공식 그린 */
    iconBg: "bg-[#06C755]",
  },
};

interface JoinChannelModalProps {
  /** 채널 URL 이 포함된 서클 상세 정보 */
  circle: CircleDetail;
  /** Dialog 열림 상태 */
  open: boolean;
  /** Dialog 열림 상태 변경 콜백 */
  onOpenChange: (open: boolean) => void;
}

/**
 * 채널 선택 모달 컴포넌트.
 * circle 의 contact_* 필드 중 입력된 항목만 아이콘으로 노출한다.
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
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        {/*
         * 백드롭 — 카드 없이 "뒤 화면 자체"를 모자이크 처리하는 면.
         * bg-black/45: 흰 텍스트가 어떤 배경 사진 위에서도 읽히도록 어둡게 깐 scrim.
         * backdrop-blur-sm: 뒤 화면을 살짝 블러 → 은은한 모자이크 느낌.
         * 바깥 클릭 시 Radix 가 자동 dismiss.
         */}
        <DialogPrimitive.Overlay className="data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/45 backdrop-blur-sm" />

        {/*
         * Content — 카드 없는 투명 중앙 컨테이너.
         * 제목·아이콘이 모자이크 배경 위에 직접 떠 있음 (배경 box/border 일절 없음).
         * 아이콘 클러스터 크기만 차지하므로 바깥 빈 영역은 Overlay 가 받아 dismiss 가능.
         */}
        <DialogPrimitive.Content className="data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 fixed top-1/2 left-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 px-6 outline-none">
          {/*
           * LazyMotion: domAnimation 만 번들에 포함 (프로젝트 표준 최적화 패턴).
           * 제목 fade-up · 아이콘 탄성 등장 · 상시 float · hover/tap 피드백을 이 블록에서 활성화.
           */}
          <LazyMotion features={domAnimation}>
            {/*
             * 제목 + 보조 문구 (중앙 정렬, 흰 텍스트) — Dialog 접근성상 Title 필수.
             * m.div headerVariants: 아이콘보다 먼저 살짝 떠오르며 등장.
             */}
            <m.div
              className="space-y-1 text-center"
              variants={shouldReduceMotion ? undefined : headerVariants}
              initial={shouldReduceMotion ? false : "hidden"}
              animate="show"
            >
              <DialogPrimitive.Title className="text-lg font-bold text-white drop-shadow-sm">
                問い合わせる
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-sm text-white/70">
                SNSから選んでください
              </DialogPrimitive.Description>
            </m.div>

            {channels.length === 0 ? (
              /* 채널이 하나도 등록되지 않은 경우 EmptyState */
              <div className="space-y-4 py-8 text-center">
                <p className="text-sm text-white/80">連絡先が登録されていません。</p>
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
                >
                  閉じる
                </Button>
              </div>
            ) : (
              /*
               * m.ul — stagger 컨테이너. 가로 한 줄(flex) 중앙 정렬.
               * initial="hidden" animate="show": 마운트 시 즉시 stagger 발동.
               * shouldReduceMotion: true 면 variants 없이 즉시 show 상태로 렌더.
               */
              <m.ul
                className="flex items-start justify-center gap-6 pt-7"
                variants={shouldReduceMotion ? undefined : rowVariants}
                initial={shouldReduceMotion ? false : "hidden"}
                animate="show"
              >
                {channels.map((ch, index) => {
                  const meta = CHANNEL_META[ch.key];
                  const Icon = meta.Icon;
                  return (
                    /*
                     * m.li — stagger 등장 아이템 (scale 0.3 + y 24 → 통통 bounce).
                     */
                    <m.li key={ch.key} variants={shouldReduceMotion ? undefined : itemVariants}>
                      {/*
                       * m.a — 아이콘 + 라벨 세로 stack 앵커.
                       * whileHover scale:1.1 (데스크탑) / whileTap scale:0.9 (SPRING_PRESS).
                       * href / target / rel / onClick / aria-label 보존.
                       */}
                      <m.a
                        href={ch.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${meta.label}で問い合わせる(外部リンク)`}
                        onClick={() => handleChannelClick()}
                        whileHover={shouldReduceMotion ? undefined : { scale: 1.1 }}
                        whileTap={
                          shouldReduceMotion ? undefined : { scale: 0.9, transition: SPRING_PRESS }
                        }
                        className="flex w-20 flex-col items-center gap-2"
                      >
                        {/*
                         * 내부 m.div — 등장과 분리된 "상시 떠다니기(float)" 루프 담당.
                         * y:[0,-6,0] 무한 반복, index 별 delay 로 아이콘마다 비동기 float.
                         * shouldReduceMotion: true 면 루프 없이 정지.
                         */}
                        <m.div
                          className={cn(
                            "flex size-16 shrink-0 items-center justify-center rounded-full shadow-lg",
                            meta.iconBg
                          )}
                          animate={shouldReduceMotion ? undefined : { y: [0, -6, 0] }}
                          transition={
                            shouldReduceMotion
                              ? undefined
                              : {
                                  duration: 3,
                                  repeat: Infinity,
                                  ease: "easeInOut",
                                  delay: index * 0.2,
                                }
                          }
                          aria-hidden="true"
                        >
                          <Icon className="size-7 text-white" />
                        </m.div>

                        {/* 채널명 라벨 (흰 텍스트) */}
                        <span className="text-center text-xs font-medium text-white/90 drop-shadow-sm">
                          {meta.label}
                        </span>
                      </m.a>
                    </m.li>
                  );
                })}
              </m.ul>
            )}
          </LazyMotion>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
