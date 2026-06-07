"use client";

/**
 * EventManageBackButton — 이벤트 관리 화면 상단의 「戻る」(뒤로가기) 버튼.
 *
 * 동작: 고정 링크가 아니라 **직전 화면으로 복귀**(router.back()).
 *  - 이 페이지는 ① 마이페이지 운영 카드 ② 서클 상세 OwnerProfileCard 두 곳에서 진입한다.
 *    고정으로 서클 상세로 보내면 마이페이지에서 들어온 사용자가 엉뚱한 곳으로 가므로,
 *    "들어온 그 화면"으로 그대로 돌아가게 한다.
 *  - 단, URL 직접 진입·하드 새로고침 등 앱 내 히스토리가 없을 때 router.back() 은
 *    사이트를 벗어나거나 아무 동작도 안 할 수 있으므로, 그 경우 fallbackHref(서클 상세)로 이동한다.
 */

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export function EventManageBackButton({ fallbackHref }: { fallbackHref: string }) {
  const router = useRouter();

  const handleBack = () => {
    // window.history.length > 1: 앱 내에서 한 번이라도 이동해 온 경우 → 직전 화면으로
    // (1 이면 새 탭/직접 진입이라 돌아갈 곳이 없음 → fallback)
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
      aria-label="前の画面に戻る"
    >
      <ArrowLeft className="size-4" aria-hidden />
      戻る
    </button>
  );
}
