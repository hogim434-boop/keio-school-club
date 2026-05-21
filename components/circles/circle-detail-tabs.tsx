"use client";

/**
 * CircleDetailTabs — 상세 페이지 「ホーム / 掲示板」 controlled Tabs (Client Component).
 *
 * 왜 Client 인가:
 * - Radix Tabs 자체는 Client. uncontrolled (defaultValue) 면 RSC 안에서 직접 써도 OK.
 * - 단, 「もっと見る」 클릭으로 외부 트리거 탭 전환이 필요 → useState + controlled value 필요.
 *
 * RSC children-as-prop 패턴:
 * - homeContent (SummaryGrid + Description) 는 부모 (page.tsx RSC) 에서 만들어진 Server Component 그대로 전달.
 * - 자식 콘텐츠는 cacheComponents Suspense 안에서 정상 렌더링됨.
 *
 * 탭 트랙 슬라이드 (iOS 캐러셀 스타일):
 * - 두 TabsContent 를 가로로 나란히 배치한 "트랙" 구조. home → x=0, board → x=-width.
 * - useMotionValue(x) + ResizeObserver(width) 로 트랙을 손가락/탭 클릭 따라 슬라이드.
 * - tab state 가 단일 진실원천. x 는 파생값 — tab 변경 시 useEffect 가 animate 로 동기화.
 * - onDragEnd: 거리(>30%) 또는 속도(>500px/s) 임계 초과 시 탭 전환, 미달 시 원위치 스냅.
 * - prefers-reduced-motion 시 drag 비활성, x.set 으로 즉시 전환 (접근성).
 *
 * touch-action 주의 (캐러셀 가로 스크롤과의 충돌):
 * - 트랙에 touch-action: pan-y 를 주면 그 자식인 캐러셀(overflow-x-auto)에서
 *   가로 터치 패닝이 브라우저 레벨에서 차단된다 (touch-action 은 조상 체인을 따라 교차 평가됨).
 * - 그래서 트랙은 touch-action 을 따로 설정하지 않는다(auto).
 *   캐러셀 바깥 영역엔 가로 스크롤 컨테이너가 없으므로, 가로 드래그는 motion 이 그대로 처리하고
 *   세로 스크롤은 페이지로 정상 전파된다. dragListener={false} 라 motion 도 인라인 touch-action 을 걸지 않음.
 *
 * 캐러셀 가로 스크롤 충돌 해결:
 * - dragListener={false} + useDragControls 조합.
 * - onPointerDown 에서 "[data-tab-carousel]" 내부 시작 여부를 검사.
 * - 캐러셀 위 → dragControls.start() 미호출 → native 가로 스크롤 동작.
 * - 캐러셀 밖 → dragControls.start(e) 호출 → 탭 트랙 드래그 시작.
 *
 * 활동 상세 → 뒤로가기 복귀 시 「掲示板」 탭 활성화:
 * - 활동 상세 template 이 router.back() 직전 sessionStorage 에 DETAIL_RETURN_TAB_FLAG="board" set.
 * - 본 컴포넌트가 mount 시 flag 확인 → 「掲示板」 으로 초기 setTab.
 * - flag 는 useEffect 안에서 자동 제거 안 함. 사용자가 탭 직접 클릭 (handleValueChange) 시점에 제거.
 *   이유: cacheComponents + Suspense streaming 환경에서 컴포넌트가 여러 차례 mount/unmount 반복되는데,
 *   첫 mount 가 flag 를 소비/삭제하면 후속 mount 가 default home 으로 다시 초기화되어 동작 실패.
 *
 * 패널 높이:
 * - items-start 로 각 패널이 자연 높이를 유지. 탭 전환 시 viewport 높이 점프 허용 (1차 구현).
 * - 거슬리면 viewport height 를 활성 패널 높이로 animate 하는 후속 보완 가능.
 */

import { useEffect, useRef, useState } from "react";
import {
  LazyMotion,
  domMax,
  m,
  useReducedMotion,
  useMotionValue,
  animate,
  useDragControls,
  type PanInfo,
} from "motion/react";

import { DETAIL_RETURN_TAB_FLAG } from "@/app/circles/[id]/reports/[reportId]/template";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActivityReportsList } from "@/components/circles/activity-reports-list";
import { ActivityReportsPreview } from "@/components/circles/activity-reports-preview";
import type { ActivityReport } from "@/lib/types/domain";

interface CircleDetailTabsProps {
  /** 서클 ID — ActivityReportsList + ActivityReportsPreview 에 전달 */
  circleId: string;
  /** 해당 서클의 전체 활동 리포트 (최신순 정렬된 상태) */
  reports: ActivityReport[];
  /** 「ホーム」 탭에 표시할 콘텐츠 — SummaryGrid + Description (Server Component children) */
  homeContent: React.ReactNode;
}

type TabValue = "home" | "board";

/**
 * 탭 전환 임계값.
 * - 거리: 컨테이너 너비의 30% 이상 drag 시 전환.
 * - 속도: 500px/s 이상 빠른 flick 시 거리 무관 전환 (swipe-card.tsx 와 동일 임계).
 */
const VELOCITY_THRESHOLD = 500;
const DISTANCE_RATIO_THRESHOLD = 0.3;

/** iOS 캐러셀 스타일 easing — 프로젝트 전체 통일 (swipe-card.tsx, template.tsx 와 동일) */
const IOS_EASE: [number, number, number, number] = [0.32, 0.72, 0, 1];

export function CircleDetailTabs({ circleId, reports, homeContent }: CircleDetailTabsProps) {
  const [tab, setTab] = useState<TabValue>("home");
  const prefersReducedMotion = useReducedMotion();

  // ── Motion / 드래그 관련 ──────────────────────────────────────────────────
  // x: 트랙(두 패널을 나란히 배치한 div)의 translateX. home=0, board=-width.
  const x = useMotionValue(0);

  // width: 뷰포트(overflow-hidden div) 의 실제 픽셀 너비. ResizeObserver 로 측정.
  // 0 이면 첫 측정 전이므로 트랙 폭은 "200%" fallback 사용.
  const [width, setWidth] = useState(0);

  // 뷰포트 div 에 연결해 ResizeObserver 로 너비를 측정한다.
  const containerRef = useRef<HTMLDivElement | null>(null);

  // 첫 동기화 여부 — 첫 ResizeObserver 콜백 후 x.set 으로 즉시 배치.
  // animation 없이 즉시 설정해야 초기 렌더에서 board 탭이 화면 밖으로 정확히 배치된다.
  const isFirstSync = useRef(true);

  // useDragControls: dragListener={false} 와 조합해 onPointerDown 에서 수동으로 드래그 시작.
  // 덕분에 캐러셀 위 포인터는 dragControls.start() 를 호출하지 않아 native 스크롤로 fallback.
  const dragControls = useDragControls();

  // ── ResizeObserver — 뷰포트 너비 측정 ────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      const newWidth = entries[0]?.contentRect.width ?? 0;
      if (newWidth > 0) {
        setWidth(newWidth);
      }
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── tab ↔ x 동기화 ────────────────────────────────────────────────────────
  // tab 또는 width 가 바뀔 때마다 x 를 target 위치로 이동.
  // - 첫 동기화 (isFirstSync) 또는 reduced-motion: x.set() 즉시 설정.
  // - 그 외: animate() 로 iOS easing 슬라이드.
  useEffect(() => {
    // width=0 이면 아직 측정 전 — 측정 완료(width>0) 후 다시 실행됨
    if (width === 0) return;

    const target = tab === "home" ? 0 : -width;

    if (isFirstSync.current || prefersReducedMotion) {
      // 첫 측정 직후 or 접근성 모드: 애니메이션 없이 즉시 배치
      x.set(target);
      isFirstSync.current = false;
    } else {
      animate(x, target, { ease: IOS_EASE, duration: 0.35 });
    }
    // animate 와 x 는 stable 참조라 dependency 에서 생략해도 안전.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, width, prefersReducedMotion]);

  // ── sessionStorage 복귀 — 활동 상세 → 뒤로가기 시 「掲示板」 탭 복귀 ────
  // 자세한 동작 원리는 파일 상단 docstring 참조.
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(DETAIL_RETURN_TAB_FLAG);
      if (saved === "board" || saved === "home") {
        setTab(saved);
      }
    } catch {
      // sessionStorage 접근 차단 환경 (private mode 등) — 기본 home 유지
    }
  }, []);

  // ── 이벤트 핸들러 ─────────────────────────────────────────────────────────

  // 사용자가 탭을 직접 변경한 시점에만 sessionStorage flag 제거 → 다음 페이지 진입 시 default 동작 복귀.
  function handleValueChange(value: string) {
    setTab(value as TabValue);
    try {
      sessionStorage.removeItem(DETAIL_RETURN_TAB_FLAG);
    } catch {
      // 무시 — flag 없어도 default 동작
    }
  }

  // 「もっと見る」 클릭 → 「掲示板」 탭. handleValueChange 경유로 flag 제거까지 일관 처리.
  function handleMoreClick() {
    handleValueChange("board");
  }

  /**
   * drag end 핸들러 — 거리(>30%) 또는 속도(>500px/s) 임계 초과 시 탭 전환, 미달 시 원위치 스냅.
   *
   * 통과 + 방향 일치 → setTab(next): tab↔x 동기화 effect 가 자동으로 슬라이드.
   * 통과 + 방향 불일치 (현재 탭 방향으로 더 끌어당긴 경우) → 원위치 스냅.
   * 미달 → 원위치 스냅.
   */
  function handleDragEnd(_e: unknown, info: PanInfo) {
    const passed =
      Math.abs(info.offset.x) > width * DISTANCE_RATIO_THRESHOLD ||
      Math.abs(info.velocity.x) > VELOCITY_THRESHOLD;

    const currentTarget = tab === "home" ? 0 : -width;

    if (passed && info.offset.x < 0 && tab === "home") {
      // 왼쪽으로 충분히 drag → board 전환 (effect 가 x 를 -width 로 슬라이드)
      setTab("board");
    } else if (passed && info.offset.x > 0 && tab === "board") {
      // 오른쪽으로 충분히 drag → home 전환 (effect 가 x 를 0 으로 슬라이드)
      setTab("home");
    } else {
      // 임계 미달 or 방향 불일치 → 현재 탭 위치로 원위치 스냅
      animate(x, currentTarget, { duration: 0.3, ease: IOS_EASE });
    }
  }

  /**
   * onPointerDown 게이팅 — 캐러셀 내부에서 시작한 포인터는 탭 드래그를 시작하지 않는다.
   *
   * "[data-tab-carousel]" closest 검사:
   * - 캐러셀 안 → dragControls.start() 미호출 → motion 드래그 비활성 → native 가로 스크롤 동작.
   * - 캐러셀 밖 → dragControls.start(e) 호출 → 탭 트랙 드래그 시작.
   *
   * prefersReducedMotion 시에는 drag={false} 이므로 dragControls.start() 가 no-op.
   * 그래도 early return 해 불필요한 호출을 막는다.
   */
  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (prefersReducedMotion) return;
    if ((e.target as HTMLElement).closest("[data-tab-carousel]")) return;
    dragControls.start(e);
  }

  return (
    <Tabs value={tab} onValueChange={handleValueChange} className="w-full">
      <TabsList variant="line" className="w-full justify-start border-b">
        <TabsTrigger
          value="home"
          className="data-[state=active]:text-keio-navy data-[state=active]:after:bg-keio-navy"
        >
          ホーム
        </TabsTrigger>
        <TabsTrigger
          value="board"
          className="data-[state=active]:text-keio-navy data-[state=active]:after:bg-keio-navy"
        >
          掲示板
        </TabsTrigger>
      </TabsList>

      {/*
       * 트랙 구조:
       * - overflow-hidden div: 뷰포트. 폭 측정용 containerRef 연결.
       * - m.div (트랙): 두 패널을 가로로 나란히 배치. width = 뷰포트 * 2 (or "200%").
       *   translateX(x) 로 좌우 이동. drag="x" + dragControls 로 수동 제스처 시작.
       * - 각 패널 div (w-1/2 shrink-0): 뷰포트와 동일한 너비. 각각 home / board 콘텐츠 담음.
       *
       * forceMount: 두 패널이 항상 DOM 에 유지돼야 트랙이 가로로 이어진다.
       *   비활성 패널은 inert + aria-hidden 으로 AT(보조기술) / 포커스에서 차단.
       *
       * dragListener={false}: 트랙 m.div 자체가 pointer listener 를 자동 등록하지 않음.
       *   onPointerDown 에서 캐러셀 게이팅 후 dragControls.start(e) 로 수동 시작.
       *
       * touch-action 미설정(auto): 자식 캐러셀의 가로 스크롤을 막지 않기 위함 (상단 docstring 참조).
       */}
      <LazyMotion features={domMax}>
        <div ref={containerRef} className="overflow-hidden">
          <m.div
            className="flex items-start"
            style={{ x, width: width > 0 ? width * 2 : "200%" }}
            drag={prefersReducedMotion ? false : "x"}
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ left: -width, right: 0 }}
            dragElastic={0.15}
            onDragEnd={handleDragEnd}
            onPointerDown={handlePointerDown}
          >
            {/*
             * ホーム 패널 — 비활성 시 inert + aria-hidden 으로 AT·포커스 차단.
             * forceMount 로 항상 DOM 에 존재하므로 접근성 처리 필수.
             *
             * inert: React 19 / @types/react 19 에서 boolean 으로 지원.
             * 비활성 패널의 키보드 포커스·보조기술 접근을 차단. aria-hidden 과 병행해 호환성 확보.
             */}
            <div
              className="w-1/2 shrink-0"
              inert={tab !== "home" || undefined}
              aria-hidden={tab !== "home"}
            >
              <TabsContent value="home" forceMount className="space-y-6 pt-6">
                {homeContent}
                <ActivityReportsPreview
                  circleId={circleId}
                  reports={reports.slice(0, 5)}
                  onMoreClick={handleMoreClick}
                />
              </TabsContent>
            </div>

            {/*
             * 掲示板 패널 — 비활성 시 inert + aria-hidden 으로 AT·포커스 차단.
             */}
            <div
              className="w-1/2 shrink-0"
              inert={tab !== "board" || undefined}
              aria-hidden={tab !== "board"}
            >
              <TabsContent value="board" forceMount className="pt-6">
                <ActivityReportsList circleId={circleId} reports={reports} />
              </TabsContent>
            </div>
          </m.div>
        </div>
      </LazyMotion>
    </Tabs>
  );
}
