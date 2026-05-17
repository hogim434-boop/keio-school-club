import { describe, expect, it } from "vitest";

import { DUMMY_CIRCLES, filterCircles } from "@/lib/dummy/circles";

describe("filterCircles — 단일 필터", () => {
  it("category=sports → 5건", async () => {
    const r = await filterCircles({ category: ["sports"] });
    expect(r.total).toBe(5);
    expect(r.items.every((c) => c.category === "sports")).toBe(true);
  });

  it("officialType=[athletics] → 3건", async () => {
    const r = await filterCircles({ officialType: ["athletics"] });
    expect(r.total).toBe(3);
    expect(r.items.every((c) => c.official_type === "athletics")).toBe(true);
  });

  it("tags=[beginner_ok] → 더미에서 beginner_ok 태그 포함 단체만", async () => {
    const expectedCount = DUMMY_CIRCLES.filter((c) => c.tags.includes("beginner_ok")).length;
    const r = await filterCircles({ tags: ["beginner_ok"] });
    expect(r.total).toBe(expectedCount);
    expect(r.items.every((c) => c.tags.includes("beginner_ok"))).toBe(true);
  });
});

describe("filterCircles — 복합 + 페이지네이션", () => {
  it("category=sports + officialType=[athletics] → 3건 (sports 내 athletics)", async () => {
    const r = await filterCircles({ category: ["sports"], officialType: ["athletics"] });
    expect(r.total).toBe(3);
    expect(r.items.every((c) => c.category === "sports" && c.official_type === "athletics")).toBe(
      true
    );
  });

  it("q='慶應' name 부분 매칭 (case-insensitive)", async () => {
    const r = await filterCircles({ q: "慶應" });
    expect(r.total).toBeGreaterThan(0);
    expect(r.items.every((c) => c.name.includes("慶應"))).toBe(true);
  });

  it("pageSize=10 → 1페이지 10건, totalPages=3 (30건 기준)", async () => {
    const r = await filterCircles({ pageSize: 10, page: 1 });
    expect(r.items.length).toBeLessThanOrEqual(10);
    expect(r.totalPages).toBe(Math.ceil(30 / 10));
    expect(r.page).toBe(1);
  });

  it("page 가 totalPages 초과하면 마지막 페이지로 클램프", async () => {
    const r = await filterCircles({ pageSize: 10, page: 99 });
    expect(r.page).toBe(r.totalPages);
  });

  it("결과 0건일 때 totalPages 는 최소 1", async () => {
    const r = await filterCircles({ q: "存在しない団体XYZ" });
    expect(r.total).toBe(0);
    expect(r.items).toHaveLength(0);
    expect(r.totalPages).toBe(1);
  });
});

describe("filterCircles — 신규 5종 필터", () => {
  it("activityDays=['火'] → activity_days 에 '火' 가 포함된 단체만 (AND substring)", async () => {
    // 더미 데이터에서 직접 기대값 산출
    const expectedCount = DUMMY_CIRCLES.filter((c) => c.activity_days.includes("火")).length;
    expect(expectedCount).toBeGreaterThan(0); // 더미에 火 포함 단체 존재 확인

    const r = await filterCircles({ activityDays: ["火"] });
    expect(r.total).toBe(expectedCount);
    // 모든 결과가 activity_days 에 '火' 를 포함하는지 확인
    // (filterCircles 는 CircleSummary 반환이라 activity_days 없음 → DUMMY_CIRCLES 에서 검증)
    const resultIds = new Set(r.items.map((c) => c.id));
    for (const circle of DUMMY_CIRCLES) {
      if (resultIds.has(circle.id)) {
        expect(circle.activity_days, `circle ${circle.id}`).toContain("火");
      }
    }
  });

  it("memberSize='small' → member_count <= 30 인 단체만", async () => {
    const expectedCount = DUMMY_CIRCLES.filter((c) => c.member_count <= 30).length;
    expect(expectedCount).toBeGreaterThan(0);

    const r = await filterCircles({ memberSize: "small" });
    expect(r.total).toBe(expectedCount);

    // 결과 단체의 member_count 가 모두 30 이하인지 확인
    const resultIds = new Set(r.items.map((c) => c.id));
    for (const circle of DUMMY_CIRCLES) {
      if (resultIds.has(circle.id)) {
        expect(circle.member_count, `circle ${circle.id}`).toBeLessThanOrEqual(30);
      }
    }
  });

  it("recruitmentStatus=['open'] → recruitment_status=open 인 단체만 (OR 매칭)", async () => {
    // 시드 분포: seq 1~18 → open (18건)
    const expectedCount = DUMMY_CIRCLES.filter((c) => c.recruitment_status === "open").length;
    expect(expectedCount).toBe(18);

    const r = await filterCircles({ recruitmentStatus: ["open"] });
    expect(r.total).toBe(18);

    // 결과 단체의 recruitment_status 가 모두 open 인지 확인
    const resultIds = new Set(r.items.map((c) => c.id));
    for (const circle of DUMMY_CIRCLES) {
      if (resultIds.has(circle.id)) {
        expect(circle.recruitment_status, `circle ${circle.id}`).toBe("open");
      }
    }
  });

  it("activityTimeBand=['weekend'] → activity_time_band 에 weekend 포함 단체만 (OR 매칭)", async () => {
    // 시드: seq % 3 === 1 → [weekday_night, weekend], seq % 3 === 0 → [weekday_day, weekend]
    // 즉 weekend 포함: 20건
    const expectedCount = DUMMY_CIRCLES.filter((c) =>
      c.activity_time_band?.includes("weekend")
    ).length;
    expect(expectedCount).toBe(20);

    const r = await filterCircles({ activityTimeBand: ["weekend"] });
    expect(r.total).toBe(20);

    // 결과 단체의 activity_time_band 에 weekend 가 포함되는지 확인
    const resultIds = new Set(r.items.map((c) => c.id));
    for (const circle of DUMMY_CIRCLES) {
      if (resultIds.has(circle.id)) {
        expect(circle.activity_time_band, `circle ${circle.id}`).toContain("weekend");
      }
    }
  });
});
