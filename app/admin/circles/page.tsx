import Link from "next/link";

import { getPendingCircles } from "@/lib/supabase/queries/circles";
import { AdminQueueView } from "@/components/admin/admin-queue-view";

/**
 * /admin/circles — 관리자 승인 큐 (T-019).
 *
 * 권한 가드는 상위 app/admin/layout.tsx 의 AdminGuard 가 전담(proxy 인증 1차 + is_admin() 2차,
 * 비관리자는 /circles 리다이렉트)하므로 본 page 에서 권한 재확인하지 않는다.
 *
 * pending 동아리를 신청일순으로 서버에서 조회 → 클라이언트 큐 뷰에 전달.
 * 진입 시 즉시 스켈레톤은 같은 폴더의 loading.tsx 가 담당(cacheComponents OFF 정책).
 */
export default async function AdminCirclesPage() {
  const pending = await getPendingCircles();

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6">
      <header className="mb-4">
        <h1 className="text-xl font-bold tracking-tight">承認管理</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          サークル登録申請を確認し、承認または却下します。
          {pending.length > 0 && <span className="ml-1">（承認待ち {pending.length}件）</span>}
        </p>
        <Link
          href="/admin/announcements"
          className="text-keio-navy mt-2 inline-block text-sm underline"
        >
          お知らせ管理へ →
        </Link>
      </header>

      <AdminQueueView initial={pending} />
    </main>
  );
}
