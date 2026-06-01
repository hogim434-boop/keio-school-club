# T-008: `さがす` 검색·필터·정렬 강화

| 항목 | 내용 |
|---|---|
| **Phase** | 1-2 |
| **우선순위** | High |
| **예상 소요** | 3일 |
| **의존성** | T-001 |
| **관련 기능 ID** | F010 (횡단 검색) · F014 (정렬) |
| **PRD 참조** | PRD 5-2 |

## 산출물

- `app/(tabs)/search/page.tsx` 강화 — Server Component
- `lib/supabase/queries/circles-public.ts` — `unstable_cache` + `tags:["circles:public"]`
- 다단계 필터 UI (카테고리·태그·활동 빈도) + 정렬 4종

## 검증 기준

- 검색 결과 ≥ 30건 표시 (시드 데이터 기준)
- 필터 조합 (예: 文化系 + 週1回) 후 결과 좁혀짐
- 정렬 4종 (활동 빈도 / 인기도 / 가나다순 / 최근 활동순) 동작
- 캐시: 같은 필터 재진입 시 빠른 응답

## 세부 작업

- [ ] 검색 입력 컴포넌트 (`<Input>` + debounce 300ms)
- [ ] 필터 UI — `<Select>` 또는 chips 형식
- [ ] 정렬 드롭다운
- [ ] `lib/supabase/queries/circles-public.ts` — anon client + `unstable_cache`
- [ ] 결과 카드 — 이름·카테고리·태그·활동 빈도·썸네일
- [ ] 빈 상태 카피 「該当するサークル·部活動が見つかりませんでした」
- [ ] 페이지네이션 또는 무한 스크롤 (선택, MVP 페이지네이션)

## 위험·주의사항

- ⚠️ **`unstable_cache` revalidate** — 운영자 동아리 수정 시 `revalidateTag("circles:public")` 호출 필수.
- ⚠️ **검색어 SQL injection** — Supabase client 의 `.ilike()` 사용 시 자동 이스케이프되지만 `%` 문자는 wildcard 로 처리됨에 유의.
- ⚠️ **「公認」 카테고리 금지** — 카테고리 시드에 公認 사용하지 말 것 [[avoid-koujin-wording]].

## 코드 스니펫

```typescript
// lib/supabase/queries/circles-public.ts
import { unstable_cache } from "next/cache";
import { createAnonClient } from "@/lib/supabase/anon";

export const searchPublicCircles = unstable_cache(
  async (params: { q?: string; category?: string; sort?: string }) => {
    const supabase = createAnonClient();
    let query = supabase.from("circles").select("*").eq("status", "active");
    if (params.q) query = query.ilike("name", `%${params.q}%`);
    if (params.category) query = query.eq("category", params.category);
    if (params.sort === "recent") query = query.order("updated_at", { ascending: false });
    return (await query).data ?? [];
  },
  ["circles:public:search"],
  { tags: ["circles:public"], revalidate: 300 }
);
```

## 테스트 체크리스트

- [ ] 검색어 「テニス」 → 관련 동아리만 표시
- [ ] 카테고리 「文化系」 필터 → 결과 좁혀짐
- [ ] 정렬 변경 후 순서 바뀜
- [ ] 빈 결과 시 안내 카피 표시
