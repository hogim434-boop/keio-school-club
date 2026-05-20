import { Suspense } from "react";

import { SignUpForm } from "@/components/sign-up-form";

/**
 * 회원가입·온보딩 페이지
 *
 * AuthScreen이 fixed inset-0으로 풀스크린을 점유하므로
 * 기존의 min-h-svh 래퍼와 로고는 제거한다.
 * SignUpForm 내부의 useSearchParams() 때문에 Suspense 경계는 필수다.
 */
export default function Page() {
  return (
    <Suspense fallback={null}>
      <SignUpForm />
    </Suspense>
  );
}
