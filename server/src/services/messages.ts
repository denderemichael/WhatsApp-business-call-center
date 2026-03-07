import { supabaseAdmin, type Message } from '../lib/supabase';

export interface CreateMessageInput {
  case_id: string;
  sender_type: 'customer' | 'agent' | 'system';
  sender_id?: string;
  message_text: string;
  message_type?: 'text' | 'image' | 'document' | 'system';
  metadata?: Record<string, unknown>;
}

export interface MessageWithSender extends Message {
  sender?: { id: string; name: string; role: string } | null;
}

export class MessagesService {
  async createMessage(input: CreateMessageInput): Promise<{ success: boolean; message?: Message; error?: string }> {
    try {
      const { data, error } = await supabaseAdmin
        .from('messages')
        .insert({
          case_id: input.case_id,
          sender_type: input.sender_type,
          sender_id: input.sender_id || null,
          message_text: input.message_text,
          message_type: input.message_type || 'text',
          metadata: input.metadata || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating message:', error);
        return { success: false, error: error.message };
      }

      return { success: true, message: data };
    } catch (error) {
      console.error('Error in createMessage:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  async getMessages(
    caseId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<{ success: boolean; messages?: MessageWithSender[]; error?: string }> {
    try {
      const { data, error } = await supabaseAdmin
        .from('messages')
        .select(`
          *,
          sender:users!sender_id(id, name, role)
        `)
        .eq('case_id', caseId)
        .order('created_at', { ascending: true })
        .range(options?.offset || 0, (options?.offset || 0) + (options?.limit || 100) - 1);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, messages: data as MessageWithSender[] };
    } catch (error) {
      console.error('Error in getMessages:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  async markMessagesAsRead(caseId: string, readerId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // In a more complex system, you'd have a read_receipts table
      // For now, we'll just update the case status to show activity
      const { error } = await supabaseAdmin
        .from('cases')
        .update({
          updated_at: new Date().toISOString(),
        })
        .eq('id', caseId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in markMessagesAsRead:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  async getRecentMessages(
    limit: number = 50
  ): Promise<{ success: boolean; messages?: MessageWithSender[]; error?: string }> {
    try {
      const { data, error } = await supabaseAdmin
        .from('messages')
        .select(`
          *,
          sender:users!sender_id(id, name, role),
          case:cases(id, customer_phone, customer_name, status)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, messages: data as MessageWithSender[] };
    } catch (error) {
      console.error('Error in getRecentMessages:', error);
      return { success: false, error: 'Internal server error' };
    }
  }
}

export const messagesService = new MessagesService();
