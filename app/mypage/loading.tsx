import { MyPageSkeleton } from "@/components/mypage/mypage-skeleton";

/**
 * /mypage 라우트 진입 즉시 표시되는 loading UI.
 *
 * MyPagePage 가 내부적으로 `<Suspense fallback={<MyPageSkeleton />}>`를 사용하고 있으므로
 * loading.tsx 도 동일한 컴포넌트를 재사용해 일관된 스켈레톤을 표시한다.
 *
 * 레이아웃(MyPageSkeleton):
 *   - 프로필 줄 (아바타 원 + 이름 + 인증 뱃지)
 *   - 섹션 헤더 줄
 *   - 운영 카드 (커버 16:9 + 메트릭 3분할 + 편집 버튼)
 */
export default function MyPageLoading() {
  return <MyPageSkeleton />;
}
