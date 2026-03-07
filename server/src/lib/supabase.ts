import { createClient } from '@supabase/supabase-js';
import { config } from '../config';

// Admin client with service role key (for backend operations)
export const supabaseAdmin = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Client with anon key (for public operations - used by frontend)
export const supabasePublic = createClient(
  config.supabase.url,
  config.supabase.anonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
    },
  }
);

// Type definitions for our database tables
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          name: string;
          email: string;
          role: 'admin' | 'manager' | 'branch_manager' | 'agent';
          branch_id: string | null;
          status: 'online' | 'busy' | 'offline';
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
      };
      branches: {
        Row: {
          id: string;
          name: string;
          location: string | null;
          whatsapp_number: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['branches']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['branches']['Insert']>;
      };
      customers: {
        Row: {
          id: string;
          phone: string;
          name: string | null;
          profile_data: Record<string, unknown> | null;
          created_at: string;
          last_contact_at: string | null;
          total_conversations: number;
        };
        Insert: Omit<Database['public']['Tables']['customers']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['customers']['Insert']>;
      };
      cases: {
        Row: {
          id: string;
          customer_id: string | null;
          customer_phone: string;
          branch_id: string | null;
          assigned_agent_id: string | null;
          status: 'new' | 'open' | 'assigned' | 'pending' | 'resolved' | 'closed';
          priority: 'low' | 'normal' | 'high' | 'urgent';
          first_message: string | null;
          last_message: string | null;
          created_at: string;
          updated_at: string;
          assigned_at: string | null;
          resolved_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['cases']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['cases']['Insert']>;
      };
      messages: {
        Row: {
          id: string;
          case_id: string;
          sender_type: 'customer' | 'agent' | 'system';
          sender_id: string | null;
          message_text: string;
          message_type: 'text' | 'image' | 'document' | 'system' | 'template';
          metadata: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['messages']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['messages']['Insert']>;
      };
      audit_logs: {
        Row: {
          id: string;
          case_id: string | null;
          action: string;
          performed_by: string | null;
          details: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['audit_logs']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['audit_logs']['Insert']>;
      };
    };
  };
}

export type User = Database['public']['Tables']['users']['Row'];
export type Branch = Database['public']['Tables']['branches']['Row'];
export type Customer = Database['public']['Tables']['customers']['Row'];
export type Case = Database['public']['Tables']['cases']['Row'];
export type Message = Database['public']['Tables']['messages']['Row'];
export type AuditLog = Database['public']['Tables']['audit_logs']['Row'];

// Extended types with relations
export interface CaseWithDetails extends Case {
  branch?: Branch | null;
  customer?: Customer | null;
  assigned_agent?: User | null;
  message_count?: number;
  last_message_at?: string;
}

export interface MessageWithSender extends Message {
  sender?: Pick<User, 'id' | 'name' | 'role'> | null;
}

export interface CaseWithMessages extends Case {
  messages: MessageWithSender[];
  customer?: Customer | null;
  branch?: Branch | null;
  assigned_agent?: Pick<User, 'id' | 'name' | 'email'> | null;
}
