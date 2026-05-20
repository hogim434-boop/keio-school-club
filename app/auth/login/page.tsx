import { Suspense } from "react";

import { LoginForm } from "@/components/login-form";

/**
 * 로그인 페이지
 *
 * AuthScreen이 fixed inset-0으로 풀스크린을 점유하므로
 * 기존의 min-h-svh 래퍼와 로고는 제거한다.
 * LoginForm 내부의 useSearchParams() 때문에 Suspense 경계는 유지한다.
 */
export default function Page() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
