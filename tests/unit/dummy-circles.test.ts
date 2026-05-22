import { describe, expect, it } from "vitest";

import {
  DUMMY_CIRCLES,
  DUMMY_CIRCLES_DISTRIBUTION,
  getCircleById,
  getCirclesByCategory,
  getPopularCircles,
} from "@/lib/dummy/circles";

// Phase 1.1 더미 데이터의 무결성 회귀 가드.
// 분포·연락처·태그 등의 정책이 무너지지 않도록 expected 객체와 동적 비교.

describe("DUMMY_CIRCLES 기본 무결성", () => {
  it(`총 ${DUMMY_CIRCLES_DISTRIBUTION.total}건 정의되어 있다`, () => {
    expect(DUMMY_CIRCLES).toHaveLength(DUMMY_CIRCLES_DISTRIBUTION.total);
  });

  it("모든 단체의 id 가 고유하다", () => {
    const ids = new Set(DUMMY_CIRCLES.map((c) => c.id));
    expect(ids.size).toBe(DUMMY_CIRCLES.length);
  });

  it("모든 단체의 cover_image_url 이 picsum.photos seed 패턴이다", () => {
    for (const circle of DUMMY_CIRCLES) {
      expect(circle.cover_image_url).toMatch(/^https:\/\/picsum\.photos\/seed\/[\w-]+\/800\/450$/);
    }
  });

  it("모든 단체가 approved status 다 (Phase 1.1 더미는 공개 가능 데이터만)", () => {
    for (const circle of DUMMY_CIRCLES) {
      expect(circle.status).toBe("approved");
    }
  });
});

describe("DUMMY_CIRCLES 분포 (학생 단체 통합 정책)", () => {
  it("카테고리 분포가 DUMMY_CIRCLES_DISTRIBUTION.category 와 정확히 일치", () => {
    for (const [category, expected] of Object.entries(DUMMY_CIRCLES_DISTRIBUTION.category)) {
      const actual = DUMMY_CIRCLES.filter((c) => c.category === category).length;
      expect(actual, `category=${category}`).toBe(expected);
    }
  });

  it("official_type 분포가 DUMMY_CIRCLES_DISTRIBUTION.official_type 와 정확히 일치 (公認 한정 인상 방지)", () => {
    for (const [officialType, expected] of Object.entries(
      DUMMY_CIRCLES_DISTRIBUTION.official_type
    )) {
      const actual = DUMMY_CIRCLES.filter((c) => c.official_type === officialType).length;
      expect(actual, `official_type=${officialType}`).toBe(expected);
    }
  });

  it("5종 official_type 모두 1개 이상 존재 (公認/非公認/インカレ 가 모두 포함)", () => {
    const types = new Set(DUMMY_CIRCLES.map((c) => c.official_type));
    expect(types.size).toBe(5);
  });
});

describe("DUMMY_CIRCLES 상세 필드 (T-012 보강)", () => {
  it("모든 단체에 activity_days 가 비어있지 않다", () => {
    for (const circle of DUMMY_CIRCLES) {
      expect(circle.activity_days, `circle ${circle.id}`).toBeTruthy();
      expect(circle.activity_days.length).toBeGreaterThan(0);
    }
  });

  it("모든 단체의 member_band 가 유효한 enum 값이다", () => {
    // member_count → member_band 로 교체 (2026-05 개편)
    const VALID_BANDS = [
      "under_10",
      "from_11_to_30",
      "from_31_to_50",
      "from_51_to_100",
      "over_100",
    ];
    for (const circle of DUMMY_CIRCLES) {
      // 더미 데이터는 모두 member_band 값을 가짐 (nullable 이지만 더미는 전부 설정)
      expect(VALID_BANDS, `circle ${circle.id}`).toContain(circle.member_band);
    }
  });

  it("모든 단체의 갤러리는 4장이며 sort_order 가 0..3 오름차순", () => {
    for (const circle of DUMMY_CIRCLES) {
      expect(circle.images, `circle ${circle.id}`).toHaveLength(4);
      for (let i = 0; i < circle.images.length; i++) {
        expect(circle.images[i].sort_order).toBe(i);
      }
    }
  });

  it("모든 갤러리 이미지가 picsum.photos seed-img-N 패턴이다", () => {
    for (const circle of DUMMY_CIRCLES) {
      for (const img of circle.images) {
        expect(img.image_url).toMatch(
          /^https:\/\/picsum\.photos\/seed\/[\w-]+-img-\d+\/1200\/800$/
        );
      }
    }
  });
});

describe("DUMMY_CIRCLES 연락처·태그 정책", () => {
  it("모든 단체에 연락처(IG/X/LINE) 1개 이상이 있다", () => {
    for (const circle of DUMMY_CIRCLES) {
      const hasContact = Boolean(
        circle.contact_instagram || circle.contact_x || circle.contact_line
      );
      expect(hasContact, `circle ${circle.id} (${circle.name}) has at least one contact`).toBe(
        true
      );
    }
  });

  it("모든 단체의 태그 개수가 3~5 범위", () => {
    for (const circle of DUMMY_CIRCLES) {
      expect(circle.tags.length, `circle ${circle.id} tags`).toBeGreaterThanOrEqual(3);
      expect(circle.tags.length, `circle ${circle.id} tags`).toBeLessThanOrEqual(5);
    }
  });

  it("once_a_week 슬러그가 더미 데이터에 0회 등장 — 활動頻度 섹션과 의미 중복 제거 회귀 방지", () => {
    // once_a_week 는 TAG_SEEDS 에서도 제거됨 (PR: FilterPanel 호흡 보강)
    const hasOnceAWeek = DUMMY_CIRCLES.some((c) => c.tags.includes("once_a_week"));
    expect(hasOnceAWeek).toBe(false);
  });
});

describe("DUMMY_CIRCLES 신규 필드 분포 (recruitment_status · activity_time_band)", () => {
  it("모든 단체에 recruitment_status 가 정의되어 있다", () => {
    for (const circle of DUMMY_CIRCLES) {
      expect(circle.recruitment_status, `circle ${circle.id}`).toBeDefined();
    }
  });

  it("recruitment_status 분포: newcomer_only 8 + year_round 22 = 30 (open 폐기)", () => {
    const newcomer = DUMMY_CIRCLES.filter((c) => c.recruitment_status === "newcomer_only").length;
    const yearRound = DUMMY_CIRCLES.filter((c) => c.recruitment_status === "year_round").length;

    expect(newcomer).toBe(8);
    expect(yearRound).toBe(22);
    expect(newcomer + yearRound).toBe(DUMMY_CIRCLES_DISTRIBUTION.total);
  });

  it("모든 단체에 activity_time_band 가 정의되어 있고 1개 이상이다", () => {
    for (const circle of DUMMY_CIRCLES) {
      expect(circle.activity_time_band, `circle ${circle.id}`).toBeDefined();
      expect(circle.activity_time_band!.length, `circle ${circle.id}`).toBeGreaterThan(0);
    }
  });

  it("activity_time_band 분포: 각 band 가 1건 이상 존재한다", () => {
    const weekdayDay = DUMMY_CIRCLES.filter((c) =>
      c.activity_time_band?.includes("weekday_day")
    ).length;
    const weekdayNight = DUMMY_CIRCLES.filter((c) =>
      c.activity_time_band?.includes("weekday_night")
    ).length;
    const weekend = DUMMY_CIRCLES.filter((c) => c.activity_time_band?.includes("weekend")).length;

    // 시드 분포 확인: weekday_night=20, weekend=20, weekday_day=10
    expect(weekdayDay).toBeGreaterThanOrEqual(1);
    expect(weekdayNight).toBeGreaterThanOrEqual(1);
    expect(weekend).toBeGreaterThanOrEqual(1);
  });

  it("activity_time_band 시드 결과: weekday_day=10, weekday_night=20, weekend=20", () => {
    const weekdayDay = DUMMY_CIRCLES.filter((c) =>
      c.activity_time_band?.includes("weekday_day")
    ).length;
    const weekdayNight = DUMMY_CIRCLES.filter((c) =>
      c.activity_time_band?.includes("weekday_night")
    ).length;
    const weekend = DUMMY_CIRCLES.filter((c) => c.activity_time_band?.includes("weekend")).length;

    expect(weekdayDay).toBe(10);
    expect(weekdayNight).toBe(20);
    expect(weekend).toBe(20);
  });
});

describe("helper 함수", () => {
  it("getPopularCircles 가 view_count 내림차순으로 정렬되어 있다", async () => {
    const popular = await getPopularCircles(6);
    expect(popular).toHaveLength(6);
    for (let i = 0; i < popular.length - 1; i++) {
      expect(popular[i].view_count).toBeGreaterThanOrEqual(popular[i + 1].view_count);
    }
  });

  it("getCircleById 가 존재하는 id 에 대해 CircleDetail 을 반환한다", async () => {
    const first = DUMMY_CIRCLES[0];
    const found = await getCircleById(first.id);
    expect(found).not.toBeNull();
    expect(found?.id).toBe(first.id);
  });

  it("getCircleById 가 존재하지 않는 id 에 대해 null 을 반환한다", async () => {
    const found = await getCircleById("ffffffff-ffff-4000-8000-ffffffffffff");
    expect(found).toBeNull();
  });

  it("getCirclesByCategory 가 해당 카테고리의 단체만 반환한다", async () => {
    const sports = await getCirclesByCategory("sports");
    expect(sports).toHaveLength(DUMMY_CIRCLES_DISTRIBUTION.category.sports);
    for (const circle of sports) {
      expect(circle.category).toBe("sports");
    }
  });
});
