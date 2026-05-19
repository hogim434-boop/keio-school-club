import { Suspense } from "react";

import { LoginForm } from "@/components/login-form";

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        {/* LoginForm 의 useSearchParams() 가 dynamic API 이므로 Suspense 경계 필수.
            cacheComponents: true 환경에서 static generation 시 uncached data 접근 차단을 만족시키기 위함. */}
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
