"use client";

/**
 * HomeCoachmark — /circles 홈(추천 모드)용 온보딩 코치마크 wrapper.
 *
 * 코치마크 엔진(CoachmarkEngine)에 홈 전용 3단계 정의와
 * storageKey("kcircle-onboarding-home-v1")를 주입합니다.
 *
 * 엔진 교체 방식: 아래 import + JSX 의 엔진 이름만 바꾸면 됩니다.
 * - 말풍선(단계 이동) 방식: CoachmarkEngine (./coachmark)
 * - 한 장짜리 오버레이 방식: OverlayCoachmarkEngine (./overlay-coachmark) ← 현재 사용 중
 * 대상 컴포넌트의 data-coachmark 속성과 이 steps 배열은 그대로 유지됩니다.
 */

import type { CoachmarkStep } from "./coachmark";
import { OverlayCoachmarkEngine } from "./overlay-coachmark";

/** 홈 코치마크 3단계 정의 (일본어) */
const HOME_STEPS: CoachmarkStep[] = [
  {
    // 검색 바 (home-search-bar.tsx의 Link)
    target: "search",
    title: "キーワードで検索",
    description: "サークル名やカテゴリで気になる団体を探せます",
  },
  {
    // 카테고리 그리드 (home-category-grid.tsx의 section)
    target: "category",
    title: "ジャンルから探す",
    description: "興味のあるジャンルをタップして絞り込めます",
  },
  {
    // 하단 탭 바 「お気に入り」 (bottom-nav.tsx의 favorites Link)
    target: "favorites",
    title: "お気に入り保存",
    description: "気になるサークルはここに保存して後で見返せます",
  },
];

/**
 * localStorage 키 — 버전 suffix(v1)를 붙여 놓으면
 * 나중에 v2로 올려서 기존 완료 사용자에게도 재표시할 수 있습니다.
 */
const STORAGE_KEY = "kcircle-onboarding-home-v2";

/** /circles 홈 전용 코치마크. DiscoverContent 안에 마운트합니다. */
export function HomeCoachmark() {
  return <OverlayCoachmarkEngine steps={HOME_STEPS} storageKey={STORAGE_KEY} />;
}
