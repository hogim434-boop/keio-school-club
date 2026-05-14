import { redirect } from "next/navigation";

/**
 * 루트 경로 — /circles 통합 페이지로 redirect
 * RSC server-side throw 패턴 (cacheComponents 100% 호환)
 */
export default function Home() {
  redirect("/circles");
}
