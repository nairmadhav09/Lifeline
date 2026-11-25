/**
 * Supabase database types — mirrors supabase/migrations.
 *
 * Hand-written in the exact shape `supabase gen types` emits. To regenerate
 * from the live project after schema changes:
 *   npx supabase login
 *   npx supabase gen types typescript --project-id <project-ref> --schema public > types/database.ts
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "12.2.3";
  };
  public: {
    Tables: {
      ai_insights: {
        Row: {
          content: Json;
          created_at: string;
          dismissed: boolean;
          id: string;
          key: string;
          period: string;
          type: Database["public"]["Enums"]["insight_type"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          content: Json;
          created_at?: string;
          dismissed?: boolean;
          id?: string;
          key?: string;
          period: string;
          type: Database["public"]["Enums"]["insight_type"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          content?: Json;
          created_at?: string;
          dismissed?: boolean;
          id?: string;
          key?: string;
          period?: string;
          type?: Database["public"]["Enums"]["insight_type"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          color: string;
          created_at: string;
          icon: string;
          id: string;
          is_default: boolean;
          name: string;
          sort_order: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          color?: string;
          created_at?: string;
          icon?: string;
          id?: string;
          is_default?: boolean;
          name: string;
          sort_order?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          color?: string;
          created_at?: string;
          icon?: string;
          id?: string;
          is_default?: boolean;
          name?: string;
          sort_order?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      documents: {
        Row: {
          ai_extracted: Json | null;
          created_at: string;
          file_name: string;
          id: string;
          mime_type: string;
          size_bytes: number | null;
          storage_path: string;
          task_instance_id: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          ai_extracted?: Json | null;
          created_at?: string;
          file_name: string;
          id?: string;
          mime_type: string;
          size_bytes?: number | null;
          storage_path: string;
          task_instance_id?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          ai_extracted?: Json | null;
          created_at?: string;
          file_name?: string;
          id?: string;
          mime_type?: string;
          size_bytes?: number | null;
          storage_path?: string;
          task_instance_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "documents_task_instance_id_user_id_fkey";
            columns: ["task_instance_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "task_instances";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          currency: string;
          display_name: string | null;
          id: string;
          monthly_budget: number | null;
          onboarding_completed: boolean;
          timezone: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          currency?: string;
          display_name?: string | null;
          id?: string;
          monthly_budget?: number | null;
          onboarding_completed?: boolean;
          timezone?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          currency?: string;
          display_name?: string | null;
          id?: string;
          monthly_budget?: number | null;
          onboarding_completed?: boolean;
          timezone?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      task_instances: {
        Row: {
          amount_due: number;
          amount_paid: number | null;
          confirmation_number: string | null;
          created_at: string;
          due_date: string;
          id: string;
          paid_at: string | null;
          period: string;
          receipt_path: string | null;
          status: Database["public"]["Enums"]["instance_status"];
          task_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          amount_due?: number;
          amount_paid?: number | null;
          confirmation_number?: string | null;
          created_at?: string;
          due_date: string;
          id?: string;
          paid_at?: string | null;
          period: string;
          receipt_path?: string | null;
          status?: Database["public"]["Enums"]["instance_status"];
          task_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          amount_due?: number;
          amount_paid?: number | null;
          confirmation_number?: string | null;
          created_at?: string;
          due_date?: string;
          id?: string;
          paid_at?: string | null;
          period?: string;
          receipt_path?: string | null;
          status?: Database["public"]["Enums"]["instance_status"];
          task_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "task_instances_task_id_user_id_fkey";
            columns: ["task_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      tasks: {
        Row: {
          account_reference: string | null;
          amount: number;
          archived_at: string | null;
          autopay: boolean;
          category_id: string | null;
          created_at: string;
          currency: string;
          due_day: number;
          due_month: number | null;
          end_date: string | null;
          id: string;
          is_archived: boolean;
          is_variable_amount: boolean;
          notes: string | null;
          payee: string | null;
          payment_method: string | null;
          recurrence: Database["public"]["Enums"]["recurrence_type"];
          reminder_days_before: number[];
          start_date: string;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          account_reference?: string | null;
          amount?: number;
          archived_at?: string | null;
          autopay?: boolean;
          category_id?: string | null;
          created_at?: string;
          currency?: string;
          due_day: number;
          due_month?: number | null;
          end_date?: string | null;
          id?: string;
          is_archived?: boolean;
          is_variable_amount?: boolean;
          notes?: string | null;
          payee?: string | null;
          payment_method?: string | null;
          recurrence?: Database["public"]["Enums"]["recurrence_type"];
          reminder_days_before?: number[];
          start_date?: string;
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          account_reference?: string | null;
          amount?: number;
          archived_at?: string | null;
          autopay?: boolean;
          category_id?: string | null;
          created_at?: string;
          currency?: string;
          due_day?: number;
          due_month?: number | null;
          end_date?: string | null;
          id?: string;
          is_archived?: boolean;
          is_variable_amount?: boolean;
          notes?: string | null;
          payee?: string | null;
          payment_method?: string | null;
          recurrence?: Database["public"]["Enums"]["recurrence_type"];
          reminder_days_before?: number[];
          start_date?: string;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_category_id_user_id_fkey";
            columns: ["category_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
    };
    Views: {
      task_instance_details: {
        Row: {
          account_reference: string | null;
          amount_due: number | null;
          amount_paid: number | null;
          autopay: boolean | null;
          category_color: string | null;
          category_icon: string | null;
          category_id: string | null;
          category_name: string | null;
          confirmation_number: string | null;
          created_at: string | null;
          currency: string | null;
          days_until_due: number | null;
          due_date: string | null;
          id: string | null;
          is_variable_amount: boolean | null;
          paid_at: string | null;
          payee: string | null;
          payment_method: string | null;
          period: string | null;
          receipt_path: string | null;
          recurrence: Database["public"]["Enums"]["recurrence_type"] | null;
          status: Database["public"]["Enums"]["instance_status"] | null;
          task_id: string | null;
          task_is_archived: boolean | null;
          title: string | null;
          updated_at: string | null;
          user_id: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      ensure_task_instances: {
        Args: { p_from?: string; p_months?: number };
        Returns: number;
      };
      generate_task_instances: {
        Args: { p_from: string; p_months?: number; p_task_id?: string; p_user_id: string };
        Returns: number;
      };
      instance_due_date: {
        Args: { p_due_day: number; p_period: string };
        Returns: string;
      };
      seed_default_categories: {
        Args: { p_user_id: string };
        Returns: undefined;
      };
      task_occurs_in: {
        Args: {
          p_due_month: number;
          p_period: string;
          p_recurrence: Database["public"]["Enums"]["recurrence_type"];
          p_start_date: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      insight_type: "summary" | "anomaly" | "suggestion";
      instance_status: "upcoming" | "due_soon" | "overdue" | "paid" | "skipped";
      recurrence_type: "monthly" | "quarterly" | "half_yearly" | "yearly" | "one_time";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"];
export type Views<T extends keyof PublicSchema["Views"]> = PublicSchema["Views"][T]["Row"];
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T];

export const Constants = {
  public: {
    Enums: {
      insight_type: ["summary", "anomaly", "suggestion"],
      instance_status: ["upcoming", "due_soon", "overdue", "paid", "skipped"],
      recurrence_type: ["monthly", "quarterly", "half_yearly", "yearly", "one_time"],
    },
  },
} as const;
