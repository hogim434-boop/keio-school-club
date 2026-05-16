import Link from "next/link";

import { CircleAvatarCard } from "@/components/circles/circle-avatar-card";
import { CATEGORIES, CATEGORY_LABELS } from "@/lib/constants/category";
import { getCirclesByCategory } from "@/lib/dummy/circles";

/**
 * 카테고리별 1시간 회전 가로 스크롤 섹션 (RSC).
 *
 * 회전 로직:
 * - `Math.floor(Date.now() / 3_600_000) % CATEGORIES.length` 로 hour-index 결정.
 * - 8 카테고리 × 1시간 → 8시간 1바퀴 deterministic 순환.
 * - cacheComponents:true 환경에서 `Date.now()` 호출은 자동 dynamic 마킹.
 *   부모 page 가 본문을 `<Suspense>` 로 감싸고 있어 추가 처리 불필요.
 *
 * 디자인:
 * - 원형 아바타 카드 (`CircleAvatarCard`) 를 모바일/데스크탑 공통 가로 스크롤로 노출.
 * - 헤더에 「今おすすめ · {현재 카테고리 라벨}」 + 「もっと見る」 링크.
 *   「もっと見る」 → `/circles?category={current}` 결과 모드 진입 (HomeCategoryGrid 와 동일 동선).
 *
 * 빈 카테고리 방어: items 0 건이면 section 자체 숨김.
 */
export async function HourlyCategoryStrip() {
  // 한 시간 단위로 회전하는 카테고리 인덱스 (8 시간 1 사이클)
  const hourIndex = Math.floor(Date.now() / 3_600_000) % CATEGORIES.length;
  const currentCategory = CATEGORIES[hourIndex];

  const circles = await getCirclesByCategory(currentCategory);
  const items = circles.slice(0, 10);
  if (items.length === 0) return null;

  return (
    <section className="space-y-3" aria-label={`今おすすめ：${CATEGORY_LABELS[currentCategory]}`}>
      {/* 헤더 — 현재 카테고리 강조 + もっと見る 진입점 */}
      <header className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          今おすすめ <span className="text-muted-foreground font-normal">·</span>{" "}
          <span className="text-primary">{CATEGORY_LABELS[currentCategory]}</span>
        </h2>
        <Link
          href={`/circles?category=${currentCategory}`}
          className="text-muted-foreground hover:text-foreground text-sm"
        >
          もっと見る
        </Link>
      </header>

      {/* 모바일/데스크탑 공통 가로 스크롤 — snap-x 로 카드 단위 정렬 */}
      <ul
        className={[
          "-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4",
          "[scroll-padding-inline:1rem] [overscroll-behavior-x:contain]",
        ].join(" ")}
      >
        {items.map((circle) => (
          <li key={circle.id} className="snap-start">
            <CircleAvatarCard circle={circle} />
          </li>
        ))}
      </ul>
    </section>
  );
}
