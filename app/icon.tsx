import { ImageResponse } from "next/og";

/**
 * 앱 아이콘 — Next.js App Router ImageResponse 동적 생성.
 * `/icon` 경로로 자동 제공되며, <head> 에 favicon/icon 메타가 자동 삽입됨.
 *
 * 디자인: 慶應 네이비(#25305a) 배경 + 흰색 굵은 "K"
 * maskable 대응: K 가 중앙 80% safe zone 내에 위치 (가장자리 약 10% 여백 확보)
 *   → 안드로이드 원형/스쿼클 마스크에 잘려도 K 가 보임.
 */

// Next.js 가 이 값으로 PNG 크기를 결정
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        // 慶應 네이비 배경
        background: "#25305a",
        // maskable 아이콘은 정사각형 그대로 사용 — 마스크 형태는 브라우저/OS 가 결정
        borderRadius: "0px",
      }}
    >
      {/*
       * "K" 글자:
       * - 폰트 사이즈 300px: 512px 의 약 58% → safe zone(80% = 409px) 안에 충분히 수납.
       * - fontWeight 900: 굵고 단순한 느낌 (Black weight)
       * - fontFamily sans-serif: 서버 사이드에서 사용 가능한 시스템 폰트
       * - lineHeight 1: 수직 기준선 흔들림 방지
       */}
      <span
        style={{
          color: "#ffffff",
          fontSize: "300px",
          fontWeight: 900,
          fontFamily: "sans-serif",
          lineHeight: 1,
          // letterSpacing 0 — 단일 문자이므로 불필요
        }}
      >
        K
      </span>
    </div>,
    { ...size }
  );
}
