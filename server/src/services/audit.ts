import { supabaseAdmin, type AuditLog } from '../lib/supabase';

export type AuditAction =
  | 'case_created'
  | 'case_assigned'
  | 'case_status_changed'
  | 'case_transferred'
  | 'message_sent'
  | 'message_received'
  | 'agent_assigned'
  | 'branch_assigned'
  | 'user_created'
  | 'user_updated'
  | 'user_deleted'
  | 'login'
  | 'logout';

export interface CreateAuditLogInput {
  case_id?: string;
  action: AuditAction;
  performed_by: string;
  details?: Record<string, unknown>;
}

export interface AuditLogWithUser extends AuditLog {
  performer?: { id: string; name: string; email: string; role: string } | null;
  case?: { id: string; customer_phone: string; status: string } | null;
}

export class AuditService {
  async createLog(input: CreateAuditLogInput): Promise<{ success: boolean; log?: AuditLog; error?: string }> {
    try {
      const { data, error } = await supabaseAdmin
        .from('audit_logs')
        .insert({
          case_id: input.case_id || null,
          action: input.action,
          performed_by: input.performed_by,
          details: input.details || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating audit log:', error);
        return { success: false, error: error.message };
      }

      return { success: true, log: data };
    } catch (error) {
      console.error('Error in createLog:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  async getLogs(
    filters?: {
      case_id?: string;
      performed_by?: string;
      action?: AuditAction;
      start_date?: string;
      end_date?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ success: boolean; logs?: AuditLogWithUser[]; total?: number; error?: string }> {
    try {
      let query = supabaseAdmin
        .from('audit_logs')
        .select(`
          *,
          performer:users!performed_by(id, name, email, role),
          case:cases!case_id(id, customer_phone, status)
        `, { count: 'exact' });

      if (filters?.case_id) {
        query = query.eq('case_id', filters.case_id);
      }
      if (filters?.performed_by) {
        query = query.eq('performed_by', filters.performed_by);
      }
      if (filters?.action) {
        query = query.eq('action', filters.action);
      }
      if (filters?.start_date) {
        query = query.gte('created_at', filters.start_date);
      }
      if (filters?.end_date) {
        query = query.lte('created_at', filters.end_date);
      }

      query = query
        .order('created_at', { ascending: false })
        .range(filters?.offset || 0, (filters?.offset || 0) + (filters?.limit || 50) - 1);

      const { data, error, count } = await query;

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, logs: data as AuditLogWithUser[], total: count || 0 };
    } catch (error) {
      console.error('Error in getLogs:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  async getCaseLogs(caseId: string): Promise<{ success: boolean; logs?: AuditLogWithUser[]; error?: string }> {
    return this.getLogs({ case_id: caseId, limit: 100 });
  }

  async getUserLogs(userId: string, limit: number = 50): Promise<{ success: boolean; logs?: AuditLogWithUser[]; error?: string }> {
    return this.getLogs({ performed_by: userId, limit });
  }

  async getActionLogs(action: AuditAction, limit: number = 50): Promise<{ success: boolean; logs?: AuditLogWithUser[]; error?: string }> {
    return this.getLogs({ action, limit });
  }
}

// Helper functions for common audit actions
export const auditHelpers = {
  logCaseCreated: (caseId: string, userId: string, details?: Record<string, unknown>) =>
    auditService.createLog({
      case_id: caseId,
      action: 'case_created',
      performed_by: userId,
      details,
    }),

  logCaseAssigned: (caseId: string, userId: string, agentId: string, details?: Record<string, unknown>) =>
    auditService.createLog({
      case_id: caseId,
      action: 'case_assigned',
      performed_by: userId,
      details: { agent_id: agentId, ...details },
    }),

  logCaseStatusChanged: (caseId: string, userId: string, oldStatus: string, newStatus: string) =>
    auditService.createLog({
      case_id: caseId,
      action: 'case_status_changed',
      performed_by: userId,
      details: { old_status: oldStatus, new_status: newStatus },
    }),

  logMessageSent: (caseId: string, userId: string, messageId: string) =>
    auditService.createLog({
      case_id: caseId,
      action: 'message_sent',
      performed_by: userId,
      details: { message_id: messageId },
    }),

  logMessageReceived: (caseId: string, details?: Record<string, unknown>) =>
    auditService.createLog({
      case_id: caseId,
      action: 'message_received',
      performed_by: 'system',
      details,
    }),
};

export const auditService = new AuditService();
