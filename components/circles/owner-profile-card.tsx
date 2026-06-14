/**
 * OwnerProfileCard — 상세 페이지에서 "소유자 본인에게만" 보이는 카드.
 *
 * - 「あなたのサークル」 라벨 + 프로필 完成度 게이지(+빠진 항목 칩) + 「編集する」 버튼.
 * - 헤더 아래 · 탭 위에 배치되어 진입 즉시 보인다.
 * - 完成度 위젯은 마이페이지와 동일한 ProfileCompletion 을 재사용(중복 제거).
 * - 일반 방문자에겐 렌더하지 않는다(page.tsx 의 isOwner 게이팅).
 *
 * 서버 컴포넌트 — 내부 ProfileCompletion 은 client 이지만 여기선 합성만 한다.
 */

import Link from "next/link";
import { CalendarCog } from "lucide-react";

import { ProfileCompletion } from "@/components/mypage/profile-completion";
import { Button } from "@/components/ui/button";
import { PUBLIC_EVENTS_ENABLED } from "@/lib/constants/features";
import { cn } from "@/lib/utils";
import type { CircleDetail } from "@/lib/types/domain";

export function OwnerProfileCard({ circle }: { circle: CircleDetail }) {
  return (
    <section
      aria-label="あなたのサークル"
      className="border-border bg-muted/30 space-y-3 rounded-xl border p-4"
    >
      <h2 className="text-sm font-semibold">あなたのサークル</h2>

      {/* 完成度 게이지 + 빠진 항목 칩 (마이페이지와 동일 위젯 재사용) */}
      <ProfileCompletion circle={circle} />

      {/* 운영 액션 — 編集(프로필 편집) / イベント管理(이벤트 허브).
          イベント管理는 PUBLIC_EVENTS_ENABLED=false(시드 단계) 동안 숨김.
          숨겨지면 編集する 가 단독 풀폭 버튼이 된다. */}
      <div className={cn("grid gap-2", PUBLIC_EVENTS_ENABLED ? "grid-cols-2" : "grid-cols-1")}>
        {/* 編集する — 편집 폼(전체 항목)으로 이동 */}
        <Button asChild variant="outline" className="h-10">
          <Link href={`/circles/${circle.id}/edit`}>編集する</Link>
        </Button>
        {/* イベント管理 — 이벤트 생성·편집·신청자 관리 허브 (플래그 ON 시에만 노출) */}
        {PUBLIC_EVENTS_ENABLED && (
          <Button asChild className="h-10">
            <Link href={`/circles/${circle.id}/events`}>
              <CalendarCog className="size-4" aria-hidden="true" />
              イベント管理
            </Link>
          </Button>
        )}
      </div>
    </section>
  );
}
