import Link from "next/link";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Flag } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { ResolveReportButton } from "@/components/admin/resolve-report-button";

/**
 * /admin/inquiry-reports — 관리자 신고 검토 페이지 (T-031).
 *
 * ── 권한 가드 ─────────────────────────────────────────────────────────────────
 * 상위 app/admin/layout.tsx 의 AdminGuard 가 담당(proxy 인증 1차 + is_admin() 2차).
 * 비관리자는 layout 에서 이미 /circles 로 리다이렉트되므로 page 에서는 재확인하지 않는다.
 * Server Action(resolveReport)에서 Defense in Depth 로 is_admin() 를 재검증한다.
 *
 * ── 데이터 조회 ───────────────────────────────────────────────────────────────
 * inquiry_reports ORDER BY 미해결 우선(admin_resolved_at IS NULL DESC) + created_at DESC.
 * RLS inquiry_reports_select: is_admin() 조건이 있어 관리자만 전체 조회 가능.
 * DM 개인 데이터 → unstable_cache 금지.
 *
 * ── 표시 항목 ─────────────────────────────────────────────────────────────────
 * 신고된 메시지 본문 / 신고 사유 / 신고자 / 서클명 / inquiry 카테고리 / 신고 일시 / 해결 상태.
 *
 * ── UI 언어 ───────────────────────────────────────────────────────────────────
 * 일본어 UI. 금지어(公認/公式LINEに参加/必ず) 사용 금지.
 * 단체 명칭은サークル・部活動 병기.
 */

/**
 * 신고 목록 조회 결과 타입.
 * Supabase PostgREST 의 네스티드 관계 조회 결과를 그대로 매핑.
 */
type InquiryReportRow = {
  id: string;
  inquiry_id: string;
  message_id: string | null;
  reporter_user_id: string;
  reason: string;
  admin_resolved_at: string | null;
  created_at: string;
  /** 신고된 메시지 (message_id가 null이면 null) */
  inquiry_messages: {
    body: string;
    sender_role: string | null;
  } | null;
  /** 신고가 속한 inquiry (circle_id, category 포함) */
  inquiries: {
    circle_id: string;
    category: string | null;
    circles: {
      name: string;
    } | null;
  } | null;
  /** 신고자 프로필 */
  reporter: {
    display_name: string | null;
  } | null;
};

/**
 * 일본어 날짜 포맷 헬퍼.
 * 예: 2026年6月3日 14:30
 */
function formatJpDateTime(iso: string): string {
  return format(new Date(iso), "yyyy年M月d日 HH:mm", { locale: ja });
}

/**
 * 신고자 표시명 헬퍼.
 * profiles.display_name 이 없으면 UUID 앞 8자리로 대체.
 */
function formatReporter(row: InquiryReportRow): string {
  return row.reporter?.display_name ?? row.reporter_user_id.slice(0, 8) + "…";
}

/**
 * /admin/inquiry-reports 페이지 (Server Component).
 */
export default async function AdminInquiryReportsPage() {
  // ── Supabase 클라이언트 생성 (Fluid compute 대응: 매번 새로 생성) ────────
  const supabase = await createClient();

  // ── 신고 목록 조회 ────────────────────────────────────────────────────────
  // 미해결 우선(admin_resolved_at IS NULL → 정렬 시 true > false 순으로 앞에 옴),
  // 같은 상태 내에서는 최신 신고 우선.
  // 관련 테이블 JOIN: inquiry_messages, inquiries > circles, profiles(신고자)
  const { data: reports, error } = await supabase
    .from("inquiry_reports")
    .select(
      `
      id,
      inquiry_id,
      message_id,
      reporter_user_id,
      reason,
      admin_resolved_at,
      created_at,
      inquiry_messages ( body, sender_role ),
      inquiries (
        circle_id,
        category,
        circles ( name )
      ),
      reporter:profiles!inquiry_reports_reporter_user_id_fkey ( display_name )
    `
    )
    .order("admin_resolved_at", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[AdminInquiryReportsPage] fetch error:", error.message);
  }

  const rows = (reports ?? []) as unknown as InquiryReportRow[];

  // 미해결 건수 (admin_resolved_at IS NULL)
  const unresolvedCount = rows.filter((r) => !r.admin_resolved_at).length;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6">
      {/* ── ページヘッダー ──────────────────────────────────────────────── */}
      <header className="mb-4">
        <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight">
          <Flag className="text-destructive size-5" aria-hidden />
          通報管理
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          サークル・部活動のDMで受け付けた通報を確認・対応します。
          {unresolvedCount > 0 && (
            <span className="text-destructive ml-1 font-medium">未対応 {unresolvedCount}件</span>
          )}
        </p>
        {/* 관련 admin 페이지 링크 */}
        <div className="mt-2 flex gap-3 text-sm">
          <Link href="/admin/circles" className="text-keio-navy underline">
            ← 承認管理へ
          </Link>
          <Link href="/admin/announcements" className="text-keio-navy underline">
            お知らせ管理へ →
          </Link>
        </div>
      </header>

      {/* ── 신고 목록 ────────────────────────────────────────────────────── */}
      {rows.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed py-12 text-center text-sm">
          通報はまだありません。
        </p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {rows.map((report) => {
            const isResolved = !!report.admin_resolved_at;
            const circleName = report.inquiries?.circles?.name ?? "不明なサークル・部活動";
            const category = report.inquiries?.category;

            return (
              <li
                key={report.id}
                className={[
                  "flex flex-col gap-2.5 p-4 transition-colors",
                  isResolved ? "opacity-60" : "",
                ].join(" ")}
              >
                {/* ── 上段: サークル名 + カテゴリ + 状態バッジ ──────────── */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* 미해결/해결 상태 뱃지 */}
                  <Badge
                    variant={isResolved ? "secondary" : "destructive"}
                    className="shrink-0 text-xs font-normal"
                  >
                    {isResolved ? "解決済み" : "未対応"}
                  </Badge>

                  {/* 서클명 — 해당 서클 관리 페이지로 이동 */}
                  <span className="text-sm font-medium">{circleName}</span>

                  {/* inquiry 카테고리 */}
                  {category && (
                    <Badge variant="outline" className="shrink-0 text-xs font-normal">
                      {category}
                    </Badge>
                  )}

                  {/* 신고 일시 */}
                  <time
                    dateTime={report.created_at}
                    className="text-muted-foreground ml-auto shrink-0 text-xs"
                  >
                    {formatJpDateTime(report.created_at)}
                  </time>
                </div>

                {/* ── 신고된 메시지 본문 (있을 때만) ─────────────────────── */}
                {report.inquiry_messages && (
                  <div className="bg-muted/50 rounded-md px-3 py-2">
                    <p className="text-muted-foreground mb-0.5 text-[10px] font-medium tracking-wide uppercase">
                      通報対象メッセージ
                      {report.inquiry_messages.sender_role === "circle_staff" && (
                        <span className="ml-1">（運営側）</span>
                      )}
                    </p>
                    <p className="line-clamp-3 text-sm break-words whitespace-pre-wrap">
                      {report.inquiry_messages.body}
                    </p>
                  </div>
                )}

                {/* message_id が null → メッセージ特定不可の場合 */}
                {!report.message_id && (
                  <p className="text-muted-foreground text-xs italic">
                    ※ 対象メッセージの特定情報なし
                  </p>
                )}

                {/* ── 신고 사유 ─────────────────────────────────────────── */}
                <div>
                  <p className="text-muted-foreground mb-0.5 text-[10px] font-medium tracking-wide uppercase">
                    報告理由
                  </p>
                  <p className="text-sm break-words whitespace-pre-wrap">{report.reason}</p>
                </div>

                {/* ── 하단: 신고자 + 해결 버튼 ─────────────────────────── */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <p className="text-muted-foreground text-xs">報告者: {formatReporter(report)}</p>

                  {/* 해결 버튼 — 이미 해결된 경우 「解決済み」 표시 */}
                  <ResolveReportButton reportId={report.id} isResolved={isResolved} />
                </div>

                {/* 해결 일시 (해결된 경우만 표시) */}
                {isResolved && report.admin_resolved_at && (
                  <p className="text-muted-foreground text-right text-[10px]">
                    解決処理日時: {formatJpDateTime(report.admin_resolved_at)}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
