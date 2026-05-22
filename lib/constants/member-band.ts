/**
 * 부원 수 범위 5구간 — circles.member_band 컬럼의 enum 값
 *
 * 운영자가 정확한 인원 수를 공개하고 싶지 않으므로
 * 숫자 입력 대신 범위 선택으로 변경 (2026-05 개편).
 *
 * DB enum: member_band_enum (마이그레이션 008_add_member_band_enum)
 *
 * 파일 패턴: lib/constants/recruitment-status.ts 와 동일 구조.
 */

/** 부원 수 범위 enum 값 배열 */
export const MEMBER_BANDS = [
  "under_10",
  "from_11_to_30",
  "from_31_to_50",
  "from_51_to_100",
  "over_100",
] as const;

/** 부원 수 범위 타입 */
export type MemberBand = (typeof MEMBER_BANDS)[number];

/** 부원 수 범위 일본어 표시 라벨 */
export const MEMBER_BAND_LABELS: Record<MemberBand, string> = {
  under_10: "〜10名",
  from_11_to_30: "11〜30名",
  from_31_to_50: "31〜50名",
  from_51_to_100: "51〜100名",
  over_100: "100名以上",
};
