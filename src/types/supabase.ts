export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
          id: string
          updated_at: string | null
          year: number
        }
        Insert: {
          created_at?: string | null
          days_deferred: number
          employee_id?: string | null
          id?: string
          updated_at?: string | null
          year: number
        }
        Update: {
          created_at?: string | null
          days_deferred?: number
          employee_id?: string | null
          id?: string
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

      recalculate_all_leave_balances: {
        Args: Record<PropertyKey, never>
        Returns: {
          employee_name: string
          leave_type: string
          year: number
          old_used_days: number
          new_used_days: number
          status: string
        }[]
      }
      transfer_matched_leave_data: {
        Args: Record<PropertyKey, never>
        Returns: {
          transferred_count: number
          error_count: number
        }[]
      }
      update_leave_balance: {
        Args: {
          p_employee_id: string
          p_leave_type_id: string
          p_year: number
          p_days: number
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
