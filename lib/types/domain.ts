import type { ActivityFrequency } from "@/lib/constants/activity-frequency";
import type { ActivityTimeBand } from "@/lib/constants/activity-time-band";
import type { Category } from "@/lib/constants/category";
import type { CircleStatus } from "@/lib/constants/circle-status";
import type { MemberBand } from "@/lib/constants/member-band";
import type { OfficialType } from "@/lib/constants/official-type";
import type { RecruitmentStatus } from "@/lib/constants/recruitment-status";
import type { ActivityReportType } from "@/lib/constants/activity-report-type";

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
  cover_image_url: string | null;
  view_count: number;
  inquiry_count: number;
  /** circle_tags 조인 → tags.slug 배열 (카드에 최대 5개 칩 표시) */
  tags: string[];
  /**
   * 단체 개요·활동 설명 (free text, 줄바꿈 보존).
   * 카드(썸네일)에서는 1~2줄로 잘라 미리보기로 노출하고, 전체는 상세 페이지에서 확인한다.
   */
  description: string;
  /**
   * 모집 상태 — newcomer_only(新歓シーズン) / year_round(通年募集). 둘 다 「지금 가입 가능」.
   * 「現在募集中のサークル」 섹션의 모집 뱃지에서 사용. 값이 없으면 null.
   */
  recruitment_status: RecruitmentStatus | null;
}

/**
 * UI 상세용 단체 정보 — F003 (서클 상세 페이지) 에서 사용.
 * CircleSummary 를 확장하여 개요·요약 카드·연락처·갤러리·신환 일정·상태·작성자를 추가.
 *
 * 정책: annual_fee_yen / freshmen_ratio 는 표시·등록 모두 폐기 (2026-05 결정).
 */
export interface CircleDetail extends CircleSummary {
  /** 활동 요일 — 「火・木」 같은 일본어 free text (요약 카드 표시용, T-012) */
  activity_days: string;
  /**
   * 부원 수 범위 — 5구간 enum (마이그레이션 008).
   * 값 없으면 null (任意 필드). 표시 시 MEMBER_BAND_LABELS[member_band] 사용.
   */
  member_band: MemberBand | null;
  contact_instagram: string | null;
  contact_x: string | null;
  contact_line: string | null;
  /** 커버 이미지 컬렉션 — 최대 5장, sort_order 오름차순, 첫 장=대표 커버 */
  images: CircleImage[];
  /** 단체 대표자 UUID */
  owner_id: string;
  /** 심사 상태 — owner / admin 에게만 노출. 공개 페이지에서는 'approved' 만 fetch */
  status: CircleStatus;
  /**
   * 실제 운영자가 소유권을 확정(claim)했는지 — M-024.
   * false=시드(미claim): 인앱 DM 비활성, 公式SNS 핸드오프.
   * true=운영자가 직접 등록 또는 claim 완료: 인앱 DM 활성.
   */
  is_claimed: boolean;
  /** 활동 시간대 — 복수 가능. weekday_day / weekday_night / weekend (optional) */
  activity_time_band?: ActivityTimeBand[];
}

/**
 * 커버 이미지 컬렉션 한 장 — circle_images 행을 UI 가 받는 형태로 좁힘 (circle_id 는 부모에서 추론).
 * sort_order 오름차순, 첫 장(sort_order 0)이 대표 커버(circles.cover_image_url 동기화).
 */
export interface CircleImage {
  id: string;
  image_url: string;
  sort_order: number;
}

/**
 * 活動レポート — 서클 멤버가 작성하는 활동 후기/공지.
 * Phase 1.2 시드 SQL 에서 activity_reports 테이블로 매핑 예정.
 *
 * 정책 (2026-05): 미니멀 노출 — 작성자명 / 좋아요 수 표시 안 함.
 * 필요 시 Phase 2 에서 author / like_count 등 필드 추가.
 */
export interface ActivityReport {
  id: string;
  circle_id: string;
  /** 글 제목 (예: 「先週の合宿、最高でした！」) */
  title: string;
  /** 본문 미리보기 (1-2 줄, 리스트/카드용) */
  content: string;
  /** 본문 전체 (상세 페이지 노출, whitespace-pre-line) */
  body: string;
  /** 카드 thumbnail (images[0]?.image_url 와 동일하지만 검색·정렬 편의성 위해 유지) */
  image_url: string | null;
  /** 상세 페이지 갤러리 — 3-5장 (carousel 또는 grid) */
  images: { id: string; image_url: string; sort_order: number }[];
  /** 활동 장소 — 「日吉キャンパス 第2体育館」 같은 구체적 장소명. optional */
  location?: string;
  /** 활동 종류 — practice / camp / event / meeting / other. optional */
  activity_type?: ActivityReportType;
  /** 작성일 ISO 문자열 (YYYY-MM-DD) — 리스트 정렬 + 메타 표시 */
  created_at: string;
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

/**
 * 회원 수 범위 — FilterPanel 의 「会員数」 단일 선택, search-params 의 `memberSize`,
 * filterCircles 매칭에서 사용.
 * - small: ~30명
 * - mid: 31-100명
 * - large: 101-200명
 * - huge: 200명 초과
 */
export type MemberSize = "small" | "mid" | "large" | "huge";

/**
 * RSVP 모드 — events.rsvp_mode 컬럼 값.
 * - light: 参加意思表明 (event_interests 테이블, Wave 2)
 * - strict: 출결 관리 (event_rsvps 테이블 + 승인 플로우, Wave 2)
 */
export type RsvpMode = "light" | "strict";

/**
 * 이벤트 공개 범위 — events.visibility 컬럼 값.
 * - public: 전체 공개 (비로그인도 열람 가능)
 * - members: 멤버 전용 (로그인 + circle_members 인증 필요, Wave 2)
 */
export type EventVisibility = "public" | "members";

/**
 * 이벤트 댓글 한 건 — event_comments 행의 UI 표현.
 *
 * parent_id:
 * - null → 최상위 댓글 (parent)
 * - UUID → 답글 (1단계까지만 허용)
 *
 * children 배열: 서버에서 nest 후 주입 (DB에는 없는 클라이언트 전용 필드).
 * author_display_name: profiles JOIN으로 취득.
 */
export interface EventComment {
  id: string;
  event_id: string;
  user_id: string;
  /** 답글 대상 댓글 UUID — null 이면 최상위 */
  parent_id: string | null;
  /** 댓글 본문 */
  body: string;
  /** 작성일 UTC timestamptz ISO 문자열 */
  created_at: string;
  /** profiles JOIN — 작성자 표시명 */
  author_display_name: string | null;
  /** 최상위 댓글 전용 — 자식 답글 목록 (서버 nest 처리) */
  children?: EventComment[];
}

/**
 * 이벤트 단건 상세 — F002 이벤트 풀스크린 상세 페이지에서 사용.
 *
 * DB events 테이블 + circles JOIN (circle_name, circle_cover_image_url) 결합 도메인 모델.
 * RSVP 카운트·댓글은 Wave 2 산출 — 이번 Phase 에서는 미포함.
 */
export interface EventDetail {
  id: string;
  /** 이벤트 제목 */
  title: string;
  /** 이벤트 설명 (whitespace-pre-line 렌더) */
  description: string | null;
  /** 커버 이미지 URL (null 이면 플레이스홀더 표시) */
  cover_image_url: string | null;
  /** 이벤트 카테고리 — free text (예: "新歓", "演奏会", "勉強会") */
  category: string | null;
  /** 시작 시각 — UTC timestamptz ISO 문자열 */
  starts_at: string;
  /** 종료 시각 — UTC timestamptz ISO 문자열, null 허용 */
  ends_at: string | null;
  /** 종일 여부 — true 면 시간 미표시 */
  is_all_day: boolean;
  /** 개최 장소 (free text, null 허용) */
  location: string | null;
  /** 정원 (null 이면 무제한) */
  capacity: number | null;
  /** RSVP 마감 시각 (null 이면 당일까지) */
  rsvp_deadline: string | null;
  /** RSVP 모드 */
  rsvp_mode: RsvpMode;
  /** 사전 승인 필요 여부 */
  requires_approval: boolean;
  /** 공개 범위 */
  visibility: EventVisibility;
  /** 취소 시각 (null 이면 미취소) */
  cancelled_at: string | null;
  /** 취소 사유 (cancelled_at が入っているときのみ意味を持つ) */
  cancellation_reason: string | null;
  /** 소속 서클 UUID */
  circle_id: string;
  /** 소속 서클 이름 — circles JOIN */
  circle_name: string;
  /** 소속 서클 커버 이미지 URL — circles JOIN (아바타 표시용) */
  circle_cover_image_url: string | null;
  /** 이벤트 생성일 */
  created_at: string;
}
