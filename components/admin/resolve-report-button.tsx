"use client";

/**
 * components/admin/resolve-report-button.tsx
 *
 * 신고 해결 처리 버튼 (Client Component, T-031).
 *
 * ── 동작 ─────────────────────────────────────────────────────────────────────
 * 클릭 → resolveReport Server Action 호출 → 성공 시 toast + 목록 자동 갱신
 * (revalidatePath 로 Server Component 재렌더링).
 *
 * ── 미해결 신고에만 표시 ──────────────────────────────────────────────────────
 * page.tsx 에서 isResolved 를 전달받아 이미 해결된 항목에는 버튼을 숨긴다.
 * UI 일본어. 금지어(公認/公式LINEに参加/必ず) 사용 금지.
 */

import { useTransition } from "react";
import { CheckCircle } from "lucide-react";
import { toast } from "sonner";

import { resolveReport } from "@/app/admin/inquiry-reports/actions";
import { Button } from "@/components/ui/button";

interface ResolveReportButtonProps {
  /** 처리 대상 inquiry_reports UUID */
  reportId: string;
  /** 이미 해결된 경우 true — 버튼 비활성화 */
  isResolved: boolean;
}

/**
 * 신고 해결 버튼.
 * isResolved=true 인 경우 「解決済み」 텍스트만 표시.
 */
export function ResolveReportButton({ reportId, isResolved }: ResolveReportButtonProps) {
  const [isPending, startTransition] = useTransition();

  // 이미 해결된 신고 → 상태 표시만
  if (isResolved) {
    return (
      <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
        <CheckCircle className="size-3.5 text-green-500" aria-hidden />
        解決済み
      </span>
    );
  }

  function handleResolve() {
    startTransition(async () => {
      const result = await resolveReport(reportId);

      if (!result.ok) {
        toast.error(result.error ?? "処理に失敗しました");
        return;
      }

      toast.success("通報を解決済みにしました");
    });
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={handleResolve}
      disabled={isPending}
      className="h-7 gap-1.5 text-xs"
    >
      <CheckCircle className="size-3.5" aria-hidden />
      {isPending ? "処理中…" : "解決済みにする"}
    </Button>
  );
}
