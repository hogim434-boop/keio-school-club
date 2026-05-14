import type { ActivityFrequency } from "@/lib/constants/activity-frequency";
import type { Category } from "@/lib/constants/category";
import type { CircleStatus } from "@/lib/constants/circle-status";
import type { OfficialType } from "@/lib/constants/official-type";

/**
 * UI 카드용 단체 요약 — F002 (서클 카드), F001 (검색 결과), F008 (비교 테이블) 에서 사용.
 *
 * DB 의 `circles.*` 행에 `circle_tags → tags.slug` 조인 결과를 더한 도메인 모델.
 * verified 필드는 두지 않는다 — 「公認」 표기는 카드에서 official_type 라벨로 직접 표시.
 * (자기 신고 + 관리자 1차 검수이며, 慶應 公式 보증과 무관함. PRD 「면책 사항」 절 참조)
 */
export interface CircleSummary {
  id: string;
  name: string;
  category: Category;
  official_type: OfficialType;
  activity_frequency: ActivityFrequency;
  annual_fee_yen: number;
  cover_image_url: string | null;
  view_count: number;
  inquiry_count: number;
  /** circle_tags 조인 → tags.slug 배열 (카드에 최대 5개 칩 표시) */
  tags: string[];
}

/**
 * UI 상세용 단체 정보 — F003 (서클 상세 페이지) 에서 사용.
 * CircleSummary 를 확장하여 개요·요약 카드 5종·연락처·갤러리·신환 일정·상태·작성자를 추가.
 */
export interface CircleDetail extends CircleSummary {
  /** 단체 개요·활동 설명 (free text, 줄바꿈 보존) */
  description: string;
  /** 활동 요일 — 「火・木」 같은 일본어 free text (요약 카드 표시용, T-012) */
  activity_days: string;
  /** 회원 수 — 「30名」 같이 표시. T-018 등록 폼에서 입력 받음 */
  member_count: number;
  /** 신입생 비율 — 0~100 (% 단위). 카드에 「40%」 로 표시 */
  freshmen_ratio: number;
  contact_instagram: string | null;
  contact_x: string | null;
  contact_line: string | null;
  /** 갤러리 — 최대 8장, sort_order 오름차순 */
  images: CircleImage[];
  /** 단체 대표자 UUID */
  owner_id: string;
  /** 심사 상태 — owner / admin 에게만 노출. 공개 페이지에서는 'approved' 만 fetch */
  status: CircleStatus;
  /** 新歓 이벤트 — Phase 2 T-029 까지는 빈 배열 가능 */
  shinkan_events: ShinkanEvent[];
}

/**
 * 갤러리 한 장 — circle_images 행을 UI 가 받는 형태로 좁힘 (circle_id 는 부모에서 추론).
 */
export interface CircleImage {
  id: string;
  image_url: string;
  sort_order: number;
}

/**
 * 新歓 이벤트 한 건 — shinkan_events 행의 UI 표현.
 */
export interface ShinkanEvent {
  id: string;
  title: string;
  event_date: string;
  is_online: boolean;
}

/**
 * 태그 마스터 한 건 — 필터 시트(T-011) 또는 등록 폼(T-018) 의 태그 선택에서 사용.
 * label_ja 는 「初心者歓迎」 등 일본어 표시 라벨.
 */
export interface Tag {
  id: number;
  slug: string;
  label_ja: string;
  /** 태그 분류 그룹 — tag-kind 상수의 TagKind 와 일치. 본 도메인 타입에서는 string 으로 받아 유연성 확보 */
  kind: string;
}

/**
 * 즐겨찾기 한 건 — favorites 행의 UI 표현.
 * F007 즐겨찾기 페이지에서 CircleSummary 와 조인하여 카드로 렌더.
 */
export interface Favorite {
  user_id: string;
  circle_id: string;
  created_at: string;
}
