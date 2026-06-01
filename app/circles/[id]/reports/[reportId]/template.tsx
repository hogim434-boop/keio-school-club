"use client";

import { createContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LazyMotion, domAnimation, m } from "motion/react";

/**
 * 활동 리포트 상세 페이지 슬라이드 아웃 트리거.
 * 이 페이지에서는 back 만 지원 (단순 () => void).
 */
export const ReportSlideOutContext = createContext<() => void>(() => {});

/**
 * 부모 [id]/template.tsx 가 mount 시 읽는 sessionStorage 키.
 * 활동 상세 → 뒤로가기 시점에 set, 부모 mount 시 1회 소비 후 삭제.
 * 부모가 「뒤로가기로 들어왔다」 는 신호 → fade-up 진입 모션 적용.
 */
export const DETAIL_FADE_UP_FLAG = "kc-detail-fade-up";

/**
 * CircleDetailTabs 가 mount 시 읽는 sessionStorage 키.
 * 활동 상세 → 뒤로가기 시점에 "album" set, CircleDetailTabs mount 시 1회 소비.
 * 활동 상세에서 돌아오면 항상 「アルバム」 탭이 활성화된 상태로 노출.
 */
export const DETAIL_RETURN_TAB_FLAG = "kc-circle-detail-return-tab";

/**
 * 활동 리포트 상세 페이지 전환 애니메이션.
 *
 * - 진입: opacity 0 → 1 (제자리 페이드 인)
 * - 이탈 (뒤로가기): x 0 → 100% + opacity 1 → 0 (우측 슬라이드 아웃) → router.back()
 * - 뒤로가기 직전 sessionStorage 에 flag set → 부모 [id]/template.tsx 가 페이드 업 진입
 * - easing: 진입 easeOut(페이드 자연), 이탈 iOS push cubic-bezier(슬라이드 자연)
 *
 * ⚠️ 이탈 시 transform (x) 을 쓰므로 자식 position:fixed 의 containing block 영향.
 * → 상단 헤더(ReportDetailHeader)는 fixed 대신 sticky top-0 으로 구현해 이 함정을 회피하고,
 *   이탈 애니메이션 시 본문과 함께 자연스럽게 슬라이드된다.
 *
 * Context 는 별개 (ReportSlideOutContext) — 이 페이지는 back 만 지원.
 */
export default function ReportTemplate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [exiting, setExiting] = useState(false);
  // router.back() 중복 호출 방지 — onAnimationComplete 가 cleanup 시점에 한 번 더 발화하는 케이스
  const backCalledRef = useRef(false);

  // mount 시점 stale state reset — cacheComponents:true 환경에서 인스턴스 재사용 대비
  useEffect(() => {
    setExiting(false);
    backCalledRef.current = false;
  }, []);

  return (
    <LazyMotion features={domAnimation}>
      <m.div
        // 진입은 제자리 페이드 인, 이탈은 우측 슬라이드 + 페이드 아웃
        initial={{ opacity: 0 }}
        animate={exiting ? { x: "100%", opacity: 0 } : { x: 0, opacity: 1 }}
        transition={{
          duration: exiting ? 0.35 : 0.3,
          ease: exiting ? [0.32, 0.72, 0, 1] : "easeOut",
        }}
        onAnimationComplete={() => {
          if (exiting && !backCalledRef.current) {
            backCalledRef.current = true;
            // 부모 [id]/template.tsx 에게 「뒤로가기로 들어옴」 신호 전달
            // → 부모가 mount 시 이 flag 확인 후 페이드 업 진입 모션 적용
            try {
              sessionStorage.setItem(DETAIL_FADE_UP_FLAG, "1");
              // 뒤로 가서 부모 페이지에 도착 시 「アルバム」 탭이 활성화된 상태로 노출되도록 신호
              sessionStorage.setItem(DETAIL_RETURN_TAB_FLAG, "album");
            } catch {
              // sessionStorage 접근 차단 환경 (private mode 등) — 무시, 기본 진입 모션 사용
            }
            router.back();
          }
        }}
        className="will-change-transform"
      >
        <ReportSlideOutContext.Provider value={() => setExiting(true)}>
          {children}
        </ReportSlideOutContext.Provider>
      </m.div>
    </LazyMotion>
  );
}
