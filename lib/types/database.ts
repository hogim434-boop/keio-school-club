/**
 * Supabase Database 타입 — `supabase gen types typescript` 결과.
 *
 * 본 파일은 **mcp__supabase__generate_typescript_types 자동 생성** 결과를 그대로 반영합니다.
 * 수동 편집 금지. 스키마 변경 시 (마이그레이션 후) 같은 MCP 도구로 재생성하세요.
 *
 * - 마지막 동기화: T-007 (2026-05-18, 마이그레이션 007_rpc_increment_counts + 007b + 007c 적용 후)
 * - 도메인 타입은 `lib/types/domain.ts` — 본 파일의 `Tables<>` 를 기반으로 작성
 * - enum 값 SSOT 는 `lib/constants/*.ts` — DB enum 과 1:1 일치 확인됨
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      activity_report_images: {
        Row: {
          id: string;
          image_url: string;
          report_id: string;
          sort_order: number;
        };
        Insert: {
          id?: string;
          image_url: string;
          report_id: string;
          sort_order?: number;
        };
        Update: {
          id?: string;
          image_url?: string;
          report_id?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "activity_report_images_report_id_fkey";
            columns: ["report_id"];
            isOneToOne: false;
            referencedRelation: "activity_reports";
            referencedColumns: ["id"];
          },
        ];
      };
      activity_reports: {
        Row: {
          activity_type: Database["public"]["Enums"]["activity_report_type_enum"] | null;
          body: string;
          circle_id: string;
          content: string;
          created_at: string;
          id: string;
          image_url: string | null;
          location: string | null;
          title: string;
        };
        Insert: {
          activity_type?: Database["public"]["Enums"]["activity_report_type_enum"] | null;
          body: string;
          circle_id: string;
          content: string;
          created_at?: string;
          id?: string;
          image_url?: string | null;
          location?: string | null;
          title: string;
        };
        Update: {
          activity_type?: Database["public"]["Enums"]["activity_report_type_enum"] | null;
          body?: string;
          circle_id?: string;
          content?: string;
          created_at?: string;
          id?: string;
          image_url?: string | null;
          location?: string | null;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "activity_reports_circle_id_fkey";
            columns: ["circle_id"];
            isOneToOne: false;
            referencedRelation: "circles";
            referencedColumns: ["id"];
          },
        ];
      };
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
          key?: string;
          value?: string;
        };
        Relationships: [];
      };
      circle_claims: {
        Row: {
          id: string;
          circle_id: string;
          requester_id: string;
          contact_note: string;
          status: "pending" | "approved" | "rejected";
          created_at: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
        };
        Insert: {
          id?: string;
          circle_id: string;
          requester_id: string;
          contact_note: string;
          status?: "pending" | "approved" | "rejected";
          created_at?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
        };
        Update: {
          id?: string;
          circle_id?: string;
          requester_id?: string;
          contact_note?: string;
          status?: "pending" | "approved" | "rejected";
          created_at?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "circle_claims_circle_id_fkey";
            columns: ["circle_id"];
            isOneToOne: false;
            referencedRelation: "circles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "circle_claims_requester_id_fkey";
            columns: ["requester_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      circle_images: {
        Row: {
          circle_id: string;
          id: string;
          image_url: string;
          sort_order: number;
        };
        Insert: {
          circle_id: string;
          id?: string;
          image_url: string;
          sort_order?: number;
        };
        Update: {
          circle_id?: string;
          id?: string;
          image_url?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "circle_images_circle_id_fkey";
            columns: ["circle_id"];
            isOneToOne: false;
            referencedRelation: "circles";
            referencedColumns: ["id"];
          },
        ];
      };
      circle_tags: {
        Row: {
          circle_id: string;
          tag_id: number;
        };
        Insert: {
          circle_id: string;
          tag_id: number;
        };
        Update: {
          circle_id?: string;
          tag_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: "circle_tags_circle_id_fkey";
            columns: ["circle_id"];
            isOneToOne: false;
            referencedRelation: "circles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "circle_tags_tag_id_fkey";
            columns: ["tag_id"];
            isOneToOne: false;
            referencedRelation: "tags";
            referencedColumns: ["id"];
          },
        ];
      };
      circles: {
        Row: {
          activity_days: string;
          // 생성 컬럼 — activity_days 에서 요일을 자동 추출한 필터용 배열 (직접 쓰기 불가, Insert/Update 제외)
          activity_weekdays: string[];
          activity_frequency: Database["public"]["Enums"]["activity_frequency_enum"];
          activity_time_band: Database["public"]["Enums"]["activity_time_band_enum"][];
          annual_fee_yen: number;
          category: Database["public"]["Enums"]["category_enum"];
          contact_instagram: string | null;
          contact_line: string | null;
          contact_x: string | null;
          cover_image_url: string | null;
          created_at: string;
          description: string;
          id: string;
          inquiry_count: number;
          /**
           * 실제 운영자가 소유권을 확정(claim)했는지 — M-024.
           * false=시드(미claim): 인앱 DM 비활성, 公式SNS 핸드오프.
           * true=운영자가 직접 등록 또는 claim 완료: 인앱 DM 활성.
           * UPDATE 화이트리스트에서 제외 — service_role/admin RPC 만 변경 가능.
           */
          is_claimed: boolean;
          /** 부원 수 범위 — 마이그레이션 008. nullable (任意 필드) */
          member_band: Database["public"]["Enums"]["member_band_enum"] | null;
          member_count: number;
          name: string;
          official_type: Database["public"]["Enums"]["official_type_enum"];
          owner_id: string | null;
          pledge_accepted_at: string | null;
          recruitment_status: Database["public"]["Enums"]["recruitment_status_enum"];
          rejection_reason: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          slug: string;
          status: Database["public"]["Enums"]["circle_status_enum"];
          submission_note: string | null;
          updated_at: string;
          view_count: number;
        };
        Insert: {
          activity_days?: string;
          activity_frequency: Database["public"]["Enums"]["activity_frequency_enum"];
          activity_time_band?: Database["public"]["Enums"]["activity_time_band_enum"][];
          annual_fee_yen?: number;
          category: Database["public"]["Enums"]["category_enum"];
          contact_instagram?: string | null;
          contact_line?: string | null;
          contact_x?: string | null;
          cover_image_url?: string | null;
          created_at?: string;
          description?: string;
          id?: string;
          inquiry_count?: number;
          /**
           * 직접 등록 시 true 를 명시적으로 지정(운영자 본인이 만든 = 이미 claim 됨).
           * 시드 INSERT 는 지정하지 않으면 DEFAULT false → 미claim 상태.
           */
          is_claimed?: boolean;
          /** 부원 수 범위 — nullable (任意) */
          member_band?: Database["public"]["Enums"]["member_band_enum"] | null;
          member_count?: number;
          name: string;
          official_type: Database["public"]["Enums"]["official_type_enum"];
          owner_id?: string | null;
          pledge_accepted_at?: string | null;
          recruitment_status?: Database["public"]["Enums"]["recruitment_status_enum"];
          rejection_reason?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          slug: string;
          status?: Database["public"]["Enums"]["circle_status_enum"];
          submission_note?: string | null;
          updated_at?: string;
          view_count?: number;
        };
        Update: {
          activity_days?: string;
          activity_frequency?: Database["public"]["Enums"]["activity_frequency_enum"];
          activity_time_band?: Database["public"]["Enums"]["activity_time_band_enum"][];
          annual_fee_yen?: number;
          category?: Database["public"]["Enums"]["category_enum"];
          contact_instagram?: string | null;
          contact_line?: string | null;
          contact_x?: string | null;
          cover_image_url?: string | null;
          created_at?: string;
          description?: string;
          id?: string;
          inquiry_count?: number;
          // is_claimed 는 UPDATE 화이트리스트에 없음 — 일반 사용자 변조 방지.
          // service_role / admin RPC 에서만 변경 가능하므로 Update 타입에서 제외.
          /** 부원 수 범위 — nullable (任意) */
          member_band?: Database["public"]["Enums"]["member_band_enum"] | null;
          member_count?: number;
          name?: string;
          official_type?: Database["public"]["Enums"]["official_type_enum"];
          owner_id?: string | null;
          pledge_accepted_at?: string | null;
          recruitment_status?: Database["public"]["Enums"]["recruitment_status_enum"];
          rejection_reason?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          slug?: string;
          status?: Database["public"]["Enums"]["circle_status_enum"];
          submission_note?: string | null;
          updated_at?: string;
          view_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: "circles_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "circles_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      favorites: {
        Row: {
          circle_id: string;
          created_at: string;
          user_id: string;
        };
        Insert: {
          circle_id: string;
          created_at?: string;
          user_id: string;
        };
        Update: {
          circle_id?: string;
          created_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "favorites_circle_id_fkey";
            columns: ["circle_id"];
            isOneToOne: false;
            referencedRelation: "circles";
            referencedColumns: ["id"];
          },
        ];
      };
      inquiry_events: {
        Row: {
          circle_id: string;
          day: string;
          user_id: string;
        };
        Insert: {
          circle_id: string;
          day: string;
          user_id: string;
        };
        Update: {
          circle_id?: string;
          day?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "inquiry_events_circle_id_fkey";
            columns: ["circle_id"];
            isOneToOne: false;
            referencedRelation: "circles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string | null;
          id: string;
          keio_verified: boolean;
          role: string;
          /** 가입 의도(general/operator). 온보딩 UX·분석용. 권한 게이트 아님. */
          signup_intent: string;
        };
        Insert: {
          created_at?: string;
          display_name?: string | null;
          id: string;
          keio_verified?: boolean;
          role?: string;
          signup_intent?: string;
        };
        Update: {
          created_at?: string;
          display_name?: string | null;
          id?: string;
          keio_verified?: boolean;
          role?: string;
          signup_intent?: string;
        };
        Relationships: [];
      };
      tags: {
        Row: {
          id: number;
          kind: Database["public"]["Enums"]["tag_kind_enum"];
          label_ja: string;
          slug: string;
        };
        Insert: {
          id?: number;
          kind: Database["public"]["Enums"]["tag_kind_enum"];
          label_ja: string;
          slug: string;
        };
        Update: {
          id?: number;
          kind?: Database["public"]["Enums"]["tag_kind_enum"];
          label_ja?: string;
          slug?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      increment_inquiry_count: {
        Args: { p_circle_id: string };
        Returns: undefined;
      };
      increment_view_count: {
        Args: { p_circle_id: string };
        Returns: undefined;
      };
      is_admin: { Args: { uid?: string }; Returns: boolean };
    };
    Enums: {
      activity_frequency_enum:
        | "weekly_1"
        | "weekly_2_3"
        | "monthly"
        | "daily"
        | "weekly_3_4"
        | "weekly_5_6";
      activity_report_type_enum: "practice" | "camp" | "event" | "meeting" | "other";
      activity_time_band_enum:
        | "weekday_day"
        | "weekday_night"
        | "weekend"
        | "morning"
        | "noon"
        | "evening"
        | "irregular";
      category_enum:
        | "sports"
        | "culture_art"
        | "music"
        | "academic"
        | "international"
        | "event"
        | "volunteer"
        | "media";
      circle_status_enum: "pending" | "approved" | "rejected";
      /** 부원 수 범위 5구간 — 마이그레이션 008 */
      member_band_enum:
        | "under_10"
        | "from_11_to_30"
        | "from_31_to_50"
        | "from_51_to_100"
        | "over_100";
      official_type_enum: "athletics" | "official" | "unofficial" | "intercollegiate" | "other";
      recruitment_status_enum: "newcomer_only" | "year_round" | "not_recruiting";
      tag_kind_enum: "atmosphere" | "cost" | "frequency" | "gender";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      activity_frequency_enum: [
        "weekly_1",
        "weekly_2_3",
        "monthly",
        "daily",
        "weekly_3_4",
        "weekly_5_6",
      ],
      activity_report_type_enum: ["practice", "camp", "event", "meeting", "other"],
      activity_time_band_enum: [
        "weekday_day",
        "weekday_night",
        "weekend",
        "morning",
        "noon",
        "evening",
        "irregular",
      ],
      category_enum: [
        "sports",
        "culture_art",
        "music",
        "academic",
        "international",
        "event",
        "volunteer",
        "media",
      ],
      circle_status_enum: ["pending", "approved", "rejected"],
      /** 부원 수 범위 5구간 — 마이그레이션 008 */
      member_band_enum: [
        "under_10",
        "from_11_to_30",
        "from_31_to_50",
        "from_51_to_100",
        "over_100",
      ],
      official_type_enum: ["athletics", "official", "unofficial", "intercollegiate", "other"],
      recruitment_status_enum: ["newcomer_only", "year_round", "not_recruiting"],
      tag_kind_enum: ["atmosphere", "cost", "frequency", "gender"],
    },
  },
} as const;
