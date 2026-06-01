/**
 * lib/supabase/queries/circle-galleries.ts
 *
 * circle_galleries 테이블 fetch 함수 모음.
 * T-011 활동 갤러리 표시 기능에서 사용.
 *
 * 특징:
 * - 전체 공개(SELECT 정책: true)이므로 createAnonClient() + unstable_cache 사용 가능
 * - 학기(semester) 컬럼이 없으므로 taken_at 기반으로 학기 필터링
 *
 * 업로더 정보(profiles JOIN)는 현재 UI에서 사용하지 않아 select 에 포함하지 않음.
 * 향후 「○○ 가 업로드」 UI 노출이 필요해지면 `profiles(display_name)` 형태로 추가 가능.
 * (profiles 테이블에는 `name`·`avatar_url` 컬럼이 없으며 `display_name` 만 존재함에 주의)
 */

import { unstable_cache } from "next/cache";

import { createAnonClient } from "@/lib/supabase/anon";

// ============================================================
// 타입 정의
// ============================================================

/** 갤러리 한 장 — circle_galleries 행 (업로더 정보는 현재 UI 미사용으로 제외) */
export interface GalleryImage {
  id: string;
  circle_id: string;
  image_url: string;
  caption: string;
  /** 촬영일 ISO 문자열 (YYYY-MM-DD형태로 입력 권장). null이면 created_at 기준 */
  taken_at: string | null;
  created_at: string;
}

/**
 * 학기 필터 값.
 * - "all": 전체
 * - "YYYY_spring": 해당 연도 봄 학기 (4월~9월)
 * - "YYYY_fall": 해당 연도 가을 학기 (10월~3월)
 */
export type SemesterFilter = "all" | `${number}_spring` | `${number}_fall`;

// ============================================================
// 내부 헬퍼
// ============================================================

/** Supabase 행 → GalleryImage 도메인 타입 변환 */
function toGalleryImage(row: Record<string, unknown>): GalleryImage {
  return {
    id: row.id as string,
    circle_id: row.circle_id as string,
    image_url: row.image_url as string,
    caption: (row.caption as string) ?? "",
    taken_at: (row.taken_at as string | null) ?? null,
    created_at: row.created_at as string,
  };
}

// ============================================================
// 공개 fetch 함수
// ============================================================

/**
 * 동아리 갤러리 목록 취득 — アルバム 탭에서 사용.
 *
 * 정렬: taken_at DESC (촬영일 기준 내림차순). taken_at 이 null인 경우 created_at 기준으로 폴백.
 *
 * 캐싱 정책:
 * - circle_galleries SELECT RLS는 전체 공개(true)이므로 anon 클라이언트로 읽기 가능.
 * - unstable_cache 60초 TTL. tags:["circles", "galleries"] 로 무효화.
 *
 * @param circleId 서클 UUID
 * @param limit 취득 건수 (기본 200)
 */
export const listGalleries = unstable_cache(
  async (circleId: string, limit = 200): Promise<GalleryImage[]> => {
    const supabase = createAnonClient();

    const { data, error } = await supabase
      .from("circle_galleries")
      .select("*")
      .eq("circle_id", circleId)
      .order("taken_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[listGalleries]", error.message);
      return [];
    }

    return (data ?? []).map((row) => toGalleryImage(row as Record<string, unknown>));
  },
  ["galleries-by-circle"],
  { revalidate: 60, tags: ["circles", "galleries"] }
);

// ============================================================
// 학기 필터 유틸리티
// ============================================================

/**
 * 연도·계절로부터 SemesterFilter 값을 생성하는 헬퍼.
 *
 * @example
 * makeSemesterFilter(2026, "spring") // → "2026_spring"
 */
export function makeSemesterFilter(year: number, season: "spring" | "fall"): SemesterFilter {
  return `${year}_${season}` as SemesterFilter;
}

/**
 * 현재 날짜 기준으로 현재 학기 필터 값을 반환.
 * 봄 학기: 4월~9월 / 가을 학기: 10월~3월 (다음 연도)
 */
export function currentSemesterFilter(): SemesterFilter {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-based
  const year = now.getFullYear();

  if (month >= 4 && month <= 9) {
    return makeSemesterFilter(year, "spring");
  } else {
    // 10~12월은 현재 연도 가을 학기, 1~3월은 이전 연도 가을 학기
    const fallYear = month >= 10 ? year : year - 1;
    return makeSemesterFilter(fallYear, "fall");
  }
}

/**
 * SemesterFilter 값 → 일본어 표시 라벨 변환.
 *
 * @example
 * semesterLabel("2026_spring") // → "2026年 春学期"
 * semesterLabel("all")          // → "すべて"
 */
export function semesterLabel(filter: SemesterFilter): string {
  if (filter === "all") return "すべて";
  const [year, season] = filter.split("_");
  return `${year}年 ${season === "spring" ? "春学期" : "秋学期"}`;
}

/**
 * taken_at (または created_at) が指定した学期に含まれるか判定.
 * 봄 학기: 4월 1일 ~ 9월 30일
 * 가을 학기: 10월 1일 ~ 翌3월 31일
 *
 * @param dateStr ISO 날짜 문자열 (taken_at または created_at)
 * @param filter 학기 필터 값
 */
export function isInSemester(dateStr: string | null, filter: SemesterFilter): boolean {
  if (filter === "all") return true;
  if (!dateStr) return false;

  const date = new Date(dateStr);
  const [yearStr, season] = filter.split("_");
  const year = parseInt(yearStr, 10);

  if (season === "spring") {
    // 봄: year년 4월 1일 ~ year년 9월 30일
    const start = new Date(year, 3, 1); // 4월 1일 (0-indexed)
    const end = new Date(year, 8, 30, 23, 59, 59); // 9월 30일
    return date >= start && date <= end;
  } else {
    // 가을: year년 10월 1일 ~ (year+1)년 3월 31일
    const start = new Date(year, 9, 1); // 10월 1일
    const end = new Date(year + 1, 2, 31, 23, 59, 59); // 翌3월 31일
    return date >= start && date <= end;
  }
}

/**
 * 갤러리 이미지 배열에서 존재하는 학기 목록을 추출.
 * 탭 필터 버튼 목록 생성에 사용.
 * 최신 학기 순(내림차순) 정렬.
 */
export function extractSemesters(images: GalleryImage[]): SemesterFilter[] {
  const semesterSet = new Set<SemesterFilter>();

  for (const img of images) {
    const dateStr = img.taken_at ?? img.created_at;
    if (!dateStr) continue;

    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    if (month >= 4 && month <= 9) {
      semesterSet.add(makeSemesterFilter(year, "spring"));
    } else {
      const fallYear = month >= 10 ? year : year - 1;
      semesterSet.add(makeSemesterFilter(fallYear, "fall"));
    }
  }

  // 최신 학기 순 정렬 (문자열 내림차순이 연도 내림차순과 일치)
  return Array.from(semesterSet).sort((a, b) => b.localeCompare(a));
}
