"use client";

/**
 * components/dm/new-dm-chat.tsx
 *
 * 신규 문의 빈 채팅창 (Client Component).
 *
 * ── 역할 ──────────────────────────────────────────────────────────────────────
 * dm/page.tsx에서 기존 활성 대화방이 없을 때 렌더된다.
 * LINE·카카오처럼 바로 메시지 입력창이 보임.
 * 첫 전송 → sendInquiry(circleId, body) 호출 → 성공 시 서버가 스레드 페이지로 redirect.
 *
 * ── 레이아웃 통일 ─────────────────────────────────────────────────────────────
 * DmThread와 동일한 풀스크린 3단 레이아웃:
 *   1. DmChatHeader (공유 컴포넌트 — 동일 헤더)
 *   2. 빈 메시지 영역 (flex-1)
 *   3. DmComposer (하단 일반 배치)
 *
 * ── 他者尊重 동의 모달 (보존) ─────────────────────────────────────────────────
 * sendInquiry가 { error: "REQUIRE_RESPECT_AGREEMENT" }를 반환하면 모달 표시.
 * 입력 본문을 useRef에 退避 → agreeRespect() 성공 → 같은 본문으로 sendInquiry 재호출.
 *
 * ── 카피 규칙 (CLAUDE.md) ─────────────────────────────────────────────────────
 * - 일본어 UI, 금지어(公認/公式LINEに参加/必ず) 사용 금지
 * - 단체 명칭은 サークル・部活動 병기
 * - F058: 운영진 개인 이름 비노출 → 「○○運営」형식
 * - A-5: 既読 표기 금지
 */

import { useState, useRef } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { DmComposer } from "@/components/dm/dm-composer";
import { DmChatHeader } from "@/components/dm/dm-chat-header";
import { sendInquiry, agreeRespect } from "@/app/circles/[id]/dm/actions";
import { cn } from "@/lib/utils";
import type { AvgResponseTime } from "@/lib/supabase/queries/inquiries";

interface NewDmChatProps {
  /** 문의 대상 서클 UUID */
  circleId: string;
  /** 서클명 — 헤더 「○○運営」라벨에 사용 */
  circleName: string;
  /**
   * 평균 응답 시간 배지용 데이터.
   * Server Component(dm/page.tsx)에서 getAvgResponseTime()로 조회해 전달.
   * undefined이면 배지 미표시.
   */
  avgResponseTime?: AvgResponseTime;
}

/**
 * 신규 문의 빈 채팅창.
 *
 * 아직 대화방이 없는 상태에서 DmChatHeader + 빈 상태 안내 + DmComposer를 표시한다.
 * 첫 메시지 전송 시 sendInquiry → redirect(스레드 페이지)로 전환된다.
 */
export function NewDmChat({ circleId, circleName, avgResponseTime }: NewDmChatProps) {
  // T-033: 他者尊重 동의 모달 열림 상태
  const [isRespectModalOpen, setIsRespectModalOpen] = useState(false);
  // T-033: 동의 후 재전송을 위해 입력 본문 퇴피 (useRef: 리렌더 불필요)
  const pendingBodyRef = useRef<string | null>(null);
  // T-033: 동의 처리 중 상태 (모달 버튼 비활성 + 로딩 텍스트)
  const [isAgreeing, setIsAgreeing] = useState(false);

  /**
   * DmComposer에 전달할 onSend 핸들러.
   *
   * - sendInquiry를 호출해 inquiry 생성 + 첫 메시지 저장.
   * - 성공 시 서버 측 redirect로 스레드 페이지(/dm/{inquiryId}) 이동 (여기서 void).
   * - REQUIRE_RESPECT_AGREEMENT → 본문 퇴피 + 동의 모달 표시.
   * - 그 외 에러 → DmComposer 인라인 에러로 전달.
   */
  async function handleSend(body: string): Promise<{ error: string } | void> {
    const result = await sendInquiry(circleId, body);
    // 성공 시 redirect → 여기까지 오지 않음 (void 반환)
    if (!result) return;

    if (result.error === "REQUIRE_RESPECT_AGREEMENT") {
      // T-033: 他者尊重 미동의 → 본문 퇴피 + 동의 모달 표시
      pendingBodyRef.current = body;
      setIsRespectModalOpen(true);
      // DmComposer에게는 에러를 돌려주지 않음 (모달이 UI 피드백 담당)
      return;
    }

    // 그 외 에러 → DmComposer 인라인 에러로 표시
    return { error: result.error };
  }

  /**
   * T-033: 他者尊重 동의 모달의 "同意して送信する" 버튼 핸들러.
   * agreeRespect() 호출 후 성공 시 퇴피된 본문으로 sendInquiry 재호출.
   */
  async function handleAgreeAndResend() {
    setIsAgreeing(true);

    const agreeResult = await agreeRespect();

    if (agreeResult?.error) {
      // 동의 기록 실패 — 모달 닫고 나중에 다시 시도 안내
      setIsRespectModalOpen(false);
      setIsAgreeing(false);
      pendingBodyRef.current = null;
      return;
    }

    // 동의 성공 → 퇴피된 본문으로 sendInquiry 재호출
    const savedBody = pendingBodyRef.current;
    pendingBodyRef.current = null;
    setIsRespectModalOpen(false);
    setIsAgreeing(false);

    if (!savedBody) return;

    // 성공 시 서버 액션 내부 redirect가 스레드 페이지로 이동
    await sendInquiry(circleId, savedBody);
  }

  return (
    <>
      {/* T-033: 他者尊重 동의 모달 ─────────────────────────────────────────── */}
      <Dialog open={isRespectModalOpen} onOpenChange={setIsRespectModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>コミュニティガイドライン</DialogTitle>
            <DialogDescription>メッセージを送信する前に、以下をご確認ください</DialogDescription>
          </DialogHeader>

          {/* 가이드라인 본문 */}
          <div className="text-foreground/80 space-y-3 text-sm leading-relaxed">
            <p>
              K CLUB は、お互いを尊重し合えるコミュニティを目指しています。
              サークル・部活動の運営への問い合わせでは、相手への敬意を大切に
              していただくようお願いしています。
            </p>
            <ul className="text-muted-foreground list-inside list-disc space-y-1.5 text-xs">
              <li>相手を傷つける言葉や行為はご遠慮ください</li>
              <li>誠実なやり取りを心がけてください</li>
              <li>個人情報の適切な取り扱いをお願いします</li>
            </ul>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            {/* 閉じる: 동의하지 않으면 모달만 닫음 */}
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setIsRespectModalOpen(false);
                pendingBodyRef.current = null;
              }}
              disabled={isAgreeing}
              className="w-full sm:w-auto"
            >
              閉じる
            </Button>
            {/* 同意して送信する: agreeRespect → 재전송 */}
            <Button
              type="button"
              onClick={handleAgreeAndResend}
              disabled={isAgreeing}
              aria-busy={isAgreeing}
              className={cn(
                "bg-keio-navy text-keio-navy-foreground hover:bg-keio-navy/90",
                "w-full rounded-full sm:w-auto"
              )}
            >
              {isAgreeing ? "処理中…" : "同意して送信する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 채팅창 풀스크린 레이아웃 ──────────────────────────────────────────── */}
      {/* DmThread와 동일한 fixed inset-0 flex flex-col 구조 */}
      <div className="bg-background fixed inset-0 flex flex-col">
        {/* ── 1. 채팅 헤더 (DmThread와 동일한 공유 컴포넌트) ───────────────── */}
        {/* avgResponseTime 배지를 헤더에 표시 (빈 채팅창에서도 동일) */}
        <DmChatHeader circleName={circleName} avgResponseTime={avgResponseTime} />

        {/* ── 2. 빈 메시지 영역 ─────────────────────────────────────────────── */}
        {/* 첫 메시지 전송 전이므로 가운데 안내 문구만 표시 */}
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <div
            className={cn("flex size-14 items-center justify-center", "bg-muted/60 rounded-full")}
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
          <p className="text-muted-foreground text-xs">返信があるとお知らせします</p>
        </div>

        {/* ── 3. 메시지 입력창 (DmComposer 재사용) ────────────────────────── */}
        {/* 풀스크린 flex 마지막 자식 — onSend로 sendInquiry 래퍼 전달 */}
        <DmComposer circleId={circleId} onSend={handleSend} />
      </div>
    </>
  );
}
