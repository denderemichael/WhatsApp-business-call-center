import { supabaseAdmin, type Case, type Branch, type User, type Customer } from '../lib/supabase';

export interface CreateCaseInput {
  customer_phone: string;
  customer_name?: string;
  branch_id?: string;
  first_message?: string;
}

export interface UpdateCaseInput {
  status?: Case['status'];
  assigned_agent_id?: string | null;
  branch_id?: string;
  priority?: Case['priority'];
}

export interface CaseWithDetails extends Case {
  branch?: Branch | null;
  customer?: Customer | null;
  assigned_agent?: User | null;
  message_count?: number;
  last_message_at?: string;
}

export class CasesService {
  /**
   * Create a new case or return existing open case
   */
  async createCase(input: CreateCaseInput): Promise<{ success: boolean; case?: Case; isNew?: boolean; error?: string }> {
    try {
      // First, check if there's an existing open case for this phone number
      const { data: existingCase } = await supabaseAdmin
        .from('cases')
        .select('*')
        .eq('customer_phone', input.customer_phone)
        .in('status', ['new', 'open', 'assigned', 'pending'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (existingCase) {
        return { success: true, case: existingCase, isNew: false };
      }

      // Create a new case
      const { data, error } = await supabaseAdmin
        .from('cases')
        .insert({
          customer_phone: input.customer_phone,
          customer_name: input.customer_name || null,
          branch_id: input.branch_id || null,
          status: 'new',
          priority: 'normal',
          first_message: input.first_message || null,
          last_message: input.first_message || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating case:', error);
        return { success: false, error: error.message };
      }

      // Upsert customer record
      await this.upsertCustomer(input.customer_phone, input.customer_name);

      return { success: true, case: data, isNew: true };
    } catch (error) {
      console.error('Error in createCase:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  /**
   * Upsert customer record
   */
  async upsertCustomer(phone: string, name?: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('customers')
      .upsert({
        phone,
        name: name || null,
        last_contact_at: new Date().toISOString(),
      }, {
        onConflict: 'phone',
        ignoreDuplicates: false,
      });

    if (error) {
      console.error('Error upserting customer:', error);
    }
  }

  /**
   * Get case by ID with all details
   */
  async getCaseById(caseId: string): Promise<{ success: boolean; case?: CaseWithDetails; error?: string }> {
    try {
      const { data, error } = await supabaseAdmin
        .from('cases')
        .select(`
          *,
          branch:branches(*),
          customer:customers!customer_id(*),
          assigned_agent:users!assigned_agent_id(*)
        `)
        .eq('id', caseId)
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      // Get message count
      const { count } = await supabaseAdmin
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('case_id', caseId);

      // Get last message
      const { data: lastMsg } = await supabaseAdmin
        .from('messages')
        .select('created_at')
        .eq('case_id', caseId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      return {
        success: true,
        case: {
          ...data,
          message_count: count || 0,
          last_message_at: lastMsg?.created_at || null,
        } as CaseWithDetails,
      };
    } catch (error) {
      console.error('Error in getCaseById:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  /**
   * Get cases with filters
   */
  async getCases(filters?: {
    status?: Case['status'];
    branch_id?: string;
    assigned_agent_id?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ success: boolean; cases?: CaseWithDetails[]; total?: number; error?: string }> {
    try {
      let query = supabaseAdmin
        .from('cases')
        .select(`
          *,
          branch:branches(id, name),
          customer:customers(id, phone, name),
          assigned_agent:users!assigned_agent_id(id, name, email),
          messages(count),
          last_message:messages(created_at, message_text)
        `, { count: 'exact' });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.branch_id) {
        query = query.eq('branch_id', filters.branch_id);
      }
      if (filters?.assigned_agent_id) {
        query = query.eq('assigned_agent_id', filters.assigned_agent_id);
      }
      if (filters?.search) {
        query = query.or(`customer_phone.ilike.%${filters.search}%,customer_name.ilike.%${filters.search}%`);
      }

      query = query
        .order('created_at', { ascending: false })
        .range(
          filters?.offset || 0,
          (filters?.offset || 0) + (filters?.limit || 20) - 1
        );

      const { data, error, count } = await query;

      if (error) {
        return { success: false, error: error.message };
      }

      const casesWithDetails: CaseWithDetails[] = (data || []).map(c => ({
        ...c,
        message_count: (c.messages as Array<unknown>)?.length || 0,
        last_message_at: (c.last_message as Array<{ created_at: string }>)?.[0]?.created_at,
      }));

      return { success: true, cases: casesWithDetails, total: count || 0 };
    } catch (error) {
      console.error('Error in getCases:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  /**
   * Get unassigned cases (for manager dashboard)
   */
  async getUnassignedCases(branchId?: string): Promise<{ success: boolean; cases?: CaseWithDetails[]; error?: string }> {
    try {
      let query = supabaseAdmin
        .from('cases')
        .select(`
          *,
          branch:branches(id, name),
          customer:customers(id, phone, name),
          messages(count)
        `)
        .is('assigned_agent_id', null)
        .in('status', ['new', 'open']);

      if (branchId) {
        query = query.eq('branch_id', branchId);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, cases: data as CaseWithDetails[] };
    } catch (error) {
      console.error('Error in getUnassignedCases:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  /**
   * Update case
   */
  async updateCase(
    caseId: string,
    input: UpdateCaseInput
  ): Promise<{ success: boolean; case?: Case; error?: string }> {
    try {
      const { data, error } = await supabaseAdmin
        .from('cases')
        .update({
          ...input,
          updated_at: new Date().toISOString(),
        })
        .eq('id', caseId)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, case: data };
    } catch (error) {
      console.error('Error in updateCase:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  /**
   * Assign agent to case
   */
  async assignAgent(
    caseId: string,
    agentId: string,
    assignedBy: string
  ): Promise<{ success: boolean; case?: Case; error?: string }> {
    try {
      // Check if agent exists and is actually an agent
      const { data: agent } = await supabaseAdmin
        .from('users')
        .select('id, role, branch_id')
        .eq('id', agentId)
        .single();

      if (!agent || agent.role !== 'agent') {
        return { success: false, error: 'Invalid agent ID' };
      }

      // Update case with assignment
      const { data, error } = await supabaseAdmin
        .from('cases')
        .update({
          assigned_agent_id: agentId,
          branch_id: agent.branch_id,
          status: 'assigned',
          assigned_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', caseId)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, case: data };
    } catch (error) {
      console.error('Error in assignAgent:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  /**
   * Get case by phone (for webhook)
   */
  async getCaseByPhone(phone: string): Promise<{ success: boolean; case?: Case; error?: string }> {
    try {
      const { data, error } = await supabaseAdmin
        .from('cases')
        .select('*')
        .eq('customer_phone', phone)
        .in('status', ['new', 'open', 'assigned', 'pending'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return { success: true, case: undefined };
        }
        return { success: false, error: error.message };
      }

      return { success: true, case: data };
    } catch (error) {
      console.error('Error in getCaseByPhone:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  /**
   * Update last message in case
   */
  async updateLastMessage(caseId: string, messageText: string): Promise<void> {
    try {
      await supabaseAdmin
        .from('cases')
        .update({
          last_message: messageText,
          updated_at: new Date().toISOString(),
        })
        .eq('id', caseId);
    } catch (error) {
      console.error('Error updating last message:', error);
    }
  }
}

export const casesService = new CasesService();
