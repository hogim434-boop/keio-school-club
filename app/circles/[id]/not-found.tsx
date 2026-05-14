import Link from "next/link";

import { Button } from "@/components/ui/button";

// /circles/[id] 동적 라우트 전용 404 — notFound() 호출 시 노출
// 더미 배열에 없는 id 또는 Phase 1.2 T-009 와이어업 후 미공개 단체에 대해 RSC 에서 notFound() 트리거
export default function CircleNotFound() {
  return (
    <main className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-bold">サークルが見つかりません</h1>
      <p className="text-muted-foreground mt-2 mb-6">
        該当する団体は存在しないか、削除されました。
      </p>
      <Button asChild>
        <Link href="/circles">サークル一覧に戻る</Link>
      </Button>
    </main>
  );
}
