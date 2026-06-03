"use server";

/**
 * app/favorites/actions.ts — 즐겨찾기 페이지 데이터 fetch 서버 액션.
 *
 * Direction A: 즐겨찾기는 게스트(무로그인) localStorage 기반이라 인증 불필요.
 * 클라이언트(FavoritesPageBody)가 localStorage 의 circle id 목록을 보내면
 * 해당하는 approved 서클을 반환한다.
 */

import { getCirclesByIds } from "@/lib/supabase/queries/circles";
import type { CircleSummary } from "@/lib/types/domain";

export async function getFavoriteCircles(ids: string[]): Promise<CircleSummary[]> {
  return getCirclesByIds(ids);
}
