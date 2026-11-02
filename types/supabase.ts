export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          country: string | null;
          expertise: string | null;
          bio: string | null;
          role: "user" | "admin";
          headline: string | null;
          phone: string | null;
          timezone: string | null;
          linkedin_url: string | null;
          weekly_hours: number | null;
          languages: string[];
          skills: string[];
          education: Json;
          experience: Json;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          country?: string | null;
          expertise?: string | null;
          bio?: string | null;
          role?: "user" | "admin";
          headline?: string | null;
          phone?: string | null;
          timezone?: string | null;
          linkedin_url?: string | null;
          weekly_hours?: number | null;
          languages?: string[];
          skills?: string[];
          education?: Json;
          experience?: Json;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          country?: string | null;
          expertise?: string | null;
          bio?: string | null;
          role?: "user" | "admin";
          headline?: string | null;
          phone?: string | null;
          timezone?: string | null;
          linkedin_url?: string | null;
          weekly_hours?: number | null;
          languages?: string[];
          skills?: string[];
          education?: Json;
          experience?: Json;
          avatar_url?: string | null;
          created_at?: string;
        };
      };
      tasks: {
        Row: {
          id: string;
          slug: string;
          title: string;
          summary: string;
          description: string;
          category: string;
          pay_min: number | null;
          pay_max: number | null;
          pay_unit: string | null;
          location: string | null;
          commitment: string | null;
          slots: number | null;
          status: "draft" | "open" | "closed";
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          summary: string;
          description: string;
          category: string;
          pay_min?: number | null;
          pay_max?: number | null;
          pay_unit?: string | null;
          location?: string | null;
          commitment?: string | null;
          slots?: number | null;
          status?: "draft" | "open" | "closed";
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          title?: string;
          summary?: string;
          description?: string;
          category?: string;
          pay_min?: number | null;
          pay_max?: number | null;
          pay_unit?: string | null;
          location?: string | null;
          commitment?: string | null;
          slots?: number | null;
          status?: "draft" | "open" | "closed";
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      applications: {
        Row: {
          id: string;
          task_id: string;
          user_id: string;
          status: "waitlisted" | "approved" | "rejected" | "withdrawn";
          note: string | null;
          position: number | null;
          admin_note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          user_id: string;
          status?: "waitlisted" | "approved" | "rejected" | "withdrawn";
          note?: string | null;
          position?: number | null;
          admin_note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          user_id?: string;
          status?: "waitlisted" | "approved" | "rejected" | "withdrawn";
          note?: string | null;
          position?: number | null;
          admin_note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      application_events: {
        Row: {
          id: string;
          application_id: string;
          status: "waitlisted" | "approved" | "rejected" | "withdrawn";
          message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          application_id: string;
          status: "waitlisted" | "approved" | "rejected" | "withdrawn";
          message?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          application_id?: string;
          status?: "waitlisted" | "approved" | "rejected" | "withdrawn";
          message?: string | null;
          created_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          body: string | null;
          href: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          title: string;
          body?: string | null;
          href?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          title?: string;
          body?: string | null;
          href?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      my_waitlist_rank: {
        Args: {
          p_application_id: string;
        };
        Returns: {
          rank: number;
          total: number;
        }[];
      };
      reapply: {
        Args: {
          p_application_id: string;
        };
        Returns: undefined;
      };
    };
    Enums: {
      user_role: "user" | "admin";
      task_status: "draft" | "open" | "closed";
      application_status: "waitlisted" | "approved" | "rejected" | "withdrawn";
    };
  };
};
