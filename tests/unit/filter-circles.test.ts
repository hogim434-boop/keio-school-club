import { describe, expect, it } from "vitest";

import { DUMMY_CIRCLES, filterCircles } from "@/lib/dummy/circles";

describe("filterCircles — 단일 필터", () => {
  it("category=sports → 5건", async () => {
    const r = await filterCircles({ category: "sports" });
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

  it("feeMax=5000 → annual_fee_yen <= 5000 인 단체만", async () => {
    const expectedCount = DUMMY_CIRCLES.filter((c) => c.annual_fee_yen <= 5000).length;
    const r = await filterCircles({ feeMax: 5000 });
    expect(r.total).toBe(expectedCount);
  });
});

describe("filterCircles — 복합 + 페이지네이션", () => {
  it("category=sports + officialType=[athletics] → 3건 (sports 내 athletics)", async () => {
    const r = await filterCircles({ category: "sports", officialType: ["athletics"] });
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
