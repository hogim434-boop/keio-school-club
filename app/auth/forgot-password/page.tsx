import { Suspense } from "react";

import { ForgotPasswordForm } from "@/components/forgot-password-form";

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        {/* 향후 dynamic API (useSearchParams 등) 도입 시 build 깨지지 않도록 예방적 Suspense 경계.
            login page 와 동일 패턴 유지. */}
        <Suspense fallback={null}>
          <ForgotPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
