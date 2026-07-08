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
      analytics_events: {
        Row: {
          created_at: string
          event: string
          id: string
          platform: string | null
          properties: Json | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event: string
          id?: string
          platform?: string | null
          properties?: Json | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event?: string
          id?: string
          platform?: string | null
          properties?: Json | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      anonymised_learning_patterns: {
        Row: {
          created_at: string | null
          domain: string | null
          effectiveness_notes: string | null
          evidence_count: number | null
          id: string
          intervention_summary: string | null
          pattern_type: string
          problem_description: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          domain?: string | null
          effectiveness_notes?: string | null
          evidence_count?: number | null
          id?: string
          intervention_summary?: string | null
          pattern_type: string
          problem_description?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          domain?: string | null
          effectiveness_notes?: string | null
          evidence_count?: number | null
          id?: string
          intervention_summary?: string | null
          pattern_type?: string
          problem_description?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      beta_feedback: {
        Row: {
          body: string
          created_at: string
          id: string
          kind: string
          route: string | null
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          kind: string
          route?: string | null
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          kind?: string
          route?: string | null
          user_id?: string
        }
        Relationships: []
      }
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
      court_verdicts: {
        Row: {
          created_at: string
          observer: string | null
          proof_id: string
          reasoning: string | null
          user_id: string
          verdict: string
        }
        Insert: {
          created_at?: string
          observer?: string | null
          proof_id: string
          reasoning?: string | null
          user_id: string
          verdict: string
        }
        Update: {
          created_at?: string
          observer?: string | null
          proof_id?: string
          reasoning?: string | null
          user_id?: string
          verdict?: string
        }
        Relationships: []
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
      daily_objectives: {
        Row: {
          completed_at: string | null
          completion_hard_part: string | null
          completion_proof_text: string | null
          completion_quality_self_rating: number | null
          completion_upgrade: string | null
          created_at: string
          description: string | null
          focus_minutes: number
          id: string
          identity_alignment: number
          kind: string
          mode_id: string | null
          objective_date: string
          position: number
          proof_artifact_id: string | null
          proof_commitment_id: string | null
          proof_required: boolean
          resistance_level: number
          reward_value: number
          status: string
          streak_impact: number
          title: string
          updated_at: string
          user_id: string
          why_it_matters: string | null
        }
        Insert: {
          completed_at?: string | null
          completion_hard_part?: string | null
          completion_proof_text?: string | null
          completion_quality_self_rating?: number | null
          completion_upgrade?: string | null
          created_at?: string
          description?: string | null
          focus_minutes?: number
          id?: string
          identity_alignment?: number
          kind?: string
          mode_id?: string | null
          objective_date?: string
          position?: number
          proof_artifact_id?: string | null
          proof_commitment_id?: string | null
          proof_required?: boolean
          resistance_level?: number
          reward_value?: number
          status?: string
          streak_impact?: number
          title: string
          updated_at?: string
          user_id: string
          why_it_matters?: string | null
        }
        Update: {
          completed_at?: string | null
          completion_hard_part?: string | null
          completion_proof_text?: string | null
          completion_quality_self_rating?: number | null
          completion_upgrade?: string | null
          created_at?: string
          description?: string | null
          focus_minutes?: number
          id?: string
          identity_alignment?: number
          kind?: string
          mode_id?: string | null
          objective_date?: string
          position?: number
          proof_artifact_id?: string | null
          proof_commitment_id?: string | null
          proof_required?: boolean
          resistance_level?: number
          reward_value?: number
          status?: string
          streak_impact?: number
          title?: string
          updated_at?: string
          user_id?: string
          why_it_matters?: string | null
        }
        Relationships: []
      }
      domain_levels: {
        Row: {
          current_standard: string | null
          domain: string
          id: string
          level: number
          next_requirement: string | null
          rank: string
          total_xp: number
          updated_at: string
          user_id: string
          xp_in_level: number
        }
        Insert: {
          current_standard?: string | null
          domain: string
          id?: string
          level?: number
          next_requirement?: string | null
          rank?: string
          total_xp?: number
          updated_at?: string
          user_id: string
          xp_in_level?: number
        }
        Update: {
          current_standard?: string | null
          domain?: string
          id?: string
          level?: number
          next_requirement?: string | null
          rank?: string
          total_xp?: number
          updated_at?: string
          user_id?: string
          xp_in_level?: number
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      identity_ledger: {
        Row: {
          created_at: string
          domain: string
          id: string
          kind: string
          proof_id: string | null
          summary: string
          user_id: string
          verdict: string | null
        }
        Insert: {
          created_at?: string
          domain: string
          id?: string
          kind: string
          proof_id?: string | null
          summary: string
          user_id: string
          verdict?: string | null
        }
        Update: {
          created_at?: string
          domain?: string
          id?: string
          kind?: string
          proof_id?: string | null
          summary?: string
          user_id?: string
          verdict?: string | null
        }
        Relationships: []
      }
      interest_signals: {
        Row: {
          created_at: string
          currency: string | null
          email: string | null
          id: string
          note: string | null
          preferred_price_cents: number | null
          signal_type: string
          source: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          currency?: string | null
          email?: string | null
          id?: string
          note?: string | null
          preferred_price_cents?: number | null
          signal_type: string
          source?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          currency?: string | null
          email?: string | null
          id?: string
          note?: string | null
          preferred_price_cents?: number | null
          signal_type?: string
          source?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      momentum_state: {
        Row: {
          avg_quality: number | null
          created_at: string
          freeze_tokens: number
          freeze_tokens_earned_total: number
          freeze_tokens_used_total: number
          id: string
          identity_signal: string | null
          last_proof_at: string | null
          longest_streak: number
          momentum_score: number
          proofs_today: number
          resistance_overcome: number
          state: string
          state_date: string
          streak_days: number
          updated_at: string
          user_id: string
        }
        Insert: {
          avg_quality?: number | null
          created_at?: string
          freeze_tokens?: number
          freeze_tokens_earned_total?: number
          freeze_tokens_used_total?: number
          id?: string
          identity_signal?: string | null
          last_proof_at?: string | null
          longest_streak?: number
          momentum_score?: number
          proofs_today?: number
          resistance_overcome?: number
          state?: string
          state_date?: string
          streak_days?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          avg_quality?: number | null
          created_at?: string
          freeze_tokens?: number
          freeze_tokens_earned_total?: number
          freeze_tokens_used_total?: number
          id?: string
          identity_signal?: string | null
          last_proof_at?: string | null
          longest_streak?: number
          momentum_score?: number
          proofs_today?: number
          resistance_overcome?: number
          state?: string
          state_date?: string
          streak_days?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_log: {
        Row: {
          created_at: string
          dedup_key: string
          delivered: number | null
          delivery_status: string
          failure_reason: string | null
          id: string
          kind: string
          last_attempt_at: string | null
          payload: Json
          sent_at: string
          total_targets: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          dedup_key: string
          delivered?: number | null
          delivery_status?: string
          failure_reason?: string | null
          id?: string
          kind: string
          last_attempt_at?: string | null
          payload?: Json
          sent_at?: string
          total_targets?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          dedup_key?: string
          delivered?: number | null
          delivery_status?: string
          failure_reason?: string | null
          id?: string
          kind?: string
          last_attempt_at?: string | null
          payload?: Json
          sent_at?: string
          total_targets?: number | null
          user_id?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          coach_prompt: boolean
          created_at: string
          depth_nudge: boolean
          id: string
          milestone: boolean
          notifications_enabled: boolean
          quiet_hours_end: number
          quiet_hours_start: number
          recovery_reminder: boolean
          streak_rescue: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          coach_prompt?: boolean
          created_at?: string
          depth_nudge?: boolean
          id?: string
          milestone?: boolean
          notifications_enabled?: boolean
          quiet_hours_end?: number
          quiet_hours_start?: number
          recovery_reminder?: boolean
          streak_rescue?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          coach_prompt?: boolean
          created_at?: string
          depth_nudge?: boolean
          id?: string
          milestone?: boolean
          notifications_enabled?: boolean
          quiet_hours_end?: number
          quiet_hours_start?: number
          recovery_reminder?: boolean
          streak_rescue?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      operator_level: {
        Row: {
          level: number
          rank: string
          title: string
          total_xp: number
          updated_at: string
          user_id: string
          xp_in_level: number
        }
        Insert: {
          level?: number
          rank?: string
          title?: string
          total_xp?: number
          updated_at?: string
          user_id: string
          xp_in_level?: number
        }
        Update: {
          level?: number
          rank?: string
          title?: string
          total_xp?: number
          updated_at?: string
          user_id?: string
          xp_in_level?: number
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
          attachment_name: string | null
          attachment_path: string | null
          attachment_size: number | null
          attachment_type: string | null
          attachment_url: string | null
          content: string | null
          content_hash: string | null
          created_at: string
          domain: string
          evidence_strength: string | null
          feedback: string | null
          id: string
          next_upgrade: string | null
          pressure_flag: boolean
          proof_tier: number | null
          quality_score: number | null
          temporal_snapshot: Json | null
          title: string
          transfer_flag: boolean
          user_id: string
        }
        Insert: {
          artifact_type?: string | null
          attachment_name?: string | null
          attachment_path?: string | null
          attachment_size?: number | null
          attachment_type?: string | null
          attachment_url?: string | null
          content?: string | null
          content_hash?: string | null
          created_at?: string
          domain: string
          evidence_strength?: string | null
          feedback?: string | null
          id?: string
          next_upgrade?: string | null
          pressure_flag?: boolean
          proof_tier?: number | null
          quality_score?: number | null
          temporal_snapshot?: Json | null
          title: string
          transfer_flag?: boolean
          user_id: string
        }
        Update: {
          artifact_type?: string | null
          attachment_name?: string | null
          attachment_path?: string | null
          attachment_size?: number | null
          attachment_type?: string | null
          attachment_url?: string | null
          content?: string | null
          content_hash?: string | null
          created_at?: string
          domain?: string
          evidence_strength?: string | null
          feedback?: string | null
          id?: string
          next_upgrade?: string | null
          pressure_flag?: boolean
          proof_tier?: number | null
          quality_score?: number | null
          temporal_snapshot?: Json | null
          title?: string
          transfer_flag?: boolean
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
      push_delivery_log: {
        Row: {
          attempted_at: string
          failure_reason: string | null
          id: string
          notification_log_id: string | null
          platform: string | null
          push_token_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          attempted_at?: string
          failure_reason?: string | null
          id?: string
          notification_log_id?: string | null
          platform?: string | null
          push_token_id?: string | null
          status: string
          user_id: string
        }
        Update: {
          attempted_at?: string
          failure_reason?: string | null
          id?: string
          notification_log_id?: string | null
          platform?: string | null
          push_token_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          created_at: string
          device_id: string | null
          id: string
          is_active: boolean
          last_failure_at: string | null
          last_failure_reason: string | null
          last_success_at: string | null
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          id?: string
          is_active?: boolean
          last_failure_at?: string | null
          last_failure_reason?: string | null
          last_success_at?: string | null
          platform: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_id?: string | null
          id?: string
          is_active?: boolean
          last_failure_at?: string | null
          last_failure_reason?: string | null
          last_success_at?: string | null
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      user_modes: {
        Row: {
          created_at: string | null
          description: string | null
          display_name: string
          elite_evidence_examples: string[] | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          keywords: string[] | null
          mode_id: string
          preferred_response_framework: string | null
          proof_examples: string[] | null
          research_needs: string[] | null
          scoring_criteria: Json | null
          strong_evidence_examples: string[] | null
          tone_adjustments: string | null
          updated_at: string | null
          user_id: string
          weak_evidence_examples: string[] | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_name: string
          elite_evidence_examples?: string[] | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          keywords?: string[] | null
          mode_id: string
          preferred_response_framework?: string | null
          proof_examples?: string[] | null
          research_needs?: string[] | null
          scoring_criteria?: Json | null
          strong_evidence_examples?: string[] | null
          tone_adjustments?: string | null
          updated_at?: string | null
          user_id: string
          weak_evidence_examples?: string[] | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_name?: string
          elite_evidence_examples?: string[] | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          keywords?: string[] | null
          mode_id?: string
          preferred_response_framework?: string | null
          proof_examples?: string[] | null
          research_needs?: string[] | null
          scoring_criteria?: Json | null
          strong_evidence_examples?: string[] | null
          tone_adjustments?: string | null
          updated_at?: string | null
          user_id?: string
          weak_evidence_examples?: string[] | null
        }
        Relationships: []
      }
      user_onboarding_profiles: {
        Row: {
          auto_create_proof_contracts: boolean | null
          challenge_avoidance: boolean | null
          coaching_style: string | null
          completed_onboarding: boolean | null
          created_at: string | null
          goals: string[] | null
          id: string
          identity_summary: string | null
          prefers_detailed_analysis: boolean | null
          roles: string[] | null
          seen_welcome: boolean
          strictness_level: number | null
          timezone: string
          timezone_source: string
          timezone_updated_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auto_create_proof_contracts?: boolean | null
          challenge_avoidance?: boolean | null
          coaching_style?: string | null
          completed_onboarding?: boolean | null
          created_at?: string | null
          goals?: string[] | null
          id?: string
          identity_summary?: string | null
          prefers_detailed_analysis?: boolean | null
          roles?: string[] | null
          seen_welcome?: boolean
          strictness_level?: number | null
          timezone?: string
          timezone_source?: string
          timezone_updated_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auto_create_proof_contracts?: boolean | null
          challenge_avoidance?: boolean | null
          coaching_style?: string | null
          completed_onboarding?: boolean | null
          created_at?: string | null
          goals?: string[] | null
          id?: string
          identity_summary?: string | null
          prefers_detailed_analysis?: boolean | null
          roles?: string[] | null
          seen_welcome?: boolean
          strictness_level?: number | null
          timezone?: string
          timezone_source?: string
          timezone_updated_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_research_profiles: {
        Row: {
          created_at: string | null
          id: string
          last_researched_at: string | null
          mode_id: string
          research_summary: string | null
          source_quality_notes: string | null
          topic: string
          updated_at: string | null
          user_id: string
          verified_sources: Json | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_researched_at?: string | null
          mode_id: string
          research_summary?: string | null
          source_quality_notes?: string | null
          topic: string
          updated_at?: string | null
          user_id: string
          verified_sources?: Json | null
        }
        Update: {
          created_at?: string | null
          id?: string
          last_researched_at?: string | null
          mode_id?: string
          research_summary?: string | null
          source_quality_notes?: string | null
          topic?: string
          updated_at?: string | null
          user_id?: string
          verified_sources?: Json | null
        }
        Relationships: []
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
      xp_events: {
        Row: {
          base_xp: number
          created_at: string
          diminishing_mult: number
          domain: string
          final_xp: number
          id: string
          pressure_mult: number
          proof_id: string | null
          quality: number
          quality_mult: number
          reasoning: string | null
          streak_mult: number
          tier: number
          transfer_mult: number
          user_id: string
          verdict: string
        }
        Insert: {
          base_xp: number
          created_at?: string
          diminishing_mult?: number
          domain: string
          final_xp: number
          id?: string
          pressure_mult?: number
          proof_id?: string | null
          quality: number
          quality_mult?: number
          reasoning?: string | null
          streak_mult?: number
          tier: number
          transfer_mult?: number
          user_id: string
          verdict: string
        }
        Update: {
          base_xp?: number
          created_at?: string
          diminishing_mult?: number
          domain?: string
          final_xp?: number
          id?: string
          pressure_mult?: number
          proof_id?: string | null
          quality?: number
          quality_mult?: number
          reasoning?: string | null
          streak_mult?: number
          tier?: number
          transfer_mult?: number
          user_id?: string
          verdict?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cle_base_xp: { Args: { tier: number }; Returns: number }
      cle_canon_domain: { Args: { d: string }; Returns: string }
      cle_classify_tier: {
        Args: {
          content: string
          evidence: string
          pressure: boolean
          quality: number
          transfer: boolean
        }
        Returns: number
      }
      cle_court: {
        Args: {
          is_duplicate: boolean
          quality: number
          tier: number
          vague: boolean
        }
        Returns: string
      }
      cle_level_threshold: { Args: { lvl: number }; Returns: number }
      cle_operator_title: { Args: { lvl: number }; Returns: string }
      cle_rank_for: { Args: { lvl: number }; Returns: string }
      cle_streak_mult: { Args: { streak: number }; Returns: number }
      cle_verdict_mult: { Args: { v: string }; Returns: number }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
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
