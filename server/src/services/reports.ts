import { supabaseAdmin } from '../lib/supabase';

export interface Report {
  id: string;
  title: string;
  description: string | null;
  urgency: 'low' | 'normal' | 'high' | 'critical';
  status: 'draft' | 'submitted' | 'under_review' | 'resolved' | 'rejected';
  case_id: string | null;
  branch_id: string | null;
  reported_by_manager_id: string | null;
  reported_by_agent_id: string | null;
  assigned_to_admin_id: string | null;
  admin_response: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  
  // Relations
  reported_by_manager?: { id: string; name: string; email: string };
  reported_by_agent?: { id: string; name: string; email: string };
  branch?: { id: string; name: string };
}

interface CreateReportInput {
  title: string;
  description?: string;
  urgency?: 'low' | 'normal' | 'high' | 'critical';
  case_id?: string;
  branch_id?: string;
}

interface UpdateReportInput {
  status?: 'draft' | 'submitted' | 'under_review' | 'resolved' | 'rejected';
  admin_response?: string;
}

export class ReportsService {
  /**
   * Create a new report (Manager escalates to Admin)
   */
  async createReport(input: CreateReportInput, managerId: string): Promise<{ success: boolean; report?: Report; error?: string }> {
    try {
      // Find an admin user to assign this report to
      const { data: admins } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('role', 'admin')
        .limit(1);

      const adminId = admins && admins.length > 0 ? admins[0].id : null;

      const { data, error } = await supabaseAdmin
        .from('reports')
        .insert({
          title: input.title,
          description: input.description || null,
          urgency: input.urgency || 'normal',
          status: 'submitted',
          case_id: input.case_id || null,
          branch_id: input.branch_id || null,
          reported_by_manager_id: managerId,
          assigned_to_admin_id: adminId,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating report:', error);
        return { success: false, error: error.message };
      }

      return { success: true, report: data };
    } catch (error) {
      console.error('Error in createReport:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  /**
   * Get reports submitted by a manager
   */
  async getReportsForManager(managerId: string): Promise<{ success: boolean; reports: Report[]; error?: string }> {
    try {
      const { data, error } = await supabaseAdmin
        .from('reports')
        .select(`
          *,
          reported_by_manager:users!reports_reported_by_manager_id_fkey(id, name, email),
          branch:branches(id, name)
        `)
        .eq('reported_by_manager_id', managerId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching manager reports:', error);
        return { success: false, error: error.message, reports: [] };
      }

      return { success: true, reports: data || [] };
    } catch (error) {
      console.error('Error in getReportsForManager:', error);
      return { success: false, error: 'Internal server error', reports: [] };
    }
  }

  /**
   * Get reports submitted by an agent
   */
  async getReportsForAgent(agentId: string): Promise<{ success: boolean; reports: Report[]; error?: string }> {
    try {
      const { data, error } = await supabaseAdmin
        .from('reports')
        .select(`
          *,
          reported_by_agent:users!reports_reported_by_agent_id_fkey(id, name, email),
          branch:branches(id, name)
        `)
        .eq('reported_by_agent_id', agentId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching agent reports:', error);
        return { success: false, error: error.message, reports: [] };
      }

      return { success: true, reports: data || [] };
    } catch (error) {
      console.error('Error in getReportsForAgent:', error);
      return { success: false, error: 'Internal server error', reports: [] };
    }
  }

  /**
   * Get reports for a specific branch (for branch managers)
   */
  async getReportsForBranch(branchId: string): Promise<{ success: boolean; reports: Report[]; error?: string }> {
    try {
      const { data, error } = await supabaseAdmin
        .from('reports')
        .select(`
          *,
          reported_by_manager:users!reports_reported_by_manager_id_fkey(id, name, email),
          branch:branches(id, name)
        `)
        .eq('branch_id', branchId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching branch reports:', error);
        return { success: false, error: error.message, reports: [] };
      }

      return { success: true, reports: data || [] };
    } catch (error) {
      console.error('Error in getReportsForBranch:', error);
      return { success: false, error: 'Internal server error', reports: [] };
    }
  }

  /**
   * Get reports for admin
   */
  async getReportsForAdmin(): Promise<{ success: boolean; reports: Report[]; error?: string }> {
    try {
      const { data, error } = await supabaseAdmin
        .from('reports')
        .select(`
          *,
          reported_by_manager:users!reports_reported_by_manager_id_fkey(id, name, email),
          branch:branches(id, name)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching admin reports:', error);
        return { success: false, error: error.message, reports: [] };
      }

      return { success: true, reports: data || [] };
    } catch (error) {
      console.error('Error in getReportsForAdmin:', error);
      return { success: false, error: 'Internal server error', reports: [] };
    }
  }

  /**
   * Update report status
   */
  async updateReport(reportId: string, input: UpdateReportInput): Promise<{ success: boolean; report?: Report; error?: string }> {
    try {
      const updateData: any = { ...input, updated_at: new Date().toISOString() };
      
      if (input.status === 'resolved') {
        updateData.resolved_at = new Date().toISOString();
      }

      const { data, error } = await supabaseAdmin
        .from('reports')
        .update(updateData)
        .eq('id', reportId)
        .select()
        .single();

      if (error) {
        console.error('Error updating report:', error);
        return { success: false, error: error.message };
      }

      return { success: true, report: data };
    } catch (error) {
      console.error('Error in updateReport:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  /**
   * Get report by ID
   */
  async getReportById(reportId: string): Promise<{ success: boolean; report?: Report; error?: string }> {
    try {
      const { data, error } = await supabaseAdmin
        .from('reports')
        .select(`
          *,
          reported_by_manager:users!reports_reported_by_manager_id_fkey(id, name, email),
          branch:branches(id, name)
        `)
        .eq('id', reportId)
        .single();

      if (error) {
        console.error('Error fetching report:', error);
        return { success: false, error: error.message };
      }

      return { success: true, report: data };
    } catch (error) {
      console.error('Error in getReportById:', error);
      return { success: false, error: 'Internal server error' };
    }
  }
}

export const reportsService = new ReportsService();
