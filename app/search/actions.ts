"use server";

/**
 * app/search/actions.ts
 *
 * 검색 페이지의 Server Actions.
 * ApplyButton(Client Component)이 draft 변경 시 카운트 미리보기를 위해 호출.
 */

import { filterCircles } from "@/lib/supabase/queries/circles";
import type { CirclesSearchParams } from "@/lib/circles/search-params";

/**
 * 검색 조건에 맞는 서클 수 반환 — 적용 전 카운트 미리보기용.
 * all:true 로 전체 조회하여 total만 반환 (페이지네이션 불필요).
 *
 * @param draft 현재 draft 검색 조건
 * @returns 매칭 서클 수
 */
export async function getFilterCount(draft: Partial<CirclesSearchParams>): Promise<number> {
  const { total } = await filterCircles({
    ...draft,
    all: true,
  });
  return total;
}
