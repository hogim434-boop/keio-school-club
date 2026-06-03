/**
 * lib/dm/constants.ts
 *
 * 운영진 DM 문의 카테고리 상수 정의.
 *
 * DB의 inquiries.category CHECK 제약과 정확히 일치하는 6가지 값을 정의한다.
 * 후속 Task(T-028~T-034)에서 재사용하므로 단일 출처(Single Source of Truth)로 유지.
 *
 * DB CHECK 제약:
 *   category IN ('fee', 'schedule', 'vibe', 'trial', 'interest', 'other')
 */

/**
 * 문의 카테고리 값(DB에 저장되는 영문 키).
 * 타입 안전성을 위해 as const 로 값 집합을 고정한다.
 */
export const INQUIRY_CATEGORY_VALUES = [
  "fee",
  "schedule",
  "vibe",
  "trial",
  "interest",
  "other",
] as const;

/** 단일 카테고리 값의 타입 (union type) */
export type InquiryCategoryValue = (typeof INQUIRY_CATEGORY_VALUES)[number];

/**
 * 카테고리 값(DB 키) → 일본어 라벨 맵.
 *
 * DB CHECK 제약의 6값과 1:1 대응.
 * UI(RadioGroup / Select 등)에서 사람이 읽을 수 있는 라벨로 표시할 때 사용.
 */
export const INQUIRY_CATEGORY_LABELS: Record<InquiryCategoryValue, string> = {
  fee: "費用・部費について",
  schedule: "活動日程について",
  vibe: "雰囲気・人について",
  trial: "体験・見学について",
  interest: "興味があります",
  other: "その他",
};

/**
 * RadioGroup / Select 등 선택 UI에 직접 사용할 수 있는 배열.
 * { value, label } 형태로 export — 컴포넌트에서 .map() 으로 옵션 렌더링 가능.
 *
 * 예시 (inquiry-form.tsx):
 *   INQUIRY_CATEGORIES.map(({ value, label }) => (
 *     <RadioGroupItem key={value} value={value} id={value} />
 *   ))
 */
export const INQUIRY_CATEGORIES: {
  value: InquiryCategoryValue;
  label: string;
}[] = INQUIRY_CATEGORY_VALUES.map((value) => ({
  value,
  label: INQUIRY_CATEGORY_LABELS[value],
}));

/**
 * 1시간 이내 발송 허용 최대 건수 (cooldown 상한).
 *
 * PRD 에 수치 미명시 → 베타 운용 후 조정 예정.
 * sendInquiry Server Action(T-033) 이 이 값을 참조해 초과 시 발송을 거부한다.
 */
export const COOLDOWN_MAX_PER_HOUR = 10;
