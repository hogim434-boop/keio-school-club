/**
 * ProfileHero — 마이페이지 상단 프로필 섹션.
 *
 * 표시 내용:
 * - 이니셜 아바타 (shadcn Avatar + AvatarFallback)
 *   배경: bg-keio-navy / 텍스트: text-keio-navy-foreground
 *   이니셜: displayName 첫 글자, 없으면 "U"
 * - 표시 이름 (없으면 "未設定")
 * - keioVerified === true 일 때 CircleCheckBig 인증 뱃지 표시
 *
 * 서버 컴포넌트 — DB/인증 접근 없이 props 만 사용.
 * 모션은 부모 MyPageView 의 stagger enterItem variant 으로 처리.
 */

import { CircleCheckBig } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface ProfileHeroProps {
  /** 사용자 표시 이름 (null 이면 "未設定" 렌더) */
  displayName: string | null;
  /** 慶應生 인증 여부 */
  keioVerified: boolean;
  /** 외부에서 루트 요소에 추가할 클래스명 */
  className?: string;
}

export function ProfileHero({ displayName, keioVerified, className }: ProfileHeroProps) {
  /* 이니셜: displayName 첫 글자 대문자, 없으면 "U" */
  const initial = displayName ? displayName.charAt(0).toUpperCase() : "U";

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* ── 이니셜 아바타 56px ── */}
      <Avatar className="size-14 shrink-0">
        <AvatarFallback className="bg-keio-navy text-keio-navy-foreground text-lg font-semibold">
          {initial}
        </AvatarFallback>
      </Avatar>

      {/* ── 이름 + 인증 뱃지 ── */}
      <div className="space-y-0.5">
        {/* 표시 이름: displayName 없으면 "未設定" */}
        <p className="text-base leading-tight font-semibold">{displayName ?? "未設定"}</p>

        {/* 慶應生 인증 뱃지: keioVerified true 일 때만 표시 */}
        {keioVerified && (
          <div className="text-keio-navy flex items-center gap-1 text-xs font-medium">
            <CircleCheckBig className="size-3.5 shrink-0" aria-hidden="true" />
            <span>慶應生認証済み</span>
          </div>
        )}
      </div>
    </div>
  );
}
