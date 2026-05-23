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
      ambassador_data_log: {
        Row: {
          ambassador_id: string
          amount_mb: number
          api_response: Json | null
          id: string
          network: string
          phone_number: string
          sent_at: string
          status: string
        }
        Insert: {
          ambassador_id: string
          amount_mb: number
          api_response?: Json | null
          id?: string
          network: string
          phone_number: string
          sent_at?: string
          status: string
        }
        Update: {
          ambassador_id?: string
          amount_mb?: number
          api_response?: Json | null
          id?: string
          network?: string
          phone_number?: string
          sent_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ambassador_data_log_ambassador_id_fkey"
            columns: ["ambassador_id"]
            isOneToOne: false
            referencedRelation: "brand_ambassadors"
            referencedColumns: ["id"]
          },
        ]
      }
      ambassador_referrals: {
        Row: {
          ambassador_user_id: string
          created_at: string
          id: string
          paid_out_at: string | null
          paid_qualifying_event: string | null
          payout_status: string
          paystack_transfer_ref: string | null
          qualified_at: string | null
          referred_user_id: string
          reward_ngn: number
        }
        Insert: {
          ambassador_user_id: string
          created_at?: string
          id?: string
          paid_out_at?: string | null
          paid_qualifying_event?: string | null
          payout_status?: string
          paystack_transfer_ref?: string | null
          qualified_at?: string | null
          referred_user_id: string
          reward_ngn?: number
        }
        Update: {
          ambassador_user_id?: string
          created_at?: string
          id?: string
          paid_out_at?: string | null
          paid_qualifying_event?: string | null
          payout_status?: string
          paystack_transfer_ref?: string | null
          qualified_at?: string | null
          referred_user_id?: string
          reward_ngn?: number
        }
        Relationships: []
      }
      ambassadors: {
        Row: {
          account_name: string | null
          bank_account_number: string | null
          bank_code: string | null
          created_at: string
          id: string
          paystack_recipient_code: string | null
          referral_code: string
          total_earned_ngn: number
          total_paid_out_ngn: number
          total_paid_referrals: number
          total_referrals: number
          updated_at: string
          user_id: string
        }
        Insert: {
          account_name?: string | null
          bank_account_number?: string | null
          bank_code?: string | null
          created_at?: string
          id?: string
          paystack_recipient_code?: string | null
          referral_code: string
          total_earned_ngn?: number
          total_paid_out_ngn?: number
          total_paid_referrals?: number
          total_referrals?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          account_name?: string | null
          bank_account_number?: string | null
          bank_code?: string | null
          created_at?: string
          id?: string
          paystack_recipient_code?: string | null
          referral_code?: string
          total_earned_ngn?: number
          total_paid_out_ngn?: number
          total_paid_referrals?: number
          total_referrals?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      birthday_data_log: {
        Row: {
          amount_mb: number
          api_response: Json | null
          id: string
          network: string
          phone_number: string
          sent_at: string
          sent_year: number
          status: string
          user_id: string
        }
        Insert: {
          amount_mb: number
          api_response?: Json | null
          id?: string
          network: string
          phone_number: string
          sent_at?: string
          sent_year?: number
          status: string
          user_id: string
        }
        Update: {
          amount_mb?: number
          api_response?: Json | null
          id?: string
          network?: string
          phone_number?: string
          sent_at?: string
          sent_year?: number
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      book_edits: {
        Row: {
          created_at: string
          edited_word_count: number
          id: string
          instructions: string | null
          mode_used: string
          original_word_count: number
          user_id: string
        }
        Insert: {
          created_at?: string
          edited_word_count?: number
          id?: string
          instructions?: string | null
          mode_used: string
          original_word_count?: number
          user_id: string
        }
        Update: {
          created_at?: string
          edited_word_count?: number
          id?: string
          instructions?: string | null
          mode_used?: string
          original_word_count?: number
          user_id?: string
        }
        Relationships: []
      }
      brand_ambassadors: {
        Row: {
          created_at: string
          full_name: string
          id: string
          network: string
          phone_number: string
          role: string
          status: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id?: string
          network: string
          phone_number: string
          role: string
          status?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          network?: string
          phone_number?: string
          role?: string
          status?: string
        }
        Relationships: []
      }
      budget_ledger: {
        Row: {
          amount_ngn: number
          approved_at: string | null
          approved_by: string | null
          category: string
          created_at: string
          description: string
          id: string
          related_ref: string | null
          related_user_id: string | null
          spent_at: string | null
          status: string
        }
        Insert: {
          amount_ngn: number
          approved_at?: string | null
          approved_by?: string | null
          category: string
          created_at?: string
          description: string
          id?: string
          related_ref?: string | null
          related_user_id?: string | null
          spent_at?: string | null
          status?: string
        }
        Update: {
          amount_ngn?: number
          approved_at?: string | null
          approved_by?: string | null
          category?: string
          created_at?: string
          description?: string
          id?: string
          related_ref?: string | null
          related_user_id?: string | null
          spent_at?: string | null
          status?: string
        }
        Relationships: []
      }
      certificates: {
        Row: {
          full_name: string
          id: string
          issued_at: string
          pdf_url: string
          user_id: string
        }
        Insert: {
          full_name: string
          id?: string
          issued_at?: string
          pdf_url: string
          user_id: string
        }
        Update: {
          full_name?: string
          id?: string
          issued_at?: string
          pdf_url?: string
          user_id?: string
        }
        Relationships: []
      }
      flutterwave_webhooks: {
        Row: {
          amount_ngn: number | null
          customer_email: string | null
          event_type: string
          id: string
          payment_reference: string | null
          raw_payload: Json | null
          received_at: string
          status: string | null
        }
        Insert: {
          amount_ngn?: number | null
          customer_email?: string | null
          event_type: string
          id?: string
          payment_reference?: string | null
          raw_payload?: Json | null
          received_at?: string
          status?: string | null
        }
        Update: {
          amount_ngn?: number | null
          customer_email?: string | null
          event_type?: string
          id?: string
          payment_reference?: string | null
          raw_payload?: Json | null
          received_at?: string
          status?: string | null
        }
        Relationships: []
      }
      keep_alive: {
        Row: {
          id: number
          pinged_at: string
        }
        Insert: {
          id?: number
          pinged_at?: string
        }
        Update: {
          id?: number
          pinged_at?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          date_submitted: string
          email: string
          id: string
          name: string
          whatsapp: string | null
        }
        Insert: {
          date_submitted?: string
          email: string
          id?: string
          name: string
          whatsapp?: string | null
        }
        Update: {
          date_submitted?: string
          email?: string
          id?: string
          name?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      newsletter_log: {
        Row: {
          body_html: string
          id: string
          recipients_count: number
          sent_at: string
          subject: string
          triggered_by: string
        }
        Insert: {
          body_html: string
          id?: string
          recipients_count?: number
          sent_at?: string
          subject: string
          triggered_by?: string
        }
        Update: {
          body_html?: string
          id?: string
          recipients_count?: number
          sent_at?: string
          subject?: string
          triggered_by?: string
        }
        Relationships: []
      }
      payment_verifications: {
        Row: {
          ai_confidence: number
          ai_notes: string | null
          created_at: string
          email: string
          expected_amount_ngn: number
          full_name: string
          id: string
          network: string | null
          payment_type: string
          receipt_url: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          transaction_reference: string | null
          user_id: string | null
          whatsapp: string
        }
        Insert: {
          ai_confidence?: number
          ai_notes?: string | null
          created_at?: string
          email: string
          expected_amount_ngn: number
          full_name: string
          id?: string
          network?: string | null
          payment_type: string
          receipt_url: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          transaction_reference?: string | null
          user_id?: string | null
          whatsapp: string
        }
        Update: {
          ai_confidence?: number
          ai_notes?: string | null
          created_at?: string
          email?: string
          expected_amount_ngn?: number
          full_name?: string
          id?: string
          network?: string | null
          payment_type?: string
          receipt_url?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          transaction_reference?: string | null
          user_id?: string | null
          whatsapp?: string
        }
        Relationships: []
      }
      recharge_history: {
        Row: {
          amount_ngn: number
          created_at: string
          flutterwave_reference: string | null
          id: string
          minutes_added: number
          plan_name: string
          status: string
          user_id: string
        }
        Insert: {
          amount_ngn: number
          created_at?: string
          flutterwave_reference?: string | null
          id?: string
          minutes_added: number
          plan_name: string
          status?: string
          user_id: string
        }
        Update: {
          amount_ngn?: number
          created_at?: string
          flutterwave_reference?: string | null
          id?: string
          minutes_added?: number
          plan_name?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      student_chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      student_profiles: {
        Row: {
          birthday: string | null
          birthday_md: string | null
          certificate_issued: boolean
          created_at: string
          daily_free_minutes_reset_date: string
          daily_free_minutes_used: number
          email: string | null
          first_name: string | null
          first_sale_made: boolean
          free_minutes_reset_date: string
          free_minutes_used: number
          full_name: string | null
          id: string
          inner_circle_expiry: string | null
          inner_circle_start: string | null
          inner_circle_status: string
          is_ambassador: boolean
          is_inner_circle: boolean
          network: string | null
          onboarding_complete: boolean
          phone_number: string | null
          purchased_minutes_balance: number
          secret_code_role: string | null
          trial_end: string | null
          trial_start: string | null
          updated_at: string
          user_id: string
          whatsapp: string | null
        }
        Insert: {
          birthday?: string | null
          birthday_md?: string | null
          certificate_issued?: boolean
          created_at?: string
          daily_free_minutes_reset_date?: string
          daily_free_minutes_used?: number
          email?: string | null
          first_name?: string | null
          first_sale_made?: boolean
          free_minutes_reset_date?: string
          free_minutes_used?: number
          full_name?: string | null
          id?: string
          inner_circle_expiry?: string | null
          inner_circle_start?: string | null
          inner_circle_status?: string
          is_ambassador?: boolean
          is_inner_circle?: boolean
          network?: string | null
          onboarding_complete?: boolean
          phone_number?: string | null
          purchased_minutes_balance?: number
          secret_code_role?: string | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string
          user_id: string
          whatsapp?: string | null
        }
        Update: {
          birthday?: string | null
          birthday_md?: string | null
          certificate_issued?: boolean
          created_at?: string
          daily_free_minutes_reset_date?: string
          daily_free_minutes_used?: number
          email?: string | null
          first_name?: string | null
          first_sale_made?: boolean
          free_minutes_reset_date?: string
          free_minutes_used?: number
          full_name?: string | null
          id?: string
          inner_circle_expiry?: string | null
          inner_circle_start?: string | null
          inner_circle_status?: string
          is_ambassador?: boolean
          is_inner_circle?: boolean
          network?: string | null
          onboarding_complete?: boolean
          phone_number?: string | null
          purchased_minutes_balance?: number
          secret_code_role?: string | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string
          user_id?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      student_results: {
        Row: {
          date_submitted: string
          full_name: string
          id: string
          is_verified: boolean
          profile_photo_url: string
          proof_image_url: string | null
          sale_amount: number | null
          star_rating: number
          what_they_sell: string
          win_story: string
        }
        Insert: {
          date_submitted?: string
          full_name: string
          id?: string
          is_verified?: boolean
          profile_photo_url: string
          proof_image_url?: string | null
          sale_amount?: number | null
          star_rating?: number
          what_they_sell: string
          win_story: string
        }
        Update: {
          date_submitted?: string
          full_name?: string
          id?: string
          is_verified?: boolean
          profile_photo_url?: string
          proof_image_url?: string | null
          sale_amount?: number | null
          star_rating?: number
          what_they_sell?: string
          win_story?: string
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
          role: Database["public"]["Enums"]["app_role"]
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
      voice_call_log: {
        Row: {
          amount_paid_ngn: number
          created_at: string
          duration_seconds: number
          ended_at: string | null
          id: string
          livekit_room: string | null
          minutes_used: number
          started_at: string
          status: string
          user_id: string
          was_free: boolean
        }
        Insert: {
          amount_paid_ngn?: number
          created_at?: string
          duration_seconds?: number
          ended_at?: string | null
          id?: string
          livekit_room?: string | null
          minutes_used?: number
          started_at?: string
          status?: string
          user_id: string
          was_free?: boolean
        }
        Update: {
          amount_paid_ngn?: number
          created_at?: string
          duration_seconds?: number
          ended_at?: string | null
          id?: string
          livekit_room?: string | null
          minutes_used?: number
          started_at?: string
          status?: string
          user_id?: string
          was_free?: boolean
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
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
