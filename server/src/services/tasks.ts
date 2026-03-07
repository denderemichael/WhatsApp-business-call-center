import { supabaseAdmin } from '../lib/supabase';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  assigned_to_agent_id: string | null;
  assigned_by_manager_id: string | null;
  branch_id: string | null;
  case_id: string | null;
  deadline: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  
  // Relations (optional)
  assigned_to_agent?: { id: string; name: string; email: string };
  assigned_by_manager?: { id: string; name: string; email: string };
  branch?: { id: string; name: string };
}

interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  assigned_to_agent_id?: string;
  branch_id?: string;
  case_id?: string;
  deadline?: string;
}

interface UpdateTaskInput {
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  description?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  deadline?: string;
}

export class TasksService {
  /**
   * Create a new task (Manager creates for Agent)
   */
  async createTask(input: CreateTaskInput, managerId: string): Promise<{ success: boolean; task?: Task; error?: string }> {
    try {
      const { data, error } = await supabaseAdmin
        .from('tasks')
        .insert({
          title: input.title,
          description: input.description || null,
          priority: input.priority || 'normal',
          status: 'pending',
          assigned_to_agent_id: input.assigned_to_agent_id || null,
          assigned_by_manager_id: managerId,
          branch_id: input.branch_id || null,
          case_id: input.case_id || null,
          deadline: input.deadline || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating task:', error);
        return { success: false, error: error.message };
      }

      return { success: true, task: data };
    } catch (error) {
      console.error('Error in createTask:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  /**
   * Get tasks for an agent
   */
  async getTasksForAgent(agentId: string): Promise<{ success: boolean; tasks: Task[]; error?: string }> {
    try {
      const { data, error } = await supabaseAdmin
        .from('tasks')
        .select(`
          *,
          assigned_to_agent:users!tasks_assigned_to_agent_id_fkey(id, name, email),
          assigned_by_manager:users!tasks_assigned_by_manager_id_fkey(id, name, email),
          branch:branches(id, name)
        `)
        .eq('assigned_to_agent_id', agentId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching agent tasks:', error);
        return { success: false, error: error.message, tasks: [] };
      }

      return { success: true, tasks: data || [] };
    } catch (error) {
      console.error('Error in getTasksForAgent:', error);
      return { success: false, error: 'Internal server error', tasks: [] };
    }
  }

  /**
   * Get tasks for a manager (created by them or in their branch)
   */
  async getTasksForManager(managerId: string, branchId?: string): Promise<{ success: boolean; tasks: Task[]; error?: string }> {
    try {
      let query = supabaseAdmin
        .from('tasks')
        .select(`
          *,
          assigned_to_agent:users!tasks_assigned_to_agent_id_fkey(id, name, email),
          assigned_by_manager:users!tasks_assigned_by_manager_id_fkey(id, name, email),
          branch:branches(id, name)
        `)
        .eq('assigned_by_manager_id', managerId);

      if (branchId) {
        query = query.eq('branch_id', branchId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching manager tasks:', error);
        return { success: false, error: error.message, tasks: [] };
      }

      return { success: true, tasks: data || [] };
    } catch (error) {
      console.error('Error in getTasksForManager:', error);
      return { success: false, error: 'Internal server error', tasks: [] };
    }
  }

  /**
   * Update task status
   */
  async updateTask(taskId: string, input: UpdateTaskInput): Promise<{ success: boolean; task?: Task; error?: string }> {
    try {
      const updateData: any = { ...input, updated_at: new Date().toISOString() };
      
      if (input.status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      const { data, error } = await supabaseAdmin
        .from('tasks')
        .update(updateData)
        .eq('id', taskId)
        .select()
        .single();

      if (error) {
        console.error('Error updating task:', error);
        return { success: false, error: error.message };
      }

      return { success: true, task: data };
    } catch (error) {
      console.error('Error in updateTask:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  /**
   * Get task by ID
   */
  async getTaskById(taskId: string): Promise<{ success: boolean; task?: Task; error?: string }> {
    try {
      const { data, error } = await supabaseAdmin
        .from('tasks')
        .select(`
          *,
          assigned_to_agent:users!tasks_assigned_to_agent_id_fkey(id, name, email),
          assigned_by_manager:users!tasks_assigned_by_manager_id_fkey(id, name, email),
          branch:branches(id, name)
        `)
        .eq('id', taskId)
        .single();

      if (error) {
        console.error('Error fetching task:', error);
        return { success: false, error: error.message };
      }

      return { success: true, task: data };
    } catch (error) {
      console.error('Error in getTaskById:', error);
      return { success: false, error: 'Internal server error' };
    }
  }
}

export const tasksService = new TasksService();
