"use server";

/**
 * app/search/actions.ts
 *
 * 검색 페이지의 Server Actions.
 * ApplyButton(Client Component)이 draft 변경 시 카운트 미리보기를 위해 호출.
 */

import { countFilteredCircles } from "@/lib/supabase/queries/circles";
import type { CirclesSearchParams } from "@/lib/circles/search-params";

/**
 * 검색 조건에 맞는 서클 수 반환 — 적용 전 카운트 미리보기용.
 *
 * 이전에는 filterCircles({ all: true })로 모든 컬럼 + 태그 JOIN 데이터를 전부 받아온 뒤
 * total만 꺼내 쓰는 낭비가 있었다.
 * countFilteredCircles는 `.select("id", { head: true })`로 실제 행을 0개 반환해
 * 네트워크 전송·메모리 사용을 최소화한 경량 쿼리다.
 *
 * @param draft 현재 draft 검색 조건
 * @returns 매칭 서클 수
 */
export async function getFilterCount(draft: Partial<CirclesSearchParams>): Promise<number> {
  return countFilteredCircles(draft);
}
