/**
 * lib/circles/profile-completion.ts
 *
 * 프로필 完成度(보강) 계산 — 순수 함수.
 *
 * 배경(2026-05 A안): 동아리 등록은 핵심만 받고, 나머지 선택 항목은 승인 후
 * 마이페이지에서 점진적으로 채우게 한다.
 *
 * 2026-05 유도 강화(A+B+C):
 *  - (A) 항목마다 "채우면 좋은 이유(benefit_ja)" 를 붙여 동기 부여.
 *  - (B) 진행 단계 레이블(getCompletionStage) — 設定中 → 入力中 → もうすぐ完成 → 完成.
 *  - (C) "다음에 채우면 좋은 항목 1개"(nextRecommended) 를 골라 행동을 콕 집어준다.
 *  - Endowed Progress Effect: 이미 등록 완료된 "基本情報" 를 완료 1칸으로 포함해
 *    신규 동아리가 0% 가 아니라 약 14%(1/7) 부터 시작하도록 한다(막막함 완화).
 */

/** 完成度 항목의 식별 키 */
export type CompletionKey =
  | "basic"
  | "cover"
  | "description"
  | "time_band"
  | "days"
  | "member_band"
  | "tags";

/** 完成度 항목 하나 */
export interface CompletionItem {
  /** 식별 키 (편집폼 딥링크 분기에 사용) */
  key: CompletionKey;
  /** UI 라벨(일본어) */
  label_ja: string;
  /** 채워졌는지 여부 */
  done: boolean;
  /** 미완성일 때 보여줄 한 줄 혜택 문구(일본어). basic 처럼 항상 done 인 항목은 없음. */
  benefit_ja?: string;
}

/** 진행 단계 레이블 (B) — 색 톤은 컴포넌트에서 해석 */
export interface CompletionStage {
  /** 단계 이름(일본어) */
  label_ja: string;
  /** 색 톤 키 — 컴포넌트가 Tailwind 클래스로 매핑 */
  tone: "muted" | "amber" | "navy" | "complete";
}

/** computeProfileCompletion 반환 타입 */
export interface ProfileCompletion {
  /** 0~100 정수 (채운 항목 / 전체 항목) */
  percent: number;
  doneCount: number;
  totalCount: number;
  /** 전체 항목(완료·미완료 포함) */
  items: CompletionItem[];
  /** 미완성 항목만 (우선순위 높은 순) */
  missing: CompletionItem[];
  /** (C) 다음에 채우길 추천하는 항목 1개. 모두 완료면 null */
  nextRecommended: CompletionItem | null;
  /** (B) 현재 진행 단계 레이블 */
  stage: CompletionStage;
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
 * 진행률(%) → 단계 레이블.
 * 시작점이 14%(1/7) 이므로 0% 구간은 실제로 나오지 않지만, 안전하게 < 40 을 設定中 으로 둔다.
 */
export function getCompletionStage(percent: number): CompletionStage {
  if (percent >= 100) return { label_ja: "完成", tone: "complete" };
  if (percent >= 70) return { label_ja: "もうすぐ完成", tone: "navy" };
  if (percent >= 40) return { label_ja: "入力中", tone: "amber" };
  return { label_ja: "設定中", tone: "muted" };
}

/**
 * 완성도를 계산한다.
 *
 * 항목 순서 = "다음 추천(nextRecommended)" 우선순위.
 *  紹介 > カバー画像 > タグ > 活動時間帯 > 活動曜日 > 会員数
 *  (검색 노출·신뢰에 가장 크게 기여하는 순서)
 *
 * 맨 앞 "基本情報" 는 등록 시 이미 완료된 항목 — 완료 1칸으로 포함해 시작점을 올린다(Endowed Progress).
 */
export function computeProfileCompletion(circle: CompletionInput): ProfileCompletion {
  const items: CompletionItem[] = [
    // 등록 시 이미 입력된 필수 정보 — 항상 done. 시작점을 0% 가 아니게 만드는 역할.
    { key: "basic", label_ja: "基本情報", done: true },
    {
      key: "description",
      label_ja: "サークル紹介",
      done: circle.description.trim().length > 0,
      benefit_ja: "検索一覧に表示される説明文です。書くと見つかりやすくなります",
    },
    {
      key: "cover",
      label_ja: "カバー画像",
      done: Boolean(circle.cover_image_url),
      benefit_ja: "写真があると新入生の興味を引きやすくなります",
    },
    {
      key: "tags",
      label_ja: "タグ",
      done: (circle.tags ?? []).length > 0,
      benefit_ja: "関心分野で検索したとき、上位に表示されやすくなります",
    },
    {
      key: "time_band",
      label_ja: "活動時間帯",
      done: (circle.activity_time_band ?? []).length > 0,
      benefit_ja: "活動時間がわかると、参加を検討しやすくなります",
    },
    {
      key: "days",
      label_ja: "活動曜日",
      done: circle.activity_days.trim().length > 0,
      benefit_ja: "活動曜日がわかると、参加を検討しやすくなります",
    },
    {
      key: "member_band",
      label_ja: "会員数",
      done: circle.member_band != null,
      benefit_ja: "規模がわかると、安心して参加できます",
    },
  ];

  const doneCount = items.filter((i) => i.done).length;
  const totalCount = items.length;
  const percent = Math.round((doneCount / totalCount) * 100);
  // items 순서가 곧 우선순위 — 미완성 중 첫 항목이 "다음 추천".
  const missing = items.filter((i) => !i.done);

  return {
    percent,
    doneCount,
    totalCount,
    items,
    missing,
    nextRecommended: missing[0] ?? null,
    stage: getCompletionStage(percent),
  };
}
