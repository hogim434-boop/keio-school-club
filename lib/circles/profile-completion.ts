/**
 * lib/circles/profile-completion.ts
 *
 * 프로필 完成度(보강) 계산 — 순수 함수.
 *
 * 배경(2026-05 A안): 동아리 등록은 핵심만 받고, 나머지 선택 항목은 승인 후
 * 마이페이지에서 점진적으로 채우게 한다. 이 함수는 "사후 보강 대상 6항목"이
 * 얼마나 채워졌는지를 % 와 미완성 목록으로 반환한다.
 *
 * 필수 등록 항목(이름·카테고리·団体区分·活動頻度)은 항상 채워져 있으므로
 * 완성도 계산에 넣지 않는다 — 게이지가 "보강 진행률" 신호로 작동하도록.
 */

/** 完成度 항목 하나 */
export interface CompletionItem {
  /** 식별 키 (편집폼 딥링크 분기에 사용) */
  key: "cover" | "description" | "time_band" | "days" | "member_band" | "tags";
  /** UI 라벨(일본어) */
  label_ja: string;
  /** 채워졌는지 여부 */
  done: boolean;
}

/** computeProfileCompletion 반환 타입 */
export interface ProfileCompletion {
  /** 0~100 정수 (채운 항목 / 전체 항목) */
  percent: number;
  doneCount: number;
  totalCount: number;
  /** 전체 항목(완료·미완료 포함) */
  items: CompletionItem[];
  /** 미완성 항목만 */
  missing: CompletionItem[];
}

/**
 * computeProfileCompletion 가 참조하는 최소 필드.
 * MyCircle(마이페이지) 과 CircleDetail(상세 페이지) 모두 호환되도록
 * 배열 필드는 optional 로 둔다(CircleDetail.activity_time_band 가 optional).
 */
export interface CompletionInput {
  cover_image_url: string | null;
  description: string;
  activity_time_band?: readonly unknown[];
  activity_days: string;
  member_band: unknown | null;
  tags?: readonly unknown[];
}

/**
 * 사후 보강 6항목의 완성도를 계산한다.
 * 항목: 커버 / 소개 / 活動時間帯 / 活動曜日 / 会員数 / タグ.
 */
export function computeProfileCompletion(circle: CompletionInput): ProfileCompletion {
  const items: CompletionItem[] = [
    { key: "cover", label_ja: "カバー画像", done: Boolean(circle.cover_image_url) },
    {
      key: "description",
      label_ja: "サークル紹介",
      done: circle.description.trim().length > 0,
    },
    {
      key: "time_band",
      label_ja: "活動時間帯",
      done: (circle.activity_time_band ?? []).length > 0,
    },
    { key: "days", label_ja: "活動曜日", done: circle.activity_days.trim().length > 0 },
    { key: "member_band", label_ja: "会員数", done: circle.member_band != null },
    { key: "tags", label_ja: "タグ", done: (circle.tags ?? []).length > 0 },
  ];

  const doneCount = items.filter((i) => i.done).length;
  const totalCount = items.length;
  const percent = Math.round((doneCount / totalCount) * 100);

  return {
    percent,
    doneCount,
    totalCount,
    items,
    missing: items.filter((i) => !i.done),
  };
}
