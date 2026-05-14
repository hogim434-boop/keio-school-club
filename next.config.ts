import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // next/image 외부 도메인 허용
  // - picsum.photos: Phase 1.1 의 더미 데이터 placeholder (lib/dummy/circles.ts)
  // - Supabase Storage URL 은 Phase 1.2 T-008 에서 추가 예정
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
    ],
  },
};

export default nextConfig;
