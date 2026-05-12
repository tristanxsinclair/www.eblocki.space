export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      coach_interactions: {
        Row: {
          assistant_output: string | null
          created_at: string
          id: string
          mode: string | null
          proof_contract_id: string | null
          proof_required: boolean | null
          state_detected: string | null
          user_id: string
          user_input: string
        }
        Insert: {
          assistant_output?: string | null
          created_at?: string
          id?: string
          mode?: string | null
          proof_contract_id?: string | null
          proof_required?: boolean | null
          state_detected?: string | null
          user_id: string
          user_input: string
        }
        Update: {
          assistant_output?: string | null
          created_at?: string
          id?: string
          mode?: string | null
          proof_contract_id?: string | null
          proof_required?: boolean | null
          state_detected?: string | null
          user_id?: string
          user_input?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_interactions_proof_contract_id_fkey"
            columns: ["proof_contract_id"]
            isOneToOne: false
            referencedRelation: "proof_commitments"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_control_sheets: {
        Row: {
          avoidance_signal: string | null
          created_at: string
          eblocki_proof: string | null
          end_avoidance: string | null
          end_output: string | null
          end_pattern: string | null
          end_proof: string | null
          friction_task: string | null
          id: string
          law_proof: string | null
          next_best_action: string | null
          prime_objective: string | null
          psychology_proof: string | null
          sheet_date: string
          state: string | null
          tomorrow_first_move: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avoidance_signal?: string | null
          created_at?: string
          eblocki_proof?: string | null
          end_avoidance?: string | null
          end_output?: string | null
          end_pattern?: string | null
          end_proof?: string | null
          friction_task?: string | null
          id?: string
          law_proof?: string | null
          next_best_action?: string | null
          prime_objective?: string | null
          psychology_proof?: string | null
          sheet_date?: string
          state?: string | null
          tomorrow_first_move?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avoidance_signal?: string | null
          created_at?: string
          eblocki_proof?: string | null
          end_avoidance?: string | null
          end_output?: string | null
          end_pattern?: string | null
          end_proof?: string | null
          friction_task?: string | null
          id?: string
          law_proof?: string | null
          next_best_action?: string | null
          prime_objective?: string | null
          psychology_proof?: string | null
          sheet_date?: string
          state?: string | null
          tomorrow_first_move?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      performance_os_config: {
        Row: {
          auto_create_proof_contracts: boolean | null
          created_at: string
          default_response_structure: boolean | null
          id: string
          model: string | null
          proof_contract_minimum_seriousness: number | null
          strict_verification: boolean | null
          updated_at: string
          user_id: string
          vector_store_id: string | null
        }
        Insert: {
          auto_create_proof_contracts?: boolean | null
          created_at?: string
          default_response_structure?: boolean | null
          id?: string
          model?: string | null
          proof_contract_minimum_seriousness?: number | null
          strict_verification?: boolean | null
          updated_at?: string
          user_id: string
          vector_store_id?: string | null
        }
        Update: {
          auto_create_proof_contracts?: boolean | null
          created_at?: string
          default_response_structure?: boolean | null
          id?: string
          model?: string | null
          proof_contract_minimum_seriousness?: number | null
          strict_verification?: boolean | null
          updated_at?: string
          user_id?: string
          vector_store_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      proof_artifacts: {
        Row: {
          artifact_type: string | null
          content: string | null
          created_at: string
          domain: string
          evidence_strength: string | null
          feedback: string | null
          id: string
          next_upgrade: string | null
          quality_score: number | null
          title: string
          user_id: string
        }
        Insert: {
          artifact_type?: string | null
          content?: string | null
          created_at?: string
          domain: string
          evidence_strength?: string | null
          feedback?: string | null
          id?: string
          next_upgrade?: string | null
          quality_score?: number | null
          title: string
          user_id: string
        }
        Update: {
          artifact_type?: string | null
          content?: string | null
          created_at?: string
          domain?: string
          evidence_strength?: string | null
          feedback?: string | null
          id?: string
          next_upgrade?: string | null
          quality_score?: number | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      proof_commitments: {
        Row: {
          coach_interaction_id: string | null
          completed_at: string | null
          completion_reflection: string | null
          created_at: string
          daily_control_sheet_id: string | null
          domain: string
          due_date: string | null
          evidence_standard: string | null
          id: string
          mode: string | null
          proof_artifact_id: string | null
          required_artifact: string | null
          status: string
          title: string
          user_id: string
        }
        Insert: {
          coach_interaction_id?: string | null
          completed_at?: string | null
          completion_reflection?: string | null
          created_at?: string
          daily_control_sheet_id?: string | null
          domain: string
          due_date?: string | null
          evidence_standard?: string | null
          id?: string
          mode?: string | null
          proof_artifact_id?: string | null
          required_artifact?: string | null
          status?: string
          title: string
          user_id: string
        }
        Update: {
          coach_interaction_id?: string | null
          completed_at?: string | null
          completion_reflection?: string | null
          created_at?: string
          daily_control_sheet_id?: string | null
          domain?: string
          due_date?: string | null
          evidence_standard?: string | null
          id?: string
          mode?: string | null
          proof_artifact_id?: string | null
          required_artifact?: string | null
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proof_commitments_daily_control_sheet_id_fkey"
            columns: ["daily_control_sheet_id"]
            isOneToOne: false
            referencedRelation: "daily_control_sheets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proof_commitments_proof_artifact_id_fkey"
            columns: ["proof_artifact_id"]
            isOneToOne: false
            referencedRelation: "proof_artifacts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
