import { Suspense } from "react";

import { CircleRegistrationForm } from "@/components/circles/new/circle-registration-form";

/**
 * 서클 등록 페이지 (T-018) — 3단계 풀스크린 멀티스텝 플로우.
 *
 * CircleRegistrationForm 이 useSearchParams() 로 단계(?step=)를 읽으므로,
 * cacheComponents:true 환경에서는 반드시 <Suspense> 로 감싸야 한다.
 * 라우트 보호는 proxy.ts 에서 처리(미인증 시 /auth/login?next=/circles/new).
 */
export default function NewCirclePage() {
  return (
    <Suspense fallback={null}>
      <CircleRegistrationForm />
    </Suspense>
  );
}
