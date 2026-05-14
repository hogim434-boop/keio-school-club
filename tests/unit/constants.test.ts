import { describe, expect, it } from "vitest";

import {
  ACTIVITY_FREQUENCIES,
  ACTIVITY_FREQUENCY_LABELS,
} from "@/lib/constants/activity-frequency";
import { CATEGORIES, CATEGORY_LABELS } from "@/lib/constants/category";
import { CIRCLE_STATUSES, CIRCLE_STATUS_LABELS } from "@/lib/constants/circle-status";
import { OFFICIAL_TYPES, OFFICIAL_TYPE_LABELS } from "@/lib/constants/official-type";
import { TAG_KINDS, TAG_KIND_LABELS } from "@/lib/constants/tag-kind";

// T-003 의 lib/constants/* 매핑 정합성 회귀 가드.
// 각 도메인 enum 의 KEYS / LABELS 가 같은 개수와 키를 가지는지 검증한다.
describe("category constants", () => {
  it("정확히 8종 카테고리가 정의되어 있다", () => {
    expect(CATEGORIES).toHaveLength(8);
  });

  it("모든 카테고리 키에 일본어 라벨이 매핑되어 있다", () => {
    for (const key of CATEGORIES) {
      expect(CATEGORY_LABELS[key]).toBeTruthy();
    }
  });
});

describe("official type constants (학생 단체 통합 정책)", () => {
  it("정확히 5종 분류가 정의되어 있다 (athletics/official/unofficial/intercollegiate/other)", () => {
    expect(OFFICIAL_TYPES).toHaveLength(5);
    expect(OFFICIAL_TYPES).toEqual([
      "athletics",
      "official",
      "unofficial",
      "intercollegiate",
      "other",
    ]);
  });

  it("모든 분류에 일본어 라벨이 매핑되어 있다", () => {
    for (const key of OFFICIAL_TYPES) {
      expect(OFFICIAL_TYPE_LABELS[key]).toBeTruthy();
    }
    expect(OFFICIAL_TYPE_LABELS.athletics).toBe("体育会");
    expect(OFFICIAL_TYPE_LABELS.official).toBe("公認");
    expect(OFFICIAL_TYPE_LABELS.unofficial).toBe("非公認");
    expect(OFFICIAL_TYPE_LABELS.intercollegiate).toBe("インカレ");
    expect(OFFICIAL_TYPE_LABELS.other).toBe("その他");
  });
});

describe("activity frequency constants", () => {
  it("정확히 3종 활동빈도가 정의되어 있다", () => {
    expect(ACTIVITY_FREQUENCIES).toHaveLength(3);
  });

  it("모든 활동빈도에 일본어 라벨이 매핑되어 있다", () => {
    for (const key of ACTIVITY_FREQUENCIES) {
      expect(ACTIVITY_FREQUENCY_LABELS[key]).toBeTruthy();
    }
  });
});

describe("circle status constants", () => {
  it("정확히 3종 status (pending/approved/rejected)", () => {
    expect(CIRCLE_STATUSES).toEqual(["pending", "approved", "rejected"]);
  });

  it("모든 status 에 일본어 뱃지 라벨이 매핑되어 있다 (審査中/公開中/却下)", () => {
    expect(CIRCLE_STATUS_LABELS.pending).toBe("審査中");
    expect(CIRCLE_STATUS_LABELS.approved).toBe("公開中");
    expect(CIRCLE_STATUS_LABELS.rejected).toBe("却下");
  });
});

describe("tag kind constants", () => {
  it("정확히 4종 태그 분류가 정의되어 있다", () => {
    expect(TAG_KINDS).toHaveLength(4);
  });

  it("모든 태그 분류에 그룹 헤더 일본어 라벨이 매핑되어 있다", () => {
    for (const key of TAG_KINDS) {
      expect(TAG_KIND_LABELS[key]).toBeTruthy();
    }
  });
});
