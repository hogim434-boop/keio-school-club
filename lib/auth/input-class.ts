/**
 * AUTH_INPUT_CLS — 인증 화면 공용 input 스타일 (연한 채움형 / soft filled)
 *
 * 기존의 "테두리 + shadcn 기본 그림자(shadow-sm)" 박스가 촌스럽다는 피드백에 따라
 * 테두리·그림자를 제거하고 아주 연한 회색 채움으로 교체한 스타일.
 * (Toss·Notion 풍 — 친근한 온보딩 톤과 일치)
 *
 * 동작:
 *   - 평소: 테두리·그림자 없이 연한 회색 채움(bg-neutral-100)으로 입력 영역을 표시
 *   - 포커스: 흰 배경 + 慶應 네이비 ring 으로 "떠오르는" 느낌
 *
 * 구현 메모:
 *   shadcn `Input` 기본 클래스(`border`·`bg-transparent`·`shadow-sm`)를
 *   `border-0`·`bg-neutral-100`·`shadow-none` 으로 덮는다(tailwind-merge 마지막 우선).
 *   login·password·profile 등 인증 화면 input 전체가 이 한 곳을 공유한다.
 */
export const AUTH_INPUT_CLS =
  "h-12 rounded-xl border-0 bg-neutral-100 shadow-none text-base transition-colors placeholder:text-muted-foreground focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-keio-navy/40 focus-visible:outline-none";
