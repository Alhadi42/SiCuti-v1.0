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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      employees: {
        Row: {
          asn_status: string | null
          created_at: string | null
          department: string | null
          id: string
          join_date: string | null
          name: string
          nip: string | null
          old_position: string | null
          position_name: string | null
          position_type: string | null
          rank_group: string | null
          updated_at: string | null
        }
        Insert: {
          asn_status?: string | null
          created_at?: string | null
          department?: string | null
          id?: string
          join_date?: string | null
          name: string
          nip?: string | null
          old_position?: string | null
          position_name?: string | null
          position_type?: string | null
          rank_group?: string | null
          updated_at?: string | null
        }
        Update: {
          asn_status?: string | null
          created_at?: string | null
          department?: string | null
          id?: string
          join_date?: string | null
          name?: string
          nip?: string | null
          old_position?: string | null
          position_name?: string | null
          position_type?: string | null
          rank_group?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      leave_balances: {
        Row: {
          created_at: string | null
          deferred_days: number | null
          employee_id: string | null
          id: string
          leave_type_id: string | null
          total_days: number
          updated_at: string | null
          used_days: number | null
          year: number
        }
        Insert: {
          created_at?: string | null
          deferred_days?: number | null
          employee_id?: string | null
          id?: string
          leave_type_id?: string | null
          total_days: number
          updated_at?: string | null
          used_days?: number | null
          year: number
        }
        Update: {
          created_at?: string | null
          deferred_days?: number | null
          employee_id?: string | null
          id?: string
          leave_type_id?: string | null
          total_days?: number
          updated_at?: string | null
          used_days?: number | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "leave_balances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balances_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_deferrals: {
        Row: {
          created_at: string | null
          days_deferred: number
          employee_id: string | null
          google_drive_link: string | null
          id: string
          notes: string | null
          updated_at: string | null
          year: number
        }
        Insert: {
          created_at?: string | null
          days_deferred: number
          employee_id?: string | null
          google_drive_link?: string | null
          id?: string
          notes?: string | null
          updated_at?: string | null
          year: number
        }
        Update: {
          created_at?: string | null
          days_deferred?: number
          employee_id?: string | null
          google_drive_link?: string | null
          id?: string
          notes?: string | null
          updated_at?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "leave_deferrals_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_letter_templates: {
        Row: {
          content: string
          created_at: string | null
          id: string
          leave_type_id: string | null
          name: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          leave_type_id?: string | null
          name: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          leave_type_id?: string | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      leave_proposal_completion_log: {
        Row: {
          completed_at: string
          completed_by: string | null
          completed_by_name: string | null
          details: Json | null
          id: string
          proposal_date: string
          proposer_unit: string
        }
        Insert: {
          completed_at?: string
          completed_by?: string | null
          completed_by_name?: string | null
          details?: Json | null
          id?: string
          proposal_date: string
          proposer_unit: string
        }
        Update: {
          completed_at?: string
          completed_by?: string | null
          completed_by_name?: string | null
          details?: Json | null
          id?: string
          proposal_date?: string
          proposer_unit?: string
        }
        Relationships: []
      }
      leave_proposal_items: {
        Row: {
          address_during_leave: string | null
          created_at: string | null
          days_requested: number
          employee_department: string
          employee_id: string | null
          employee_name: string
          employee_nip: string
          employee_position: string | null
          end_date: string
          id: string
          leave_quota_year: number
          leave_type_id: string | null
          leave_type_name: string
          proposal_id: string
          reason: string | null
          start_date: string
          status: string | null
        }
        Insert: {
          address_during_leave?: string | null
          created_at?: string | null
          days_requested?: number
          employee_department: string
          employee_id?: string | null
          employee_name: string
          employee_nip: string
          employee_position?: string | null
          end_date: string
          id?: string
          leave_quota_year?: number
          leave_type_id?: string | null
          leave_type_name: string
          proposal_id: string
          reason?: string | null
          start_date: string
          status?: string | null
        }
        Update: {
          address_during_leave?: string | null
          created_at?: string | null
          days_requested?: number
          employee_department?: string
          employee_id?: string | null
          employee_name?: string
          employee_nip?: string
          employee_position?: string | null
          end_date?: string
          id?: string
          leave_quota_year?: number
          leave_type_id?: string | null
          leave_type_name?: string
          proposal_id?: string
          reason?: string | null
          start_date?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leave_proposal_items_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_proposal_items_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_proposal_items_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "leave_proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_proposals: {
        Row: {
          approved_by: string | null
          approved_date: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          id: string
          letter_date: string | null
          letter_number: string | null
          notes: string | null
          proposal_date: string | null
          proposal_title: string
          proposed_by: string
          proposer_name: string
          proposer_unit: string
          rejection_reason: string | null
          status: string | null
          total_employees: number | null
          updated_at: string | null
        }
        Insert: {
          approved_by?: string | null
          approved_date?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          id?: string
          letter_date?: string | null
          letter_number?: string | null
          notes?: string | null
          proposal_date?: string | null
          proposal_title: string
          proposed_by: string
          proposer_name: string
          proposer_unit: string
          rejection_reason?: string | null
          status?: string | null
          total_employees?: number | null
          updated_at?: string | null
        }
        Update: {
          approved_by?: string | null
          approved_date?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          id?: string
          letter_date?: string | null
          letter_number?: string | null
          notes?: string | null
          proposal_date?: string | null
          proposal_title?: string
          proposed_by?: string
          proposer_name?: string
          proposer_unit?: string
          rejection_reason?: string | null
          status?: string | null
          total_employees?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leave_proposals_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_request_documents: {
        Row: {
          file_name: string
          file_path: string
          id: string
          leave_request_id: string | null
          uploaded_at: string | null
        }
        Insert: {
          file_name: string
          file_path: string
          id?: string
          leave_request_id?: string | null
          uploaded_at?: string | null
        }
        Update: {
          file_name?: string
          file_path?: string
          id?: string
          leave_request_id?: string | null
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leave_request_documents_leave_request_id_fkey"
            columns: ["leave_request_id"]
            isOneToOne: false
            referencedRelation: "leave_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          address_during_leave: string | null
          application_form_date: string | null
          created_at: string | null
          days_requested: number
          employee_id: string | null
          end_date: string
          id: string
          leave_letter_date: string | null
          leave_letter_number: string | null
          leave_quota_year: number | null
          leave_type_id: string | null
          reason: string | null
          reference_number: string | null
          signed_by: string | null
          start_date: string
          submitted_date: string | null
          updated_at: string | null
        }
        Insert: {
          address_during_leave?: string | null
          application_form_date?: string | null
          created_at?: string | null
          days_requested: number
          employee_id?: string | null
          end_date: string
          id?: string
          leave_letter_date?: string | null
          leave_letter_number?: string | null
          leave_quota_year?: number | null
          leave_type_id?: string | null
          reason?: string | null
          reference_number?: string | null
          signed_by?: string | null
          start_date: string
          submitted_date?: string | null
          updated_at?: string | null
        }
        Update: {
          address_during_leave?: string | null
          application_form_date?: string | null
          created_at?: string | null
          days_requested?: number
          employee_id?: string | null
          end_date?: string
          id?: string
          leave_letter_date?: string | null
          leave_letter_number?: string | null
          leave_quota_year?: number | null
          leave_type_id?: string | null
          reason?: string | null
          reference_number?: string | null
          signed_by?: string | null
          start_date?: string
          submitted_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_types: {
        Row: {
          can_defer: boolean | null
          created_at: string | null
          default_days: number
          id: string
          max_days: number | null
          name: string
          updated_at: string | null
        }
        Insert: {
          can_defer?: boolean | null
          created_at?: string | null
          default_days: number
          id?: string
          max_days?: number | null
          name: string
          updated_at?: string | null
        }
        Update: {
          can_defer?: boolean | null
          created_at?: string | null
          default_days?: number
          id?: string
          max_days?: number | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      national_holidays: {
        Row: {
          created_at: string | null
          date: string
          id: string
          name: string
          updated_at: string | null
          year: number | null
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          name: string
          updated_at?: string | null
          year?: number | null
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          name?: string
          updated_at?: string | null
          year?: number | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          data: Json | null
          id: string
          message: string | null
          priority: string | null
          read_at: string | null
          title: string | null
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          id?: string
          message?: string | null
          priority?: string | null
          read_at?: string | null
          title?: string | null
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          id?: string
          message?: string | null
          priority?: string | null
          read_at?: string | null
          title?: string | null
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_completions: {
        Row: {
          completed_at: string | null
          completed_by: string
          completed_by_name: string
          created_at: string | null
          id: string
          proposal_date: string
          proposal_key: string
          request_ids: Json | null
          total_days: number
          total_employees: number
          total_requests: number
          unit_name: string
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          completed_by: string
          completed_by_name: string
          created_at?: string | null
          id?: string
          proposal_date: string
          proposal_key: string
          request_ids?: Json | null
          total_days: number
          total_employees: number
          total_requests: number
          unit_name: string
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          completed_by?: string
          completed_by_name?: string
          created_at?: string | null
          id?: string
          proposal_date?: string
          proposal_key?: string
          request_ids?: Json | null
          total_days?: number
          total_employees?: number
          total_requests?: number
          unit_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      templates: {
        Row: {
          content: Json
          created_at: string
          description: string | null
          id: string
          name: string
          type: string
          user_id: string | null
        }
        Insert: {
          content: Json
          created_at?: string
          description?: string | null
          id?: string
          name: string
          type: string
          user_id?: string | null
        }
        Update: {
          content?: Json
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          id: string
          last_login: string | null
          name: string
          password: string
          permissions: string[] | null
          role: string
          status: string | null
          unit_kerja: string
          updated_at: string | null
          username: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          last_login?: string | null
          name: string
          password: string
          permissions?: string[] | null
          role: string
          status?: string | null
          unit_kerja: string
          updated_at?: string | null
          username: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          last_login?: string | null
          name?: string
          password?: string
          permissions?: string[] | null
          role?: string
          status?: string | null
          unit_kerja?: string
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_all_departments: {
        Args: Record<PropertyKey, never>
        Returns: {
          department: string
        }[]
      }
      get_dashboard_stats: {
        Args: { p_department?: string }
        Returns: Json
      }
      get_distinct_departments: {
        Args: Record<PropertyKey, never>
        Returns: {
          department_name: string
        }[]
      }
      mark_proposal_completed: {
        Args: { p_completed_by: string; p_date: string; p_unit: string }
        Returns: {
          approved_by: string | null
          approved_date: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          id: string
          letter_date: string | null
          letter_number: string | null
          notes: string | null
          proposal_date: string | null
          proposal_title: string
          proposed_by: string
          proposer_name: string
          proposer_unit: string
          rejection_reason: string | null
          status: string | null
          total_employees: number | null
          updated_at: string | null
        }[]
      }
      mark_proposals_completed: {
        Args: {
          p_completed_by?: string
          p_completed_by_name?: string
          p_details?: Json
          p_proposal_date: string
          p_unit: string
        }
        Returns: number
      }
      process_temp_leave_import: {
        Args: Record<PropertyKey, never>
        Returns: {
          matched_count: number
          processed_count: number
          unmatched_count: number
        }[]
      }
      recalculate_all_leave_balances: {
        Args: Record<PropertyKey, never>
        Returns: {
          employee_name: string
          leave_type: string
          new_used_days: number
          old_used_days: number
          status: string
          year: number
        }[]
      }
      restore_proposal: {
        Args: { p_date: string; p_unit: string }
        Returns: {
          approved_by: string | null
          approved_date: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          id: string
          letter_date: string | null
          letter_number: string | null
          notes: string | null
          proposal_date: string | null
          proposal_title: string
          proposed_by: string
          proposer_name: string
          proposer_unit: string
          rejection_reason: string | null
          status: string | null
          total_employees: number | null
          updated_at: string | null
        }[]
      }
      restore_proposals_to_pending: {
        Args: {
          p_details?: Json
          p_proposal_date: string
          p_restored_by?: string
          p_restored_by_name?: string
          p_unit: string
        }
        Returns: number
      }
      transfer_matched_leave_data: {
        Args: Record<PropertyKey, never>
        Returns: {
          error_count: number
          transferred_count: number
        }[]
      }
      update_leave_balance: {
        Args: {
          p_days: number
          p_employee_id: string
          p_leave_type_id: string
          p_year: number
        }
        Returns: undefined
      }
      update_leave_balance_advanced: {
        Args:
          | {
              p_days_requested: number
              p_employee_id: string
              p_leave_quota_year: number
              p_leave_type_id: string
              p_operation?: string
            }
          | {
              p_employee_id: string
              p_leave_type_id: string
              p_preferred_year?: number
              p_requested_days: number
            }
        Returns: Json
      }
      update_leave_balance_with_splitting: {
        Args: {
          p_days: number
          p_employee_id: string
          p_leave_type_id: string
          p_requested_year: number
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
