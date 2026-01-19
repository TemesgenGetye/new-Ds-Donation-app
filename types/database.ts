export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          phone: string | null;
          full_name: string;
          role: "donor" | "recipient" | "admin";
          avatar_url: string | null;
          location: string | null;
          verification_image_url: string | null;
          recipient_status: "unrequested" | "requested" | "approved";
          created_at: string;
          updated_at: string;
          blocked?: boolean;
        };
        Insert: {
          id: string;
          email: string;
          phone?: string | null;
          full_name: string;
          role?: "donor" | "recipient" | "admin";
          avatar_url?: string | null;
          location?: string | null;
          verification_image_url?: string | null;
          recipient_status?: "unrequested" | "requested" | "approved";
          created_at?: string;
          updated_at?: string;
          blocked?: boolean;
        };
        Update: {
          id?: string;
          email?: string;
          phone?: string | null;
          full_name?: string;
          role?: "donor" | "recipient" | "admin";
          avatar_url?: string | null;
          location?: string | null;
          verification_image_url?: string | null;
          recipient_status?: "unrequested" | "requested" | "approved";
          created_at?: string;
          updated_at?: string;
          blocked?: boolean;
        };
      };
      donations: {
        Row: {
          id: string;
          donor_id: string;
          title: string;
          description: string;
          category: string;
          location: string;
          image_url: string | null;
          status:
            | "pending"
            | "available"
            | "claimed"
            | "completed"
            | "rejected";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          donor_id: string;
          title: string;
          description: string;
          category: string;
          location: string;
          image_url?: string | null;
          status?:
            | "pending"
            | "available"
            | "claimed"
            | "completed"
            | "rejected";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          donor_id?: string;
          title?: string;
          description?: string;
          category?: string;
          location?: string;
          image_url?: string | null;
          status?:
            | "pending"
            | "available"
            | "claimed"
            | "completed"
            | "rejected";
          created_at?: string;
          updated_at?: string;
        };
      };
      requests: {
        Row: {
          id: string;
          donation_id: string;
          recipient_id: string;
          message: string;
          status: "pending" | "approved" | "rejected";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          donation_id: string;
          recipient_id: string;
          message: string;
          status?: "pending" | "approved" | "rejected";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          donation_id?: string;
          recipient_id?: string;
          message?: string;
          status?: "pending" | "approved" | "rejected";
          created_at?: string;
          updated_at?: string;
        };
      };
      ratings: {
        Row: {
          id: string;
          donation_id: string;
          recipient_id: string;
          donor_id: string;
          rating: number;
          comment: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          donation_id: string;
          recipient_id: string;
          donor_id: string;
          rating: number;
          comment?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          donation_id?: string;
          recipient_id?: string;
          donor_id?: string;
          rating?: number;
          comment?: string | null;
          created_at?: string;
        };
      };
      reports: {
        Row: {
          id: string;
          reporter_id: string;
          reported_id: string;
          type: "user" | "donation";
          reason: string;
          description: string | null;
          status: "pending" | "reviewed" | "resolved";
          created_at: string;
        };
        Insert: {
          id?: string;
          reporter_id: string;
          reported_id: string;
          type: "user" | "donation";
          reason: string;
          description?: string | null;
          status?: "pending" | "reviewed" | "resolved";
          created_at?: string;
        };
        Update: {
          id?: string;
          reporter_id?: string;
          reported_id?: string;
          type?: "user" | "donation";
          reason?: string;
          description?: string | null;
          status?: "pending" | "reviewed" | "resolved";
          created_at?: string;
        };
      };
      campaigns: {
        Row: {
          id: string;
          recipient_id: string;
          title: string;
          description: string;
          goal_amount: number | null;
          collected_amount: number | null;
          category: string;
          location: string;
          image_url: string | null;
          status: "pending" | "active" | "paused" | "completed" | "rejected";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          recipient_id: string;
          title: string;
          description: string;
          goal_amount?: number | null;
          collected_amount?: number | null;
          category: string;
          location: string;
          image_url?: string | null;
          status?: "pending" | "active" | "paused" | "completed" | "rejected";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          recipient_id?: string;
          title?: string;
          description?: string;
          goal_amount?: number | null;
          collected_amount?: number | null;
          category?: string;
          location?: string;
          image_url?: string | null;
          status?: "pending" | "active" | "paused" | "completed" | "rejected";
          created_at?: string;
          updated_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          campaign_id: string | null;
          donation_id: string | null;
          sender_id: string;
          receiver_id: string;
          content: string;
          read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          campaign_id?: string | null;
          donation_id?: string | null;
          sender_id: string;
          receiver_id: string;
          content: string;
          read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string | null;
          donation_id?: string | null;
          sender_id?: string;
          receiver_id?: string;
          content?: string;
          read?: boolean;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
