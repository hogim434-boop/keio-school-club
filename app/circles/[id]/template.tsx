"use client";

import { createContext, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LazyMotion, domAnimation, m } from "motion/react";

import { CIRCLE_REENTER_EVENT } from "@/components/circles/circle-card-link";
import { DETAIL_FADE_UP_FLAG } from "@/app/circles/[id]/reports/[reportId]/template";

/**
 * 슬라이드 아웃 액션 타입 — back (뒤로가기) 또는 navigate (새 URL 로 push 이동).
 * navigate 는 활동 리포트 상세 등 내부 페이지로 트랜지션할 때 사용.
 */
export type DetailExitAction = { kind: "back" } | { kind: "navigate"; url: string };

/**
 * 슬라이드 아웃 트리거 — DetailPageHeader 의 「戻る」 버튼 + ActivityReportsList row 가 useContext 로 호출.
 */
export const SlideOutContext = createContext<(action: DetailExitAction) => void>(() => {});

/**
 * 서클 상세 페이지 전환 애니메이션 — iOS Push 패턴 (우측 슬라이드 인 + opacity fade) + 슬라이드 아웃.
 *
 * 설계:
 * - 같은 카드 재진입 (same-URL click) 은 Next.js Link 가 no-op 처리하여 navigation 미발화 →
 *   CircleCardLink 가 CustomEvent 발화 → 본 컴포넌트가 listen → setAnimKey 토글로 m.div key 변경
 *   → motion node 강제 re-mount → entry 재실행.
 * - exit 는 setExiting(true) 로 animate 값 변경 → motion transition → onAnimationComplete → router.back().
 * - prefers-reduced-motion 사용자는 m.div skip → 즉시 노출 (WCAG SC 2.3.3).
 *
 * STALE STATE 회피:
 * - Next.js 16 + cacheComponents:true 환경에서 router.back() 으로 빠져나간 뒤 같은 URL 로 재진입할 때
 *   template 인스턴스가 unmount 되지 않고 살아있는 케이스 확인됨. 그 결과 setExiting(true) 가
 *   다음 진입에서도 보존되어 m.div 가 off-screen 상태로 마운트 → entry animation 즉시 complete →
 *   onAnimationComplete 가 router.back() 즉시 재호출 → 사용자에게는 "안 들어가짐" 으로 보임.
 * - 해결: mount 시점에 setExiting(false) 강제 reset + router.back() 중복 호출 방지 ref.
 */
export default function CircleDetailTemplate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [animationEnabled, setAnimationEnabled] = useState(true);
  const [exiting, setExiting] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  /**
   * 활동 상세 페이지에서 「뒤로가기」 로 진입했을 때만 true.
   * sessionStorage flag (DETAIL_FADE_UP_FLAG) 기반으로 mount useEffect 에서 1회 set.
   * true 면 m.div 가 페이드 업 (opacity + y) 으로 진입, 아니면 기본 우측 슬라이드 인.
   */
  const [fadeUpEntry, setFadeUpEntry] = useState(false);
  // router.back() 중복 호출 방지 — onAnimationComplete 가 cleanup 시점에 한 번 더 발화하는 케이스
  const backCalledRef = useRef(false);

  // 마지막으로 요청된 액션 저장 — onAnimationComplete 에서 back/navigate 분기에 사용
  const exitActionRef = useRef<DetailExitAction | null>(null);

  // mount 시점 stale state reset — 인스턴스가 재사용되어 exiting=true 가 보존된 케이스 회피
  // + 활동 상세에서 뒤로가기로 들어왔는지 sessionStorage flag 확인 → fade-up 진입 분기
  useEffect(() => {
    setExiting(false);
    backCalledRef.current = false;
    exitActionRef.current = null;

    try {
      if (sessionStorage.getItem(DETAIL_FADE_UP_FLAG) === "1") {
        sessionStorage.removeItem(DETAIL_FADE_UP_FLAG);
        setFadeUpEntry(true);
        // m.div 강제 재마운트 → 새 initial (opacity 0 + y:20) 로 시작
        setAnimKey((k) => k + 1);
      }
    } catch {
      // sessionStorage 접근 차단 환경 (private mode 등) — 기본 슬라이드 인 사용
    }
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) setAnimationEnabled(false);
  }, []);

  // CircleCardLink 의 same-URL click CustomEvent 신호 수신 → animKey 토글
  useEffect(() => {
    const handler = () => setAnimKey((k) => k + 1);
    window.addEventListener(CIRCLE_REENTER_EVENT, handler);
    return () => window.removeEventListener(CIRCLE_REENTER_EVENT, handler);
  }, []);

  // 편집 페이지(/circles/{id}/edit)는 AuthScreen `fixed inset-0` 풀스크린 폼이다.
  // 상세 전환 모션의 `will-change-transform` + transform 래퍼가 fixed 의 containing block 을
  // 만들어 폼이 0높이로 붕괴되므로, 편집 경로에서는 모션 래퍼 없이 children 만 그대로 렌더한다.
  //
  // DM 문의 페이지(/circles/{id}/dm 및 하위 스레드 /dm/*)도 동일한 이유로 제외한다.
  // inquiry-form 과 스레드 페이지가 fixed 레이아웃을 사용하므로, motion.div 의
  // will-change-transform + transform 이 containing block 이 되어 페이지 높이가 0으로 붕괴됨.
  //
  // (hooks 는 위에서 모두 호출했으므로 이 조건부 return 은 hooks 규칙을 위반하지 않는다)
  if (pathname?.endsWith("/edit") || pathname?.includes("/dm") || pathname?.endsWith("/claim")) {
    return <>{children}</>;
  }

  if (!animationEnabled) {
    return (
      <SlideOutContext.Provider
        value={(action: DetailExitAction) => {
          // reduced-motion — 트랜지션 없이 즉시 이동
          if (action.kind === "navigate") router.push(action.url);
          else router.back();
        }}
      >
        {children}
      </SlideOutContext.Provider>
    );
  }

  return (
    <LazyMotion features={domAnimation}>
      <m.div
        // animKey 변경 시 motion node 강제 re-mount → initial→animate transition 자동 발화
        key={animKey}
        // fadeUpEntry: 활동 상세 뒤로가기 진입 → 페이드 업 / 그 외: 우측 슬라이드 인
        initial={fadeUpEntry ? { opacity: 0, y: 20 } : { x: "100%", opacity: 0 }}
        animate={
          exiting
            ? exitActionRef.current?.kind === "navigate"
              ? { x: "-100%", opacity: 0 } // navigate (활동 상세 등): 좌측으로 빠짐
              : { x: "100%", opacity: 0 } // back (뒤로가기): 우측으로 빠짐 (기존 유지)
            : fadeUpEntry
              ? { opacity: 1, y: 0 } // 페이드 업 진입 — 위치 유지하며 y 만 0 으로
              : { x: 0, opacity: 1 } // 기본 우측 슬라이드 인
        }
        // iOS UINavigationController push easing — cubic-bezier(0.32, 0.72, 0, 1).
        // spring 의 underdamped 진동(떨림) 회피 + 애플 native navigation 과 동일한 감속 곡선.
        transition={{ type: "tween", duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
        onAnimationComplete={() => {
          if (exiting && !backCalledRef.current) {
            backCalledRef.current = true;
            const action = exitActionRef.current;
            // navigate 액션이면 새 URL 로 push, 그 외 (back 또는 null) 는 router.back()
            if (action?.kind === "navigate") {
              router.push(action.url);
            } else {
              router.back();
            }
          }
        }}
        className="will-change-transform"
      >
        <SlideOutContext.Provider
          value={(action: DetailExitAction) => {
            exitActionRef.current = action;
            setExiting(true);
          }}
        >
          {children}
        </SlideOutContext.Provider>
      </m.div>
    </LazyMotion>
  );
}
