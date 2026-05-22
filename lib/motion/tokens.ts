/**
 * 프로젝트 공통 모션 토큰 — favorites-page-body.tsx 에서 검증된 값을 전역화.
 *
 * 사용 가이드:
 * - EASE_IOS: 일반 진입/이동 트랜지션 (iOS 스프링 느낌)
 * - EASE_EXPO: 빠른 시작 + 부드러운 마무리 (필터 칩, 드롭다운 등)
 * - SPRING_PRESS: whileTap press 피드백 (scale 0.97)
 * - enterContainer/enterItem: stagger 진입 애니메이션 (parent/child 쌍으로 사용)
 *
 * 접근성: useReducedMotion() 감지 후 initial 을 animate 와 동일하게 설정하거나,
 * variants 의 hidden 을 즉시 show 상태로 오버라이드해 애니메이션을 우회한다.
 */

/**
 * iOS 스프링 느낌의 easing — 빠르게 치솟고 부드럽게 착지.
 * [0.32, 0.72, 0, 1] : cubic-bezier
 */
export const EASE_IOS = [0.32, 0.72, 0, 1] as const;

/**
 * expo out easing — 빠른 시작, 천천히 멈춤.
 * favorites-page-body 전반에서 사용되는 기본 easing.
 */
export const EASE_EXPO = [0.22, 1, 0.36, 1] as const;

/**
 * press(whileTap) 피드백 용 spring 전환 설정.
 * 스프링 계수는 bottom-nav 의 탭 scale 팝과 통일.
 */
export const SPRING_PRESS = {
  type: "spring",
  stiffness: 400,
  damping: 25,
} as const;

/**
 * stagger 컨테이너 variant — 자식 아이템들을 0.06초 간격으로 순차 등장시킨다.
 * 사용: <m.div variants={enterContainer} initial="hidden" animate="show">
 */
export const enterContainer = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.05,
    },
  },
} as const;

/**
 * stagger 아이템 variant — 12px 아래에서 fade-up 진입.
 * 사용: <m.div variants={enterItem}>
 *
 * useReducedMotion() === true 일 때는 부모에서 initial/animate 를 모두 { opacity: 1, y: 0 } 로
 * 오버라이드하거나, enterItem 대신 정적 렌더를 사용할 것.
 */
export const enterItem = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: EASE_IOS,
    },
  },
} as const;
