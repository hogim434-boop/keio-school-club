"use client";

import { useContext, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft } from "lucide-react";

import { ReportSlideOutContext } from "@/app/circles/[id]/reports/[reportId]/template";
import { cn } from "@/lib/utils";

/**
 * 활동 리포트 상세 페이지 좌상단 floating 뒤로가기 버튼.
 *
 * 메루카리 / Instagram 스타일 — 콘텐츠 위에 떠있는 원형 뒤로가기.
 *
 * 마운트 전략 (createPortal → document.body):
 * - 부모 template.tsx 가 이탈 시 transform (x:100%) 을 적용하므로
 *   CSS 명세상 transform 적용된 조상은 자식 position:fixed 의 containing block 가로챔.
 * - createPortal 로 body 에 직접 마운트하면 motion.div 의 transform 영향 없이
 *   viewport 기준 fixed 가 정상 동작 (좌상단 고정 유지).
 *
 * 위치:
 * - fixed left-4, z-20 (콘텐츠 위)
 * - top: max(env(safe-area-inset-top), 1rem) — iPhone notch / Dynamic Island 회피
 *
 * 시인성:
 * - bg-background/80 backdrop-blur shadow-md border — glassmorphism
 * - 다크모드에서도 border + backdrop 로 구분 가능
 */
export function ReportPageHeader() {
  const slideOut = useContext(ReportSlideOutContext);

  // hydration 안전한 mount 가드 — SSR 시 document 미존재로 createPortal 호출 불가
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const backButton = (
    <button
      type="button"
      onClick={slideOut}
      aria-label="戻る"
      className={cn(
        // 위치: 좌상단 fixed, safe-area-inset-top 회피
        "fixed left-4 z-20 size-10",
        // 모양: 원형 + glassmorphism + border + shadow
        "inline-flex items-center justify-center rounded-full",
        "bg-background/80 border shadow-md backdrop-blur",
        "supports-backdrop-filter:bg-background/60",
        // 인터랙션
        "hover:bg-background transition-colors",
        "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none"
      )}
      style={{ top: "max(env(safe-area-inset-top), 1rem)" }}
    >
      <ArrowLeft className="size-5" aria-hidden="true" />
    </button>
  );

  // mounted 후에만 portal 활성화 — 첫 SSR 렌더는 null (button 없음)
  if (!mounted) return null;
  return createPortal(backButton, document.body);
}
