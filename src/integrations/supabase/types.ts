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
      activity_log: {
        Row: {
          action: string
          client_id: string | null
          created_at: string
          id: string
          order_id: string | null
          timestamp: string
          user_id: string | null
          user_name: string
        }
        Insert: {
          action: string
          client_id?: string | null
          created_at?: string
          id?: string
          order_id?: string | null
          timestamp?: string
          user_id?: string | null
          user_name?: string
        }
        Update: {
          action?: string
          client_id?: string | null
          created_at?: string
          id?: string
          order_id?: string | null
          timestamp?: string
          user_id?: string | null
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      article_numbers: {
        Row: {
          created_at: string | null
          id: string
          value: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          value: string
        }
        Update: {
          created_at?: string | null
          id?: string
          value?: string
        }
        Relationships: []
      }
      business_settings: {
        Row: {
          address: string | null
          bankgiro: string | null
          company_name: string | null
          email: string | null
          id: number
          logo_url: string | null
          momsreg: string | null
          org_number: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          bankgiro?: string | null
          company_name?: string | null
          email?: string | null
          id?: number
          logo_url?: string | null
          momsreg?: string | null
          org_number?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          bankgiro?: string | null
          company_name?: string | null
          email?: string | null
          id?: number
          logo_url?: string | null
          momsreg?: string | null
          org_number?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          description: string | null
          end_date: string | null
          end_time: string | null
          event_date: string
          event_time: string | null
          id: string
          location: string | null
          recurrence: string | null
          reminder_at: string | null
          subtasks: Json | null
          title: string
          visible_to: string[] | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          end_date?: string | null
          end_time?: string | null
          event_date: string
          event_time?: string | null
          id?: string
          location?: string | null
          recurrence?: string | null
          reminder_at?: string | null
          subtasks?: Json | null
          title: string
          visible_to?: string[] | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          end_date?: string | null
          end_time?: string | null
          event_date?: string
          event_time?: string | null
          id?: string
          location?: string | null
          recurrence?: string | null
          reminder_at?: string | null
          subtasks?: Json | null
          title?: string
          visible_to?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_tasks: {
        Row: {
          assigned_to: string | null
          bucket: string | null
          completed: boolean | null
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          description: string | null
          due_date: string | null
          id: string
          list_id: string | null
          points: number | null
          recurrence: string | null
          reminder_at: string | null
          reminder_location: string | null
          subtasks: Json | null
          title: string
          visibility: string | null
        }
        Insert: {
          assigned_to?: string | null
          bucket?: string | null
          completed?: boolean | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          list_id?: string | null
          points?: number | null
          recurrence?: string | null
          reminder_at?: string | null
          reminder_location?: string | null
          subtasks?: Json | null
          title: string
          visibility?: string | null
        }
        Update: {
          assigned_to?: string | null
          bucket?: string | null
          completed?: boolean | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          list_id?: string | null
          points?: number | null
          recurrence?: string | null
          reminder_at?: string | null
          reminder_location?: string | null
          subtasks?: Json | null
          title?: string
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_tasks_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_tasks_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "task_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          company_name: string
          contact_person: string
          created_at: string
          email: string
          id: string
          kundnr: number | null
          notes: string | null
          org_number: string
          phone: string
          total_spent: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          company_name: string
          contact_person?: string
          created_at?: string
          email?: string
          id: string
          kundnr?: number | null
          notes?: string | null
          org_number?: string
          phone?: string
          total_spent?: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          company_name?: string
          contact_person?: string
          created_at?: string
          email?: string
          id?: string
          kundnr?: number | null
          notes?: string | null
          org_number?: string
          phone?: string
          total_spent?: number
          updated_at?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          created_at: string | null
          created_by: string | null
          fields: Json
          id: string
          order_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          fields: Json
          id?: string
          order_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          fields?: Json
          id?: string
          order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      extra_costs: {
        Row: {
          amount: number
          created_at: string | null
          description: string
          id: string
          item_id: string
          offer_id: string
        }
        Insert: {
          amount?: number
          created_at?: string | null
          description: string
          id?: string
          item_id: string
          offer_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string
          id?: string
          item_id?: string
          offer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "extra_costs_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          aktiv: boolean | null
          artikelnummer: number
          benamning: string
          created_at: string | null
          ean: string | null
          enhet: string | null
          id: string
          leverantorsnamn: string | null
          tillverkare: string | null
          tillverkarens_artikelnummer: string | null
          updated_at: string | null
        }
        Insert: {
          aktiv?: boolean | null
          artikelnummer: number
          benamning: string
          created_at?: string | null
          ean?: string | null
          enhet?: string | null
          id?: string
          leverantorsnamn?: string | null
          tillverkare?: string | null
          tillverkarens_artikelnummer?: string | null
          updated_at?: string | null
        }
        Update: {
          aktiv?: boolean | null
          artikelnummer?: number
          benamning?: string
          created_at?: string | null
          ean?: string | null
          enhet?: string | null
          id?: string
          leverantorsnamn?: string | null
          tillverkare?: string | null
          tillverkarens_artikelnummer?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      manufacturers: {
        Row: {
          created_at: string | null
          id: string
          is_inhouse: boolean | null
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_inhouse?: boolean | null
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_inhouse?: boolean | null
          name?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string | null
          dismissed: boolean | null
          fire_at: string
          id: string
          source_id: string | null
          source_type: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          dismissed?: boolean | null
          fire_at: string
          id?: string
          source_id?: string | null
          source_type?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string | null
          dismissed?: boolean | null
          fire_at?: string
          id?: string
          source_id?: string | null
          source_type?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_size: number
          file_type: string
          id: string
          order_id: string
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number
          file_type?: string
          id?: string
          order_id: string
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number
          file_type?: string
          id?: string
          order_id?: string
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_attachments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          attachments: Json
          change_log: Json
          client_id: string
          created_at: string
          deadline: string | null
          deleted_at: string | null
          folder_path: string | null
          id: string
          invoice_sent: boolean
          manufacturer: string
          needs_attention: boolean
          needs_attention_note: string
          notes: string
          paid: boolean
          pipeline: Json
          price: number | null
          products: Json
          updated_at: string
        }
        Insert: {
          attachments?: Json
          change_log?: Json
          client_id: string
          created_at?: string
          deadline?: string | null
          deleted_at?: string | null
          folder_path?: string | null
          id: string
          invoice_sent?: boolean
          manufacturer?: string
          needs_attention?: boolean
          needs_attention_note?: string
          notes?: string
          paid?: boolean
          pipeline?: Json
          price?: number | null
          products?: Json
          updated_at?: string
        }
        Update: {
          attachments?: Json
          change_log?: Json
          client_id?: string
          created_at?: string
          deadline?: string | null
          deleted_at?: string | null
          folder_path?: string | null
          id?: string
          invoice_sent?: boolean
          manufacturer?: string
          needs_attention?: boolean
          needs_attention_note?: string
          notes?: string
          paid?: boolean
          pipeline?: Json
          price?: number | null
          products?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string
          id: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      serial_numbers: {
        Row: {
          created_at: string | null
          id: string
          value: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          value: string
        }
        Update: {
          created_at?: string | null
          id?: string
          value?: string
        }
        Relationships: []
      }
      task_lists: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          is_shared: boolean | null
          name: string
          owner: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          is_shared?: boolean | null
          name: string
          owner: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          is_shared?: boolean | null
          name?: string
          owner?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_lists_owner_fkey"
            columns: ["owner"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_dashboard_stats: { Args: never; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      next_order_id: { Args: never; Returns: string }
    }
    Enums: {
      app_role: "owner" | "staff" | "designer" | "producer"
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
      app_role: ["owner", "staff", "designer", "producer"],
    },
  },
} as const
