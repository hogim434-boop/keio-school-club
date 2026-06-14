import { ImageResponse } from "next/og";

/**
 * iOS apple-touch-icon — Next.js App Router ImageResponse 동적 생성.
 * `/apple-icon` 경로로 제공되며, <head> 에 apple-touch-icon 메타가 자동 삽입됨.
 * iOS "홈 화면에 추가" 시 이 아이콘이 사용됨.
 *
 * 디자인: icon.tsx 와 동일 콘셉트 (慶應 네이비 배경 + 흰색 "K")
 * 차이점:
 *   - 크기 180×180 (iOS apple-touch-icon 표준)
 *   - 둥근 모서리(borderRadius 40px): iOS 가 자동 클리핑하지만 미리 적용해도 자연스러움
 *   - 여백 충분히 — safe zone 고려 (K 를 80% 이내로 배치)
 */

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#25305a",
        // iOS 아이콘 둥근 모서리 — 약 22% (180px 기준 약 40px)
        borderRadius: "40px",
      }}
    >
      {/*
       * "K" 글자:
       * - 폰트 사이즈 108px: 180px 의 약 60% → safe zone 내에 수납.
       *   좌우 여백 약 36px(20%), 상하도 비슷한 여백 확보.
       */}
      <span
        style={{
          color: "#ffffff",
          fontSize: "108px",
          fontWeight: 900,
          fontFamily: "sans-serif",
          lineHeight: 1,
        }}
      >
        K
      </span>
    </div>,
    { ...size }
  );
}
