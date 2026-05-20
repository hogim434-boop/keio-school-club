"use client";

/**
 * PasswordInput — 비밀번호 표시/숨기기 토글 입력 컴포넌트
 *
 * show/hide 토글 버튼이 우측에 붙은 인증 전용 비밀번호 입력 필드.
 * shadcn Input을 내부에서 사용하되 className 오버라이드로 프리미엄 스타일 적용.
 *
 * 접근성:
 *   - 토글 버튼에 aria-label로 "表示"/"非表示" 의도 전달
 *   - tabIndex={-1}: 탭 순서에서 제외해 키보드 탐색 방해 않음
 *   - type="button": form submit 트리거 방지
 *
 * 마이크로인터랙션:
 *   - 아이콘 교체(Eye ↔ EyeOff) 시 AnimatePresence + scale/opacity 0.12s 전환
 *   - useReducedMotion() 준수 — reduced 시 즉시 교체
 */

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { AnimatePresence, LazyMotion, domAnimation, m, useReducedMotion } from "motion/react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { AUTH_INPUT_CLS } from "@/lib/auth/input-class";

interface PasswordInputProps {
  /** input 요소의 id — Label htmlFor과 연결 */
  id: string;
  /** 현재 입력값 */
  value: string;
  /** 값 변경 핸들러 */
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** 플레이스홀더 텍스트 */
  placeholder?: string;
  /** 자동완성 힌트 ("new-password" | "current-password" 등) */
  autoComplete?: string;
  /** Input에 병합할 추가 Tailwind 클래스 */
  className?: string;
}

/**
 * 비밀번호 표시/숨기기 토글이 내장된 인증용 입력 컴포넌트.
 * 외부에서 value/onChange를 받아 controlled 방식으로 동작한다.
 */
export function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
  autoComplete,
  className,
}: PasswordInputProps) {
  // 비밀번호 표시 여부 — false(숨김)가 기본값
  const [show, setShow] = useState(false);

  // reduced motion 여부 — 접근성 준수 (WCAG SC 2.3.3)
  const reducedMotion = useReducedMotion();

  return (
    /* 상대 위치 컨테이너 — 토글 버튼의 절대 배치 기준점 */
    <div className="relative">
      {/* 비밀번호 입력 필드 — pr-11로 오른쪽 버튼 자리를 확보 */}
      <Input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={cn(AUTH_INPUT_CLS, "pr-11", className)}
      />

      {/*
        표시/숨기기 토글 버튼.
        - absolute right-0 top-0: 입력 필드 오른쪽 끝에 세로 꽉 채워 배치
        - type="button": form onSubmit 트리거 방지 (필수)
        - tabIndex={-1}: 탭 순서에서 제외해 폼 탐색 흐름 방해 않음
        - aria-label: 스크린 리더에 현재 토글 상태 전달
        - 아이콘 교체: AnimatePresence로 exit→enter 교차 페이드 (0.12s)
          · reduced motion 시 duration:0으로 즉시 교체
          · scale 0.7→1 / 1→0.7: 아이콘이 살짝 오므라들었다 펴지는 느낌
      */}
      <LazyMotion features={domAnimation}>
        <button
          type="button"
          aria-label={show ? "パスワードを隠す" : "パスワードを表示する"}
          tabIndex={-1}
          onClick={() => setShow((prev) => !prev)}
          className="text-muted-foreground hover:text-foreground absolute top-0 right-0 flex h-full items-center px-3 transition-colors"
        >
          {/*
            AnimatePresence mode="wait": exit 완료 후 enter 시작.
            아이콘 교체가 겹치지 않아 깔끔한 전환.
            key를 show 값으로 — 상태 변경 시 새 아이콘으로 re-mount.
          */}
          <AnimatePresence mode="wait" initial={false}>
            {show ? (
              <m.span
                key="eye-off"
                initial={reducedMotion ? false : { opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={reducedMotion ? undefined : { opacity: 0, scale: 0.7 }}
                transition={{ duration: reducedMotion ? 0 : 0.12, ease: "easeOut" }}
                style={{ display: "flex" }}
              >
                {/* 표시 중 → 클릭하면 숨김 (EyeOff 표시) */}
                <EyeOff className="size-4" aria-hidden="true" />
              </m.span>
            ) : (
              <m.span
                key="eye"
                initial={reducedMotion ? false : { opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={reducedMotion ? undefined : { opacity: 0, scale: 0.7 }}
                transition={{ duration: reducedMotion ? 0 : 0.12, ease: "easeOut" }}
                style={{ display: "flex" }}
              >
                {/* 숨김 중 → 클릭하면 표시 (Eye 표시) */}
                <Eye className="size-4" aria-hidden="true" />
              </m.span>
            )}
          </AnimatePresence>
        </button>
      </LazyMotion>
    </div>
  );
}
