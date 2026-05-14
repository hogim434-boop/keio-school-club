import type { ActivityFrequency } from "@/lib/constants/activity-frequency";
import type { Category } from "@/lib/constants/category";
import type { CircleStatus } from "@/lib/constants/circle-status";
import type { OfficialType } from "@/lib/constants/official-type";
import type { TagKind } from "@/lib/constants/tag-kind";

/**
 * 사용자 권한 — profiles.role 컬럼 (현재 2종)
 * 다중 admin 부여는 T-021 에서 SQL 콘솔로 처리, UI 분기 없음
 */
export type Role = "user" | "admin";

/**
 * Supabase Database 인터페이스 — 공식 generate_typescript_types 결과와 동일 구조.
 * T-006 (RLS 도입) 이후 `mcp__supabase__generate_typescript_types` 결과로 무손실 교체 예정.
 *
 * 대상: PRD 「데이터 모델」 7개 테이블 + 검증 이슈 보조 테이블 2개(inquiry_events / app_settings)
 *      + RPC 함수 2개(increment_inquiry_count / increment_view_count).
 */
export interface Database {
  public: {
    Tables: {
      /** 사용자 프로필 — auth.users insert 트리거로 자동 생성 (T-005) */
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          keio_verified: boolean;
          role: Role;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          keio_verified?: boolean;
          role?: Role;
          created_at?: string;
        };
        Update: {
          display_name?: string | null;
          keio_verified?: boolean;
          role?: Role;
        };
      };

      /** 단체 핵심 테이블 — PRD 「circles」 + 검증 보강 7개 컬럼(H-NEW-3) 포함 */
      circles: {
        Row: {
          id: string;
          name: string;
          category: Category;
          official_type: OfficialType;
          status: CircleStatus;
          activity_frequency: ActivityFrequency;
          annual_fee_yen: number;
          cover_image_url: string | null;
          owner_id: string;
          view_count: number;
          inquiry_count: number;
          contact_instagram: string | null;
          contact_x: string | null;
          contact_line: string | null;
          rejection_reason: string | null;
          updated_at: string;
          pledge_accepted_at: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          slug: string;
          submission_note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          category: Category;
          official_type: OfficialType;
          status?: CircleStatus;
          activity_frequency: ActivityFrequency;
          annual_fee_yen: number;
          cover_image_url?: string | null;
          owner_id: string;
          view_count?: number;
          inquiry_count?: number;
          contact_instagram?: string | null;
          contact_x?: string | null;
          contact_line?: string | null;
          rejection_reason?: string | null;
          pledge_accepted_at?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          slug: string;
          submission_note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          category?: Category;
          official_type?: OfficialType;
          status?: CircleStatus;
          activity_frequency?: ActivityFrequency;
          annual_fee_yen?: number;
          cover_image_url?: string | null;
          contact_instagram?: string | null;
          contact_x?: string | null;
          contact_line?: string | null;
          rejection_reason?: string | null;
          pledge_accepted_at?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          slug?: string;
          submission_note?: string | null;
          updated_at?: string;
        };
      };

      /** 태그 마스터 — 시드 10종 (T-009) */
      tags: {
        Row: {
          id: number;
          slug: string;
          label_ja: string;
          kind: TagKind;
        };
        Insert: {
          id?: number;
          slug: string;
          label_ja: string;
          kind: TagKind;
        };
        Update: {
          slug?: string;
          label_ja?: string;
          kind?: TagKind;
        };
      };

      /** 서클 ↔ 태그 N:M 조인 테이블 (서클당 최대 5개) */
      circle_tags: {
        Row: { circle_id: string; tag_id: number };
        Insert: { circle_id: string; tag_id: number };
        Update: never;
      };

      /** 단체 갤러리 — 서클당 최대 8장 (PRD 「F003」) */
      circle_images: {
        Row: {
          id: string;
          circle_id: string;
          image_url: string;
          sort_order: number;
        };
        Insert: {
          id?: string;
          circle_id: string;
          image_url: string;
          sort_order?: number;
        };
        Update: {
          image_url?: string;
          sort_order?: number;
        };
      };

      /** 즐겨찾기 — 사용자 × 단체 (PRD 「F007」) */
      favorites: {
        Row: {
          user_id: string;
          circle_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          circle_id: string;
          created_at?: string;
        };
        Update: never;
      };

      /** 新歓 이벤트 — Phase 2 T-029 에서 본격 활용 */
      shinkan_events: {
        Row: {
          id: string;
          circle_id: string;
          title: string;
          event_date: string;
          is_online: boolean;
        };
        Insert: {
          id?: string;
          circle_id: string;
          title: string;
          event_date: string;
          is_online?: boolean;
        };
        Update: {
          title?: string;
          event_date?: string;
          is_online?: boolean;
        };
      };

      /** 서버측 디바운스용 (M-NEW-2) — increment_inquiry_count RPC 내부에서 UNIQUE 검사 */
      inquiry_events: {
        Row: {
          user_id: string;
          circle_id: string;
          /** ISO date (YYYY-MM-DD) — 하루 단위 디바운스 키 */
          day: string;
        };
        Insert: {
          user_id: string;
          circle_id: string;
          day: string;
        };
        Update: never;
      };

      /** 글로벌 운영 설정 (T-021) — 신청 일시정지 토글 등 */
      app_settings: {
        Row: {
          key: string;
          value: string;
        };
        Insert: {
          key: string;
          value: string;
        };
        Update: {
          value?: string;
        };
      };
    };
    Functions: {
      /** F012 「参加する」 클릭 카운트 갱신 — SECURITY DEFINER (T-007) */
      increment_inquiry_count: {
        Args: { p_circle_id: string };
        Returns: void;
      };
      /** 상세 페이지 진입 시 조회수 갱신 — SECURITY DEFINER (T-009) */
      increment_view_count: {
        Args: { p_circle_id: string };
        Returns: void;
      };
    };
  };
}

/** Supabase 클라이언트 fetch 결과를 타이핑할 때 사용하는 헬퍼 — `Tables<'circles'>` 식으로 호출 */
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
