import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // cacheComponents 는 의도적으로 켜지 않음.
  // 이 앱은 인증(쿠키)·필터/검색·즐겨찾기 등 대부분이 동적이라 캐시 이득이 작은 반면,
  // 켜 두면 dev(캐시 OFF)와 Vercel(캐시 ON 적극)의 동작이 갈려
  // 「localhost 정상 / Vercel stale」 갭이 생긴다. 끄면 양쪽이 동일하게 「매번 최신」으로 동작.
  // next/image 외부 도메인 허용
  // - picsum.photos: Phase 1.1 의 더미 데이터 placeholder (lib/dummy/circles.ts)
  // - Supabase Storage URL 은 Phase 1.2 T-008 에서 추가 예정
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
        hostname: "wmiaxjgitpahribjrdyh.supabase.co",
        pathname: "/storage/v1/object/public/circles-public/**",
      },
    ],
  },
};

export default nextConfig;
