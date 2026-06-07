import Link from "next/link";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { ClipboardList } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { ClaimReviewButtons } from "@/components/admin/claim-review-buttons";

/**
 * /admin/claims — 동아리 권한 이양(claim) 신청 검토 페이지 (RSC).
 *
 * ── 권한 가드 ─────────────────────────────────────────────────────────────────
 * 상위 app/admin/layout.tsx 의 AdminGuard 가 담당(proxy 인증 1차 + is_admin() 2차).
 * 비관리자는 layout 에서 이미 /circles 로 리다이렉트되므로 page 에서는 재확인하지 않는다.
 * Server Action 에서 Defense in Depth 로 RPC 내부 admin 검증이 이루어진다.
 *
 * ── 데이터 조회 ───────────────────────────────────────────────────────────────
 * circle_claims (pending 우선 + 최신순) JOIN circles(name) + profiles(display_name).
 * RLS circle_claims_select_admin: profiles.role='admin' 인 경우만 전체 조회 가능.
 * 개인 데이터 → unstable_cache 금지.
 *
 * ── 표시 항목 ─────────────────────────────────────────────────────────────────
 * 동아리명 / 신청자 표시명 / contact_note / 신청일 / 상태 / 승인・却下 버튼
 */

/** claim 목록 조회 결과 타입 */
type CircleClaimRow = {
  id: string;
  circle_id: string;
  requester_id: string;
  contact_note: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  reviewed_at: string | null;
  /** 동아리 정보 */
  circles: {
    name: string;
  } | null;
  /** 신청자 프로필 */
  requester: {
    display_name: string | null;
  } | null;
};

/** 일본어 날짜 포맷 헬퍼 */
function formatJpDateTime(iso: string): string {
  return format(new Date(iso), "yyyy年M月d日 HH:mm", { locale: ja });
}

/** 신청자 표시명 — display_name 없으면 UUID 앞 8자리로 대체 */
function formatRequester(row: CircleClaimRow): string {
  return row.requester?.display_name ?? row.requester_id.slice(0, 8) + "…";
}

/** 상태별 배지 표시 */
function StatusBadge({ status }: { status: CircleClaimRow["status"] }) {
  if (status === "pending") {
    return (
      <Badge
        variant="secondary"
        className="shrink-0 bg-amber-100 text-xs font-normal text-amber-800 dark:bg-amber-500/20 dark:text-amber-300"
      >
        審査待ち
      </Badge>
    );
  }
  if (status === "approved") {
    return (
      <Badge
        variant="secondary"
        className="shrink-0 bg-emerald-100 text-xs font-normal text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300"
      >
        承認済み
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="shrink-0 text-xs font-normal opacity-60">
      却下済み
    </Badge>
  );
}

export default async function AdminClaimsPage() {
  // ── Supabase 클라이언트 생성 (Fluid compute 대응: 매번 새로 생성) ──────────
  const supabase = await createClient();

  // ── claim 목록 조회 ────────────────────────────────────────────────────────
  // pending 우선(reviewed_at IS NULL → nullsFirst), 같은 상태 내에서는 최신 신청 우선
  const { data: claims, error } = await supabase
    .from("circle_claims")
    .select(
      `
      id,
      circle_id,
      requester_id,
      contact_note,
      status,
      created_at,
      reviewed_at,
      circles ( name ),
      requester:profiles!circle_claims_requester_id_fkey ( display_name )
    `
    )
    .order("reviewed_at", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[AdminClaimsPage] fetch error:", error.message);
  }

  const rows = (claims ?? []) as unknown as CircleClaimRow[];

  // 未処理(pending) 건수
  const pendingCount = rows.filter((r) => r.status === "pending").length;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6">
      {/* ── ページヘッダー ──────────────────────────────────────────────────── */}
      <header className="mb-4">
        <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight">
          <ClipboardList className="text-keio-navy size-5" aria-hidden />
          claim申請
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          サークル・部活動の管理権限の移譲申請を確認・承認します。
          {pendingCount > 0 && (
            <span className="ml-1 font-medium text-amber-700 dark:text-amber-400">
              審査待ち {pendingCount}件
            </span>
          )}
        </p>
        {/* 관련 admin 페이지 링크 */}
        <div className="mt-2 flex gap-3 text-sm">
          <Link href="/admin/circles" className="text-keio-navy underline">
            ← 承認管理へ
          </Link>
          <Link href="/admin/inquiry-reports" className="text-keio-navy underline">
            通報管理へ →
          </Link>
        </div>
      </header>

      {/* ── 신청 목록 ────────────────────────────────────────────────────────── */}
      {rows.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed py-12 text-center text-sm">
          管理申請はまだありません。
        </p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {rows.map((claim) => {
            const isPending = claim.status === "pending";
            const circleName = claim.circles?.name ?? "不明なサークル・部活動";

            return (
              <li
                key={claim.id}
                className={[
                  "flex flex-col gap-2.5 p-4 transition-colors",
                  !isPending ? "opacity-60" : "",
                ].join(" ")}
              >
                {/* ── 上段: サークル名 + 状態バッジ + 申請日時 ─────────────── */}
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={claim.status} />

                  {/* 동아리 상세 링크 */}
                  <Link
                    href={`/circles/${claim.circle_id}`}
                    className="text-sm font-medium hover:underline"
                  >
                    {circleName}
                  </Link>

                  {/* 신청 일시 */}
                  <time
                    dateTime={claim.created_at}
                    className="text-muted-foreground ml-auto shrink-0 text-xs"
                  >
                    {formatJpDateTime(claim.created_at)}
                  </time>
                </div>

                {/* ── 본인 증명 정보 (contact_note) ──────────────────────── */}
                <div className="bg-muted/50 rounded-md px-3 py-2">
                  <p className="text-muted-foreground mb-0.5 text-[10px] font-medium tracking-wide uppercase">
                    本人確認情報
                  </p>
                  <p className="line-clamp-4 text-sm break-words whitespace-pre-wrap">
                    {claim.contact_note}
                  </p>
                </div>

                {/* ── 하단: 신청자 + 승인/거부 버튼 ──────────────────────── */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <p className="text-muted-foreground text-xs">申請者: {formatRequester(claim)}</p>

                  {/* pending 건에만 승인/거부 버튼 표시 */}
                  {isPending ? (
                    <ClaimReviewButtons claimId={claim.id} />
                  ) : (
                    <p className="text-muted-foreground text-xs">
                      {claim.reviewed_at && `処理日時: ${formatJpDateTime(claim.reviewed_at)}`}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
