"use client";

/**
 * CircleDetailTabs — 상세 페이지 「ホーム / 掲示板 / アルバム」 controlled Tabs (Client Component).
 *
 * 왜 Client 인가:
 * - Radix Tabs 자체는 Client. uncontrolled (defaultValue) 면 RSC 안에서 직접 써도 OK.
 * - 단, 「もっと見る」 클릭으로 외부 트리거 탭 전환이 필요 → useState + controlled value 필요.
 *
 * RSC children-as-prop 패턴:
 * - homeContent (SummaryGrid + Description) 는 부모 (page.tsx RSC) 에서 만들어진 Server Component 그대로 전달.
 * - albumContent (CircleAlbum) 도 부모에서 생성해 전달.
 * - 자식 콘텐츠는 cacheComponents Suspense 안에서 정상 렌더링됨.
 *
 * 탭 트랙 슬라이드 (iOS 캐러셀 스타일):
 * - 세 TabsContent 를 가로로 나란히 배치한 "트랙" 구조.
 *   TAB_ORDER = ["home","board","album"] → target = -(index * width).
 * - 탭 전환은 "탭 클릭 / 「もっと見る」" 로만 한다(스와이프 제거).
 * - tab state 가 단일 진실원천. x 는 파생값 — tab 변경 시 useEffect 가 animate 로 슬라이드.
 * - prefers-reduced-motion 시 x.set 으로 즉시 전환 (접근성).
 *
 * 활동 상세 → 뒤로가기 복귀 시 「掲示板」 탭 활성화:
 * - 활동 상세 template 이 router.back() 직전 sessionStorage 에 DETAIL_RETURN_TAB_FLAG="board" set.
 * - 본 컴포넌트가 mount 시 flag 확인 → 「掲示板」 으로 초기 setTab.
 * - flag 는 useEffect 안에서 자동 제거 안 함. 사용자가 탭 직접 클릭 (handleValueChange) 시점에 제거.
 *   이유: cacheComponents + Suspense streaming 환경에서 컴포넌트가 여러 차례 mount/unmount 반복되는데,
 *   첫 mount 가 flag 를 소비/삭제하면 후속 mount 가 default home 으로 다시 초기화되어 동작 실패.
 *
 * 패널 높이:
 * - items-start 로 각 패널이 자연 높이를 유지. 탭 전환 시 viewport 높이가 활성 패널 높이로 전환.
 * - panelHeights { home, board, album } 세 패널 모두 측정.
 */

import { useEffect, useRef, useState } from "react";
import {
  LazyMotion,
  domAnimation,
  m,
  useReducedMotion,
  useMotionValue,
  animate,
} from "motion/react";

import { DETAIL_RETURN_TAB_FLAG } from "@/app/circles/[id]/reports/[reportId]/template";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActivityReportsList } from "@/components/circles/activity-reports-list";
import { ActivityReportsPreview } from "@/components/circles/activity-reports-preview";
import { ReportComposeSheet } from "@/components/circles/report-compose-sheet";
import type { ActivityReport } from "@/lib/types/domain";
import { cn } from "@/lib/utils";

interface CircleDetailTabsProps {
  /** 서클 ID — ActivityReportsList + ActivityReportsPreview 에 전달 */
  circleId: string;
  /** 해당 서클의 전체 활동 리포트 (최신순 정렬된 상태) */
  reports: ActivityReport[];
  /** 「ホーム」 탭에 표시할 콘텐츠 — SummaryGrid + Description (Server Component children) */
  homeContent: React.ReactNode;
  /** 「ホーム」 탭 맨 아래(활동 리포트 미리보기 뒤)에 표시할 콘텐츠 — 관련 동아리 등 */
  relatedContent?: React.ReactNode;
  /**
   * 소유자 여부 — true 이면 「掲示板」 탭 상단에 「＋ 投稿する」 버튼 표시.
   * 서버에서 getClaims() + owner_id 비교로 계산 후 전달.
   */
  isOwner?: boolean;
  /** 「アルバム」 탭에 표시할 콘텐츠 — CircleAlbum (부모 RSC 에서 생성해 전달) */
  albumContent?: React.ReactNode;
}

/** 탭 순서 — index 를 x 계산에 사용. board=1 이므로 DETAIL_RETURN_TAB_FLAG 로직 불변. */
const TAB_ORDER = ["home", "board", "album"] as const;

type TabValue = (typeof TAB_ORDER)[number];

/** iOS 캐러셀 스타일 easing — 프로젝트 전체 통일 (swipe-card.tsx, template.tsx 와 동일) */
const IOS_EASE: [number, number, number, number] = [0.32, 0.72, 0, 1];

export function CircleDetailTabs({
  circleId,
  reports,
  homeContent,
  relatedContent,
  isOwner = false,
  albumContent,
}: CircleDetailTabsProps) {
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

  // 각 패널의 높이 — 세 패널 콘텐츠 길이가 다르므로 뷰포트 높이를 활성 패널 높이에 맞춰야 한다.
  // 안 그러면 짧은 탭에서도 뷰포트가 긴 home 높이를 유지해 캐러셀이 빈 영역으로 삐져나와 보인다.
  const homePanelRef = useRef<HTMLDivElement | null>(null);
  const boardPanelRef = useRef<HTMLDivElement | null>(null);
  const albumPanelRef = useRef<HTMLDivElement | null>(null);
  const [panelHeights, setPanelHeights] = useState({ home: 0, board: 0, album: 0 });

  // ── ResizeObserver — 뷰포트 너비 + 패널 높이 측정 ────────────────────────
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

  // 패널 높이 측정 — 세 패널을 함께 관찰하다 콘텐츠 변동(이미지 로드 등) 시 갱신.
  useEffect(() => {
    const homeEl = homePanelRef.current;
    const boardEl = boardPanelRef.current;
    const albumEl = albumPanelRef.current;
    if (!homeEl || !boardEl || !albumEl) return;

    const ro = new ResizeObserver(() => {
      setPanelHeights({
        home: homeEl.offsetHeight,
        board: boardEl.offsetHeight,
        album: albumEl.offsetHeight,
      });
    });

    ro.observe(homeEl);
    ro.observe(boardEl);
    ro.observe(albumEl);
    return () => ro.disconnect();
  }, []);

  // 활성 패널 높이 — 뷰포트 height 에 적용. 측정 전(0)이면 undefined → auto 높이 fallback.
  const activeHeight = panelHeights[tab];

  // ── tab ↔ x 동기화 ────────────────────────────────────────────────────────
  // tab 또는 width 가 바뀔 때마다 x 를 target 위치로 이동.
  // - 첫 동기화 (isFirstSync) 또는 reduced-motion: x.set() 즉시 설정.
  // - 그 외: animate() 로 iOS easing 슬라이드.
  useEffect(() => {
    // width=0 이면 아직 측정 전 — 측정 완료(width>0) 후 다시 실행됨
    if (width === 0) return;

    // TAB_ORDER 인덱스 기반 일반화 — home=0, board=1, album=2
    const target = -(TAB_ORDER.indexOf(tab) * width);

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

  return (
    <Tabs value={tab} onValueChange={handleValueChange} className="w-full">
      {/*
       * TabsList 스타일 개선 — 트랙/드래그 로직은 아래 LazyMotion 블록에서 완전히 분리되므로 영향 없음.
       * - 활성 탭: text-keio-navy + 굵은 언더라인(h-[3px], rounded-full)
       * - 비활성 탭: text-muted-foreground
       * - font-semibold + px-5 pt-4 pb-3 으로 탭 패딩/굵기 강화
       * after:h-[3px]: 기본 after:h-0.5(2px) 를 3px 로 오버라이드해 언더라인 두껍게
       * after:rounded-full: 언더라인 양 끝 둥글게
       *
       * sticky 고정 (스크롤 시 탭 바가 상단 유지):
       * - sticky top-0 z-30 bg-background: 탭 위치까지 스크롤하면 상단에 붙어 항상 보임.
       *   (상세 페이지는 글로벌 헤더가 숨겨져 있어 top-0 = viewport 최상단)
       * - -mx-4 w-[calc(100%+2rem)] px-4: 부모 px-4 컨테이너를 넘어 bg 가 좌우 끝까지 full-bleed.
       *   (w-full=콘텐츠폭이라 -mx-4 만으론 우측 32px 부족 → calc 로 보충해 비침 방지)
       * - pt-[env(safe-area-inset-top)]: notch 기기에서만 상단 inset 만큼 더 띄움(브라우저는 0).
       */}
      <TabsList
        variant="line"
        className="bg-background sticky top-0 z-30 -mx-4 w-[calc(100%+2rem)] justify-start border-b px-4 pt-[env(safe-area-inset-top)] pb-0 group-data-[orientation=horizontal]/tabs:h-auto"
      >
        <TabsTrigger
          value="home"
          className={cn(
            // 탭 바 높이 키우기 — shadcn 기본값이 group-data 복합 variant 라 같은 접두사로 override.
            // - h-auto: 트리거 고정 높이(h-[calc(100%-1px)]) 해제 → pt/pb 가 실제 높이에 반영.
            // - group-data-[orientation=horizontal]/tabs:after:bottom-0: 언더라인을 기본 -5px → 트리거 바닥
            //   (= 회색 border-b 위)으로 끌어올려 글자 밑에 붙임(따로 안 뜨게).
            // - pt-4 pb-3: 살짝 줄인 높이.
            // - after:bottom-[-2px]: 언더라인을 회색 하단 보더 위로 정확히 내려 일치시킴
            //   (트리거 투명 보더 오프셋 보정 — Playwright 실측으로 맞춤).
            "h-auto px-5 pt-4 pb-3 text-base font-semibold group-data-[orientation=horizontal]/tabs:after:bottom-[-2px]",
            // 비활성: muted 색
            "text-muted-foreground",
            // 활성: keio-navy 텍스트 + keio-navy 언더라인(3px, rounded)
            "data-[state=active]:text-keio-navy",
            "data-[state=active]:after:bg-keio-navy data-[state=active]:after:h-[3px] data-[state=active]:after:rounded-full"
          )}
        >
          ホーム
        </TabsTrigger>
        <TabsTrigger
          value="board"
          className={cn(
            // 탭 바 높이 키우기 — shadcn 기본값이 group-data 복합 variant 라 같은 접두사로 override.
            // - h-auto: 트리거 고정 높이(h-[calc(100%-1px)]) 해제 → pt/pb 가 실제 높이에 반영.
            // - group-data-[orientation=horizontal]/tabs:after:bottom-0: 언더라인을 기본 -5px → 트리거 바닥
            //   (= 회색 border-b 위)으로 끌어올려 글자 밑에 붙임(따로 안 뜨게).
            // - pt-4 pb-3: 살짝 줄인 높이.
            // - after:bottom-[-2px]: 언더라인을 회색 하단 보더 위로 정확히 내려 일치시킴
            //   (트리거 투명 보더 오프셋 보정 — Playwright 실측으로 맞춤).
            "h-auto px-5 pt-4 pb-3 text-base font-semibold group-data-[orientation=horizontal]/tabs:after:bottom-[-2px]",
            "text-muted-foreground",
            "data-[state=active]:text-keio-navy",
            "data-[state=active]:after:bg-keio-navy data-[state=active]:after:h-[3px] data-[state=active]:after:rounded-full"
          )}
        >
          掲示板
        </TabsTrigger>
        {/* 3번째 탭 — アルバム. 기존 트리거 className 그대로 복제 */}
        <TabsTrigger
          value="album"
          className={cn(
            "h-auto px-5 pt-4 pb-3 text-base font-semibold group-data-[orientation=horizontal]/tabs:after:bottom-[-2px]",
            "text-muted-foreground",
            "data-[state=active]:text-keio-navy",
            "data-[state=active]:after:bg-keio-navy data-[state=active]:after:h-[3px] data-[state=active]:after:rounded-full"
          )}
        >
          アルバム
        </TabsTrigger>
      </TabsList>

      {/*
       * 트랙 구조 (스와이프 없음 — 탭 클릭 전환 전용):
       * - overflow-hidden div: 뷰포트. 폭 측정용 containerRef 연결.
       * - m.div (트랙): 두 패널을 가로로 나란히 배치. width = 뷰포트 * 2 (or "200%").
       *   translateX(x) 로 좌우 이동 — 탭 클릭 시 tab↔x 동기화 effect 가 animate 로 슬라이드.
       * - 각 패널 div (w-1/2 shrink-0): 뷰포트와 동일한 너비. 각각 home / board 콘텐츠 담음.
       *
       * forceMount: 두 패널이 항상 DOM 에 유지돼야 트랙이 가로로 이어진다.
       *   비활성 패널은 inert + aria-hidden 으로 AT(보조기술) / 포커스에서 차단.
       *
       * 드래그 제거: 가로 스와이프 제스처가 세로 스크롤과 경합하던 문제 해소.
       *   세로 스크롤은 100% 네이티브로 매끄럽게 동작.
       *
       * height: 활성 패널 높이로 고정 + overflow-hidden. 짧은 board 탭에서 긴 home 패널의
       *   캐러셀이 빈 영역으로 삐져나오는 것을 클립한다. 탭 전환 시 슬라이드(x)와 같은 곡선/시간으로
       *   height 도 transition 시켜 자연스럽게 늘었다 줄었다 하게 한다.
       */}
      <LazyMotion features={domAnimation}>
        <div
          ref={containerRef}
          className="overflow-hidden"
          style={{
            height: activeHeight > 0 ? activeHeight : undefined,
            transition: prefersReducedMotion
              ? undefined
              : "height 0.35s cubic-bezier(0.32, 0.72, 0, 1)",
          }}
        >
          {/*
           * 트랙 width: 뷰포트의 3배 (세 패널 나란히). width 미측정 시 "300%" fallback.
           * 각 패널은 w-1/3 으로 뷰포트와 동일한 너비.
           */}
          <m.div className="flex items-start" style={{ x, width: width > 0 ? width * 3 : "300%" }}>
            {/*
             * ホーム 패널 — 비활성 시 inert + aria-hidden 으로 AT·포커스 차단.
             * forceMount 로 항상 DOM 에 존재하므로 접근성 처리 필수.
             *
             * inert: React 19 / @types/react 19 에서 boolean 으로 지원.
             * 비활성 패널의 키보드 포커스·보조기술 접근을 차단. aria-hidden 과 병행해 호환성 확보.
             */}
            <div
              ref={homePanelRef}
              className="w-1/3 shrink-0 overflow-hidden"
              inert={tab !== "home" || undefined}
              aria-hidden={tab !== "home"}
            >
              <TabsContent value="home" forceMount className="space-y-6 pt-6">
                {homeContent}
                <ActivityReportsPreview
                  circleId={circleId}
                  reports={reports.slice(0, 5)}
                  onMoreClick={handleMoreClick}
                  isOwner={isOwner}
                />
                {/* 관련 동아리 — 「ホーム」 탭 맨 아래(활동 리포트 미리보기 뒤) */}
                {relatedContent}
              </TabsContent>
            </div>

            {/*
             * 掲示板 패널 — 비활성 시 inert + aria-hidden 으로 AT·포커스 차단.
             */}
            <div
              ref={boardPanelRef}
              className="w-1/3 shrink-0 overflow-hidden"
              inert={tab !== "board" || undefined}
              aria-hidden={tab !== "board"}
            >
              <TabsContent value="board" forceMount className="pt-6">
                {/*
                 * 소유자 전용 투고 박스 — ActivityReportsList 상단에 풀폭 점선 박스.
                 * ReportComposeSheet 가 자체적으로 SheetTrigger 를 포함하므로
                 * 외부 open state 없이 독립적으로 동작.
                 */}
                {isOwner && (
                  <div className="mb-4">
                    <ReportComposeSheet circleId={circleId} />
                  </div>
                )}
                {/* isOwner 를 전달해 각 row 에 ⋯ 수정·삭제 메뉴를 표시 */}
                <ActivityReportsList circleId={circleId} reports={reports} isOwner={isOwner} />
              </TabsContent>
            </div>

            {/*
             * アルバム 패널 — 비활성 시 inert + aria-hidden 으로 AT·포커스 차단.
             * albumContent 는 부모(page.tsx)에서 <CircleAlbum> 을 생성해 전달.
             */}
            <div
              ref={albumPanelRef}
              className="w-1/3 shrink-0 overflow-hidden"
              inert={tab !== "album" || undefined}
              aria-hidden={tab !== "album"}
            >
              <TabsContent value="album" forceMount className="pt-6">
                {albumContent}
              </TabsContent>
            </div>
          </m.div>
        </div>
      </LazyMotion>
    </Tabs>
  );
}
