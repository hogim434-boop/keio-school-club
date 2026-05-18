import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
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
