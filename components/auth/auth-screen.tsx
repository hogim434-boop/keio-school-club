/**
 * AuthScreen — 認証フロー用フルスクリーンシェルコンポーネント
 *
 * 용도:
 *   로그인·회원가입 등 인증 플로우 전체를 감싸는 풀스크린 컨테이너.
 *   부모 layout의 여백을 벗어나 항상 화면 전체를 점유한다.
 *
 * 구조 (위→아래):
 *   [progress 슬롯]  — 상단 진행 바 영역 (선택)
 *   [children 슬롯] — 제목·서브카피·입력 등 본문 (필수, flex-1 스크롤 가능)
 *   [footer 슬롯]   — 하단 CTA 버튼 영역 (선택, 항상 화면 하단에 고정)
 *
 * 주의:
 *   - 이 파일은 "use client" 없음. 서버·클라이언트 양쪽에서 import 가능.
 *   - hooks 사용 금지. 순수 프레젠테이션 컴포넌트.
 *   - 이벤트 핸들러·비즈니스 로직 없음.
 */

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AuthScreenProps {
  /** 상단에 표시할 진행 바 슬롯 (StepProgress 등). 없으면 영역 자체가 사라짐. */
  progress?: ReactNode;
  /** 제목·서브카피·입력 필드 등 본문 콘텐츠. */
  children: ReactNode;
  /** 하단에 고정할 CTA 버튼 영역. 없으면 영역 자체가 사라짐. */
  footer?: ReactNode;
  /** 루트 div에 추가할 Tailwind 클래스 (cn으로 병합됨). */
  className?: string;
  /**
   * 본문 슬롯 정렬 방향.
   * - "top"(기본): 상단 정렬 — profile 단계처럼 입력 필드가 많을 때.
   * - "center": 세로 중앙 정렬 — 짧은 CTA 화면(로그인·start·done)에 사용.
   */
  align?: "top" | "center";
}

/**
 * 풀스크린 인증 셸 컴포넌트.
 * fixed inset-0 으로 layout의 padding/margin을 완전히 벗어난다.
 */
export function AuthScreen({
  progress,
  children,
  footer,
  className,
  align = "top",
}: AuthScreenProps) {
  return (
    <div
      className={cn(
        // 풀스크린 고정 레이어 — layout 여백을 덮어씀
        "bg-background fixed inset-0 z-40 flex flex-col",
        className
      )}
    >
      {/* ── 상단 진행 바 슬롯 ── */}
      {progress && (
        <div
          className={[
            "shrink-0 px-6",
            // iOS safe area 상단 여백 + 기본 1.5rem 여백
            "pt-[calc(env(safe-area-inset-top)+1.5rem)]",
          ].join(" ")}
        >
          {progress}
        </div>
      )}

      {/* ── 본문 슬롯 ── */}
      {/*
        align="top"(기본): 상단 정렬. profile 단계처럼 입력 필드가 많은 화면에 적합.
          flex-1 + pt-10 으로 기존 동작 그대로 유지.
        align="center": 세로 중앙 정렬. 짧은 CTA 화면(로그인·start·done)에 사용.
          flex flex-col justify-center 로 콘텐츠를 수직 중앙으로 집약.
      */}
      <div
        className={cn(
          align === "center"
            ? "flex flex-1 flex-col justify-center overflow-y-auto px-6 py-10"
            : "flex-1 overflow-y-auto px-6 pt-10"
        )}
      >
        {children}
      </div>

      {/* ── 하단 CTA 슬롯 ── */}
      {footer && (
        <div
          className={[
            "shrink-0 px-6 pt-4",
            // iOS safe area 하단 여백 + 기본 1.5rem 여백
            "pb-[calc(env(safe-area-inset-bottom)+1.5rem)]",
          ].join(" ")}
        >
          {footer}
        </div>
      )}
    </div>
  );
}
