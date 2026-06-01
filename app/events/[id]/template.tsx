"use client";

import { createContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { LazyMotion, domAnimation, m } from "motion/react";

/**
 * 이벤트 상세 페이지 전환 애니메이션 — iOS Push 패턴 (우측 슬라이드 인 + opacity fade) + 슬라이드 아웃.
 *
 * 설계:
 * - 동아리 상세 (/circles/[id]/template.tsx) 와 동일한 iOS Push 슬라이드 패턴.
 * - 단순화: fadeUpEntry / same-URL re-enter / navigate 액션 / /edit 가드 제거
 *   (이벤트 상세에는 해당 사용처가 모두 없음).
 *
 * fixed 함정 ([[circle-detail-template-fixed-trap]]) 회피 검증:
 * - EventRsvpPill 은 createPortal(document.body) 로 마운트되어
 *   본 template 의 transform 컨테이닝 블록 영향을 받지 않음 ✅
 * - 자식 풀스크린 라우트 없음 ✅
 *
 * STALE STATE 회피:
 * - Next.js + cacheComponents 환경에서 router.back() 으로 빠져나간 뒤 같은 URL 로 재진입할 때
 *   template 인스턴스가 unmount 되지 않고 살아있는 케이스 확인됨.
 * - 해결: mount 시점에 setExiting(false) 강제 reset + router.back() 중복 호출 방지 ref.
 */

/**
 * 슬라이드 아웃 트리거 — EventDetailHero 의 「戻る」 버튼이 useContext 로 호출.
 * 동아리 template 과 달리 navigate 액션이 없음 (자식 라우트 미존재).
 */
export const SlideOutContext = createContext<() => void>(() => {});

export default function EventDetailTemplate({ children }: { children: ReactNode }) {
  const router = useRouter();

  // 모션 활성 여부 — prefers-reduced-motion 확인 후 설정
  const [animationEnabled, setAnimationEnabled] = useState(true);

  // 슬라이드 아웃 진행 중 여부 — true 로 바뀌면 m.div 가 우측으로 빠져나감
  const [exiting, setExiting] = useState(false);

  // router.back() 중복 호출 방지 — onAnimationComplete 가 cleanup 시점에 한 번 더 발화하는 케이스
  const backCalledRef = useRef(false);

  // mount 시점 stale state reset — 인스턴스가 재사용되어 exiting=true 가 보존된 케이스 회피
  useEffect(() => {
    setExiting(false);
    backCalledRef.current = false;
  }, []);

  // prefers-reduced-motion 감지 — 모션 비활성 사용자에게는 래퍼 없이 즉시 노출 (WCAG SC 2.3.3)
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) setAnimationEnabled(false);
  }, []);

  // 모션 비활성 사용자: m.div 래퍼 skip → 즉시 노출, 뒤로가기는 router.back() 직접 호출
  if (!animationEnabled) {
    return (
      <SlideOutContext.Provider
        value={() => {
          router.back();
        }}
      >
        {children}
      </SlideOutContext.Provider>
    );
  }

  return (
    <LazyMotion features={domAnimation}>
      <m.div
        // 우측에서 슬라이드 인 (진입) — iOS Push Navigation 진입 패턴
        initial={{ x: "100%", opacity: 0 }}
        // exiting=true 가 되면 우측으로 슬라이드 아웃
        animate={exiting ? { x: "100%", opacity: 0 } : { x: 0, opacity: 1 }}
        // iOS UINavigationController push easing — cubic-bezier(0.32, 0.72, 0, 1)
        // spring 의 underdamped 진동(떨림) 회피 + 애플 native navigation 과 동일한 감속 곡선
        transition={{ type: "tween", duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
        onAnimationComplete={() => {
          // 슬라이드 아웃 완료 후 router.back() 호출 — 중복 호출 방지 ref 로 가드
          if (exiting && !backCalledRef.current) {
            backCalledRef.current = true;
            router.back();
          }
        }}
        className="will-change-transform"
      >
        <SlideOutContext.Provider
          value={() => {
            // 「戻る」 버튼 등이 호출 → exiting=true 로 슬라이드 아웃 트랜지션 시작
            setExiting(true);
          }}
        >
          {children}
        </SlideOutContext.Provider>
      </m.div>
    </LazyMotion>
  );
}
