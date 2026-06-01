import Link from "next/link";

import { Button } from "@/components/ui/button";

/**
 * /events/[id] 동적 라우트 전용 404 — notFound() 호출 시 노출.
 *
 * 발생 케이스:
 * - 존재하지 않는 이벤트 ID
 * - visibility="members" 인 멤버 전용 이벤트 (비로그인 접근)
 */
export default function EventNotFound() {
  return (
    <main className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-bold">イベントが見つかりません</h1>
      <p className="text-muted-foreground mt-2 mb-6">
        該当するイベントは存在しないか、非公開です。
      </p>
      <Button asChild>
        <Link href="/">ホームに戻る</Link>
      </Button>
    </main>
  );
}
