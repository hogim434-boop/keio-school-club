/**
 * 공개 이벤트/캘린더 면 노출 여부.
 *
 * false: 디렉터리 우선(시드 단계) — 하단 캘린더 탭·홈 이벤트 섹션 숨김,
 *        /calendar 직접 진입은 홈으로 리다이렉트.
 *
 * 복구 방법:
 *   이 값을 `true` 로 바꾸기만 하면 캘린더 탭·홈 이벤트 섹션·/calendar 전부 즉시 복구된다.
 *   운영자가 이벤트를 만들기 시작한 시점(이벤트 데이터가 충분히 채워진 후)에 true 로 전환할 것.
 *
 * 영향 범위:
 *   - components/layout/bottom-tabs.tsx — カレンダー 탭 표시/숨김
 *   - app/(tabs)/page.tsx — 홈 「直近のイベント」 섹션 + 스켈레톤 표시/숨김
 *   - app/(tabs)/calendar/page.tsx — 직접 진입 시 홈으로 리다이렉트 여부
 *
 * 변경하지 않는 것:
 *   - /circles/[id]/events* (운영자 이벤트 관리)
 *   - /events/[id] (이벤트 상세)
 *   — 위 두 경로는 플래그 값에 관계없이 항상 정상 동작한다.
 */
export const PUBLIC_EVENTS_ENABLED = false;

/**
 * 인앱 DM / お問い合わせ 기능 노출 여부.
 *
 * false: 디렉터리 우선(시드 단계) — 시드 동아리에는 응대할 실제 운영자가 없으므로
 *        메시지 진입 면을 전부 숨기고 SNS 핸드오프로 통일한다.
 *
 * 복구 방법:
 *   이 값을 `true` 로 바꾸기만 하면 아래 모든 면이 즉시 복구된다.
 *   운영자가 claim·응대 가능해진 시점에 true 로 전환할 것.
 *
 * 영향 범위 (false 일 때 숨겨지는 것):
 *   - components/layout/messages-link.tsx — 헤더 「メッセージ」 아이콘 숨김
 *   - app/(tabs)/messages/page.tsx — 직접 진입 시 홈으로 리다이렉트
 *   - components/mypage/mypage-view.tsx — 마이페이지 「お問い合わせ」 섹션 숨김
 *   - app/(tabs)/mypage/page.tsx — 미읽음 집계 쿼리 스킵 (쿼리 절약)
 *   - components/circles/circle-actions.tsx — claim済みでも인앱 DM 버튼 대신 SNS 핸드오프
 *   - app/circles/[id]/dm/page.tsx — 직접 진입 시 서클 상세로 리다이렉트
 *   - app/circles/[id]/dm/inbox/page.tsx — 직접 진입 시 서클 상세로 리다이렉트
 *   - app/circles/[id]/dm/[inquiryId]/page.tsx — 직접 진입 시 서클 상세로 리다이렉트
 *
 * 변경하지 않는 것:
 *   - DM 관련 Server Action / RLS / 쿼리 자체 (데이터·로직 보존)
 *   - お知らせ(알림 벨) 기능
 *   — 플래그 true 로 복구 시 즉시 정상 동작해야 한다.
 */
export const MESSAGING_ENABLED = false;

/**
 * 일반 사용자(학생) 가입 갈래 노출 여부.
 *
 * false: 시드 단계 — 일반 사용자 가입 갈래를 숨기고 가입=운영자 전용으로 통일한다.
 *        탐색·검색·즐겨찾기·셔플은 비로그인으로 모두 공개되어 있으므로,
 *        가입이 필요한 사람은 동아리 운영자뿐이기 때문.
 *
 * 복구 방법:
 *   이 값을 `true` 로 바꾸기만 하면 chooser(의도 선택 2카드)와 일반 가입 갈래가 즉시 복구된다.
 *   이벤트·DM 기능을 열 때(`PUBLIC_EVENTS_ENABLED` / `MESSAGING_ENABLED` → true)
 *   와 동시에 true 로 전환할 것.
 *
 * 영향 범위 (false 일 때 변경되는 것):
 *   - components/sign-up-form.tsx — chooser 단계를 건너뛰고 start(1/3)로 직행,
 *       intent를 "operator"로 강제, backHref를 chooser 대신 홈("/")으로 변경
 */
export const GENERAL_SIGNUP_ENABLED = false;
