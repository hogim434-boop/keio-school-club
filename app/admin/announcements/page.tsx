import Link from "next/link";

import { getAnnouncements } from "@/lib/supabase/queries/notifications";
import { Badge } from "@/components/ui/badge";
import {
  AnnouncementComposer,
  AnnouncementDeleteButton,
  TYPE_LABEL,
} from "@/components/admin/announcement-composer";

/**
 * /admin/announcements — 관리자 공개 알림(공지/이벤트) 작성·관리 (T-020 후속).
 *
 * 권한 가드는 상위 app/admin/layout.tsx 의 AdminGuard 가 전담하므로 여기서 재확인하지 않는다.
 * 상단: 작성 폼(AnnouncementComposer). 하단: 기존 공지 목록 + 행별 삭제.
 * new_circle(자동 발행분)도 목록에 표시해 확인 가능.
 */

/** 작성일 표시 — 2026年5月24日 형식 */
function formatJpDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function AdminAnnouncementsPage() {
  const announcements = await getAnnouncements();

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6">
      <header className="mb-4">
        <h1 className="text-xl font-bold tracking-tight">お知らせ管理</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          全ユーザーに表示されるお知らせ・イベントを作成します。
        </p>
        <div className="mt-2 flex gap-3 text-sm">
          <Link href="/admin/circles" className="text-keio-navy underline">
            ← 承認管理へ
          </Link>
          <Link href="/admin/inquiry-reports" className="text-keio-navy underline">
            通報管理へ →
          </Link>
        </div>
      </header>

      {/* 작성 폼 */}
      <AnnouncementComposer />

      {/* 기존 공지 목록 */}
      <section className="mt-6">
        <h2 className="text-muted-foreground mb-2 text-sm font-medium">
          投稿済みのお知らせ（{announcements.length}件）
        </h2>

        {announcements.length === 0 ? (
          <p className="text-muted-foreground rounded-lg border border-dashed py-10 text-center text-sm">
            まだお知らせはありません。
          </p>
        ) : (
          <ul className="divide-y rounded-xl border">
            {announcements.map((a) => (
              <li key={a.id} className="flex items-start gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="shrink-0 text-xs font-normal">
                      {TYPE_LABEL[a.type] ?? a.type}
                    </Badge>
                    <span className="text-muted-foreground text-xs">
                      {formatJpDate(a.created_at)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-medium">{a.title}</p>
                  {a.body && (
                    <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">{a.body}</p>
                  )}
                </div>
                <AnnouncementDeleteButton id={a.id} title={a.title} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
