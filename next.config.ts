import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // React Strict Mode 는 의도적으로 꺼 둔다.
  //
  // Next.js default 는 true 라 dev 환경에서 component 를 mount → cleanup → mount 로
  // 두 번 발화한다 (side effect 검출 목적). 이 동작이 framer-motion 의 m.div 와 충돌해
  // entry 트랜지션이 두 번 시작 → race condition → 「반동」 같은 변칙적 떨림 발생.
  //
  // 본 앱은 motion/react 를 page transition 의 핵심으로 쓰므로, dev 에서 보이는 모션이
  // production 과 동일하게 보이는 게 더 중요하다. side-effect 검출은 코드 리뷰·테스트로 대체.
  reactStrictMode: false,

  // cacheComponents 는 의도적으로 켜지 않음.
  // 이 앱은 인증(쿠키)·필터/검색·즐겨찾기 등 대부분이 동적이라 캐시 이득이 작은 반면,
  // 켜 두면 dev(캐시 OFF)와 Vercel(캐시 ON 적극)의 동작이 갈려
  // 「localhost 정상 / Vercel stale」 갭이 생긴다. 끄면 양쪽이 동일하게 「매번 최신」으로 동작.
  // next/image 외부 도메인 허용
  // - picsum.photos: Phase 1.1 의 더미 데이터 placeholder (lib/dummy/circles.ts)
  // - Supabase Storage URL 은 Phase 1.2 T-008 에서 추가 예정
  // 번들 최적화 — barrel import 가 큰 패키지를 자동으로 개별 모듈 import 로 변환(tree-shaking↑).
  // 동작 변화 없음. cacheComponents 는 위 주석대로 의도적으로 OFF 유지.
  experimental: {
    optimizePackageImports: ["lucide-react", "radix-ui"],
  },
  images: {
    remotePatterns: [
      {
        // Phase 1.1 더미 데이터 placeholder (lib/dummy/circles.ts) — T-009 시점 제거 예정
        protocol: "https",
        hostname: "picsum.photos",
      },
      {
        // Supabase Storage: circles-public 버킷 공개 이미지 — T-008 추가
        protocol: "https",
        hostname: "qugoxkrwlejeqarijztt.supabase.co",
        pathname: "/storage/v1/object/public/circles-public/**",
      },
    ],
  },
};

export default nextConfig;
