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
          expected_strength: string | null
          calibration_result: string | null
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
        },
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
          expected_strength?: string | null
          calibration_result?: string | null
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
        },
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
          expected_strength?: string | null
          calibration_result?: string | null
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
        },
        Relationships: []
      }